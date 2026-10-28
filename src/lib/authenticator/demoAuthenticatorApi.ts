import { StepUpError, type AuthenticatorApi, type TotpEnrollment, type TotpStatus } from "./api";

/**
 * In-memory stand-in for the authenticator backend, used ONLY by the offline demo (no Fineract
 * connected). It follows the same rules as the real service (a code of the app is needed to finish
 * pairing, recovery codes work once, wrong codes lock it) so the screen behaves like the real one,
 * but it is NOT a security control: the "app" code is public and shown on screen.
 */

export type DemoAuthenticatorEvent =
  "ENROLLED" | "REMOVED" | "RECOVERY_CODES_REGENERATED" | "RECOVERY_CODE_USED";

export type DemoAuthenticatorOptions = {
  /** The (public) demo code of the "app". */
  code?: string;
  recoveryCodeCount?: number;
  maxFailures?: number;
  lockoutSeconds?: number;
  /** Test seam: milliseconds clock. */
  now?: () => number;
  /** Test seam: random bytes. */
  random?: (length: number) => Uint8Array;
  onEvent?: (event: DemoAuthenticatorEvent) => void;
};

export type DemoAuthenticatorStore = {
  api: AuthenticatorApi;
  /** The demo code of the "app". */
  readonly appCode: string;
  /** `true` while the demo user has an active authenticator. */
  isActive(): boolean;
  /** Seconds the authenticator stays locked, or 0. */
  lockedSeconds(): number;
  /** Checks a code of the "app" for a step-up. A wrong one counts towards the lock-out. */
  checkAppCode(code: string): "ok" | "wrong" | "locked";
  /** Uses up a recovery code. Returns `false` when it is unknown, was used, or the app is locked. */
  useRecoveryCode(code: string): boolean;
};

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function pick(alphabet: string, bytes: Uint8Array, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function defaultRandom(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

/** `abcde-fghjk`, `ABCDEFGHJK` and ` abcde fghjk ` are the same recovery code. */
export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function createDemoAuthenticatorStore(
  options: DemoAuthenticatorOptions = {},
): DemoAuthenticatorStore {
  const appCode = options.code ?? "135790";
  const codeCount = options.recoveryCodeCount ?? 10;
  const maxFailures = options.maxFailures ?? 5;
  const lockout = options.lockoutSeconds ?? 900;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? defaultRandom;

  let state: "NONE" | "PENDING" | "ACTIVE" = "NONE";
  let confirmedAt: string | null = null;
  let failures = 0;
  let lockedUntil = 0;
  let recovery: { code: string; used: boolean }[] = [];

  function locked(): number {
    return lockedUntil > now() ? Math.max(1, Math.ceil((lockedUntil - now()) / 1000)) : 0;
  }

  function countFailure(): "wrong" | "locked" {
    failures += 1;
    if (failures >= maxFailures) {
      lockedUntil = now() + lockout * 1000;
      failures = 0;
      return "locked";
    }
    return "wrong";
  }

  function newCodes(): string[] {
    const fresh = new Set<string>();
    while (fresh.size < codeCount) fresh.add(pick(RECOVERY, random(10), 10));
    recovery = [...fresh].map((code) => ({ code, used: false }));
    return recovery.map(({ code }) => `${code.slice(0, 5)}-${code.slice(5)}`);
  }

  const api: AuthenticatorApi = {
    mode: "demo",
    demoHint: appCode,

    async getStatus(): Promise<TotpStatus> {
      return {
        available: true,
        status: state,
        recoveryCodesRemaining:
          state === "ACTIVE" ? recovery.filter((entry) => !entry.used).length : 0,
        exclusive: true,
        confirmedAt,
      };
    },

    async begin(): Promise<TotpEnrollment> {
      if (state === "ACTIVE") throw new StepUpError("totp.already.enrolled");
      state = "PENDING";
      failures = 0;
      const secret = pick(BASE32, random(32), 32);
      return {
        secret,
        otpauthUri: `otpauth://totp/Demo:demo?secret=${secret}&issuer=Demo&algorithm=SHA1&digits=6&period=30`,
        issuer: "Demo",
        digits: 6,
        periodSeconds: 30,
      };
    },

    async confirm(code) {
      if (state === "ACTIVE") throw new StepUpError("totp.already.enrolled");
      if (state !== "PENDING") throw new StepUpError("totp.enrollment.missing");
      const wait = locked();
      if (wait) throw new StepUpError("locked", { retryAfterSeconds: wait });
      if (code !== appCode) {
        if (countFailure() === "locked") {
          throw new StepUpError("locked", { retryAfterSeconds: lockout });
        }
        throw new StepUpError("otp.invalid", { attemptsRemaining: maxFailures - failures });
      }
      state = "ACTIVE";
      failures = 0;
      confirmedAt = new Date(now()).toISOString().slice(0, 19);
      const recoveryCodes = newCodes();
      options.onEvent?.("ENROLLED");
      return { recoveryCodes };
    },

    async newRecoveryCodes() {
      if (state !== "ACTIVE") throw new StepUpError("totp.not.enrolled");
      const recoveryCodes = newCodes();
      options.onEvent?.("RECOVERY_CODES_REGENERATED");
      return { recoveryCodes };
    },

    async remove() {
      if (state === "NONE") throw new StepUpError("totp.not.enrolled");
      const wasActive = state === "ACTIVE";
      state = "NONE";
      confirmedAt = null;
      recovery = [];
      failures = 0;
      lockedUntil = 0;
      if (wasActive) options.onEvent?.("REMOVED");
    },
  };

  return {
    api,
    appCode,
    isActive: () => state === "ACTIVE",
    lockedSeconds: locked,
    checkAppCode(code) {
      if (locked()) return "locked";
      if (code === appCode) {
        failures = 0;
        return "ok";
      }
      return countFailure();
    },
    useRecoveryCode(code) {
      if (locked()) return false;
      const wanted = normalizeRecoveryCode(code);
      const entry = recovery.find((candidate) => candidate.code === wanted && !candidate.used);
      if (!entry) {
        countFailure();
        return false;
      }
      entry.used = true;
      failures = 0;
      options.onEvent?.("RECOVERY_CODE_USED");
      return true;
    },
  };
}

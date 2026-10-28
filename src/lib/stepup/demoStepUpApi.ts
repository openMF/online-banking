import type { DemoAuthenticatorStore } from "../authenticator/demoAuthenticatorApi";
import {
  StepUpError,
  type CreateChallengeInput,
  type StepUpApi,
  type StepUpChallenge,
  type StepUpConfig,
  type StepUpGrant,
} from "./api";

/**
 * In-memory stand-in for the step-up backend, used ONLY by the offline demo (no Fineract
 * connected). It follows the same rules as the real service (limited attempts, lock-out, resend
 * cooldown and maximum, expiry, one-time token) so the interface behaves like the real one, but
 * it is NOT a security control: the code is public and shown on screen. Real operations must
 * never rely on it.
 */

export type DemoStepUpOptions = {
  /** The (public) demo code. */
  code?: string;
  otpTtlSeconds?: number;
  maxAttempts?: number;
  resendCooldownSeconds?: number;
  maxResends?: number;
  lockoutSeconds?: number;
  /** Test seam: milliseconds clock. */
  now?: () => number;
  /**
   * The demo authenticator app. While it is active the verification asks for its code (or a
   * recovery code) instead of the e-mail code, like the real service does by default.
   */
  authenticator?: DemoAuthenticatorStore;
  /** Called when a code is requested, verified or the challenge gets locked. */
  onEvent?: (event: "ISSUED" | "VERIFIED" | "LOCKED", action: CreateChallengeInput["action"]) => void;
};

type DemoChallenge = {
  action: CreateChallengeInput["action"];
  channel: CreateChallengeInput["channel"];
  attempts: number;
  resends: number;
  lastSentAt: number;
  expiresAt: number;
  lockedUntil: number | null;
  done: boolean;
};

const DEMO_DESTINATION = "m***@ejemplo.mx";

function isoLocal(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19);
}

export function createDemoStepUpApi(options: DemoStepUpOptions = {}): StepUpApi {
  const code = options.code ?? "123456";
  const ttl = options.otpTtlSeconds ?? 300;
  const maxAttempts = options.maxAttempts ?? 5;
  const cooldown = options.resendCooldownSeconds ?? 30;
  const maxResends = options.maxResends ?? 3;
  const lockout = options.lockoutSeconds ?? 900;
  const now = options.now ?? (() => Date.now());

  const config: StepUpConfig = {
    enabled: true,
    protectedActions: [
      "TPT_TRANSFER",
      "OWN_TRANSFER",
      "CONFIRM_TRANSFER",
      "CHANGE_PASSWORD",
      "MANAGE_AUTHENTICATOR",
    ],
    availableChannels: ["EMAIL"],
    otpLength: code.length,
    otpTtlSeconds: ttl,
    maxAttempts,
    resendCooldownSeconds: cooldown,
    maxResends,
    grantTtlSeconds: 120,
    sessionBound: true,
  };

  /** With an active authenticator only the app is offered (SIM-swap protection), like the server. */
  function currentConfig(): StepUpConfig {
    const app = options.authenticator?.isActive() ?? false;
    return { ...config, availableChannels: app ? ["TOTP"] : ["EMAIL"] };
  }

  const challenges = new Map<number, DemoChallenge>();
  let sequence = 0;

  function view(id: number, challenge: DemoChallenge): StepUpChallenge {
    return {
      challengeId: id,
      action: challenge.action,
      channel: challenge.channel,
      maskedDestination: challenge.channel === "TOTP" ? null : DEMO_DESTINATION,
      expiresAt: isoLocal(challenge.expiresAt),
      attemptsRemaining: Math.max(0, maxAttempts - challenge.attempts),
      resendAvailableAt: isoLocal(challenge.lastSentAt + cooldown * 1000),
      resendsRemaining:
        challenge.channel === "TOTP" ? 0 : Math.max(0, maxResends - challenge.resends),
    };
  }

  function open(id: number): DemoChallenge {
    const challenge = challenges.get(id);
    if (!challenge || challenge.done) throw new StepUpError("invalid");
    return challenge;
  }

  function secondsUntil(target: number): number {
    return Math.max(1, Math.ceil((target - now()) / 1000));
  }

  return {
    mode: "demo",
    demoHint: code,
    demoAppHint: options.authenticator?.appCode,

    async getConfig() {
      return currentConfig();
    },

    async createChallenge(input) {
      if (!currentConfig().availableChannels.includes(input.channel)) {
        throw new StepUpError("channel.unavailable");
      }
      const appLock = input.channel === "TOTP" ? (options.authenticator?.lockedSeconds() ?? 0) : 0;
      if (appLock > 0) throw new StepUpError("locked", { retryAfterSeconds: appLock });
      for (const challenge of challenges.values()) {
        if (challenge.lockedUntil && challenge.lockedUntil > now()) {
          throw new StepUpError("locked", {
            retryAfterSeconds: secondsUntil(challenge.lockedUntil),
          });
        }
      }
      const time = now();
      sequence += 1;
      const challenge: DemoChallenge = {
        action: input.action,
        channel: input.channel,
        attempts: 0,
        resends: 0,
        lastSentAt: time,
        expiresAt: time + ttl * 1000,
        lockedUntil: null,
        done: false,
      };
      challenges.set(sequence, challenge);
      options.onEvent?.("ISSUED", input.action);
      return view(sequence, challenge);
    },

    async verify(challengeId, otp, kind = "otp"): Promise<StepUpGrant> {
      const challenge = open(challengeId);
      if (challenge.lockedUntil && challenge.lockedUntil > now()) {
        throw new StepUpError("locked", { retryAfterSeconds: secondsUntil(challenge.lockedUntil) });
      }
      if (now() >= challenge.expiresAt) {
        challenge.done = true;
        throw new StepUpError("otp.expired");
      }
      let correct: boolean;
      if (challenge.channel === "TOTP" && options.authenticator) {
        const app = options.authenticator;
        if (app.lockedSeconds() > 0) {
          throw new StepUpError("locked", { retryAfterSeconds: app.lockedSeconds() });
        }
        correct = kind === "recovery" ? app.useRecoveryCode(otp) : app.checkAppCode(otp) === "ok";
        if (!correct && app.lockedSeconds() > 0) {
          throw new StepUpError("locked", { retryAfterSeconds: app.lockedSeconds() });
        }
      } else {
        // a recovery code is only for the app, like on the server
        correct = kind === "otp" && otp === code;
      }
      if (!correct) {
        challenge.attempts += 1;
        if (challenge.attempts >= maxAttempts) {
          challenge.lockedUntil = now() + lockout * 1000;
          options.onEvent?.("LOCKED", challenge.action);
          throw new StepUpError("locked", { retryAfterSeconds: lockout });
        }
        throw new StepUpError("otp.invalid", {
          attemptsRemaining: maxAttempts - challenge.attempts,
        });
      }
      challenge.done = true;
      const token = `demo-${globalThis.crypto.randomUUID()}`;
      options.onEvent?.("VERIFIED", challenge.action);
      return {
        stepUpToken: token,
        action: challenge.action,
        expiresAt: isoLocal(now() + config.grantTtlSeconds * 1000),
      };
    },

    async resend(challengeId) {
      const challenge = open(challengeId);
      if (challenge.channel === "TOTP") throw new StepUpError("resend.unsupported");
      if (now() >= challenge.expiresAt) {
        challenge.done = true;
        throw new StepUpError("otp.expired");
      }
      const available = challenge.lastSentAt + cooldown * 1000;
      if (now() < available) {
        throw new StepUpError("resend.cooldown", { retryAfterSeconds: secondsUntil(available) });
      }
      if (challenge.resends >= maxResends) throw new StepUpError("resend.limit");
      challenge.resends += 1;
      challenge.lastSentAt = now();
      challenge.expiresAt = now() + ttl * 1000;
      return view(challengeId, challenge);
    },
  };
}

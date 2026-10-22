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
    protectedActions: ["TPT_TRANSFER", "OWN_TRANSFER", "CONFIRM_TRANSFER", "CHANGE_PASSWORD"],
    availableChannels: ["EMAIL"],
    otpLength: code.length,
    otpTtlSeconds: ttl,
    maxAttempts,
    resendCooldownSeconds: cooldown,
    maxResends,
    grantTtlSeconds: 120,
    sessionBound: true,
  };

  const challenges = new Map<number, DemoChallenge>();
  let sequence = 0;

  function view(id: number, challenge: DemoChallenge): StepUpChallenge {
    return {
      challengeId: id,
      action: challenge.action,
      channel: challenge.channel,
      maskedDestination: DEMO_DESTINATION,
      expiresAt: isoLocal(challenge.expiresAt),
      attemptsRemaining: Math.max(0, maxAttempts - challenge.attempts),
      resendAvailableAt: isoLocal(challenge.lastSentAt + cooldown * 1000),
      resendsRemaining: Math.max(0, maxResends - challenge.resends),
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

    async getConfig() {
      return config;
    },

    async createChallenge(input) {
      if (!config.availableChannels.includes(input.channel)) {
        throw new StepUpError("channel.unavailable");
      }
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
      return view(sequence, challenge);
    },

    async verify(challengeId, otp): Promise<StepUpGrant> {
      const challenge = open(challengeId);
      if (challenge.lockedUntil && challenge.lockedUntil > now()) {
        throw new StepUpError("locked", { retryAfterSeconds: secondsUntil(challenge.lockedUntil) });
      }
      if (now() >= challenge.expiresAt) {
        challenge.done = true;
        throw new StepUpError("otp.expired");
      }
      if (otp !== code) {
        challenge.attempts += 1;
        if (challenge.attempts >= maxAttempts) {
          challenge.lockedUntil = now() + lockout * 1000;
          throw new StepUpError("locked", { retryAfterSeconds: lockout });
        }
        throw new StepUpError("otp.invalid", {
          attemptsRemaining: maxAttempts - challenge.attempts,
        });
      }
      challenge.done = true;
      const token = `demo-${globalThis.crypto.randomUUID()}`;
      return {
        stepUpToken: token,
        action: challenge.action,
        expiresAt: isoLocal(now() + config.grantTtlSeconds * 1000),
      };
    },

    async resend(challengeId) {
      const challenge = open(challengeId);
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

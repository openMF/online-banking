import { SelfServiceError, type RequestOptions } from "../selfservice/http";
import { changePassword } from "../selfservice/user";

/**
 * Why a password change failed. The screen shows a fixed, translated message per code, never the
 * text of the server.
 */
export type PasswordErrorCode =
  /** The two passwords differ. */
  | "mismatch"
  /** The server refused the new password (its policy). Nothing was spent. */
  | "policy"
  /** The verification is missing, used up or expired: ask for it again. */
  | "stepup"
  /** The session ended or cannot be used for this step. */
  | "session"
  | "network"
  | "offline"
  | "timeout"
  | "unavailable"
  | "unknown";

export class PasswordError extends Error {
  readonly code: PasswordErrorCode;

  constructor(code: PasswordErrorCode) {
    // Never the password, the token or the server's text.
    super(`password: ${code}`);
    this.name = "PasswordError";
    this.code = code;
  }
}

const MISMATCH = /do\.not\.match$/;

/** Maps anything thrown by the API layer to a {@link PasswordError}. */
export function toPasswordError(error: unknown): PasswordError {
  if (error instanceof PasswordError) return error;
  if (error instanceof SelfServiceError) {
    if (error.code === "error.network" || error.status === 0) {
      const problem = error.problem;
      return new PasswordError(
        problem === "offline" || problem === "timeout" ? problem : "network",
      );
    }
    if (error.problem === "unavailable") return new PasswordError("unavailable");
    const stepUp = error.stepUpCode;
    if (stepUp === "required" || stepUp === "invalid") return new PasswordError("stepup");
    if (stepUp === "session.required" || error.status === 401) return new PasswordError("session");
    if (error.status === 400 || error.status === 422) {
      const codes = Array.isArray(error.details.errorCodes) ? error.details.errorCodes : [];
      return new PasswordError(
        codes.some((code) => typeof code === "string" && MISMATCH.test(code))
          ? "mismatch"
          : "policy",
      );
    }
  }
  return new PasswordError("unknown");
}

/** What the screen needs to change the password. One implementation: the real self-service API. */
export interface PasswordApi {
  /** `stepUpToken` is the grant of a verification for `CHANGE_PASSWORD`, when one was required. */
  change(password: string, repeatPassword: string, stepUpToken?: string): Promise<void>;
}

type Seams = Pick<RequestOptions, "fetchImpl" | "config" | "session" | "customer">;

export function createHttpPasswordApi(seams: Seams = {}): PasswordApi {
  return {
    async change(password, repeatPassword, stepUpToken) {
      try {
        await changePassword(password, repeatPassword, { ...seams, stepUpToken });
      } catch (error) {
        throw toPasswordError(error);
      }
    },
  };
}

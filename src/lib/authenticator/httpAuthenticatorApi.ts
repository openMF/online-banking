import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  getTotpStatus,
  regenerateRecoveryCodes,
  removeTotp,
} from "../selfservice/totp";
import type { RequestOptions } from "../selfservice/http";
import { toStepUpError, type AuthenticatorApi } from "./api";

type Seams = Pick<RequestOptions, "fetchImpl" | "config" | "session">;

async function guarded<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    throw toStepUpError(error);
  }
}

/** The authenticator over the real self-service API (`/v1/self/stepup/totp`). Needs a session. */
export function createHttpAuthenticatorApi(seams: Seams = {}): AuthenticatorApi {
  return {
    mode: "backend",
    getStatus: () => guarded(getTotpStatus(seams)),
    begin: () => guarded(beginTotpEnrollment(seams)),
    confirm: (code, stepUpToken) => guarded(confirmTotpEnrollment(code, { ...seams, stepUpToken })),
    newRecoveryCodes: (stepUpToken) => guarded(regenerateRecoveryCodes({ ...seams, stepUpToken })),
    remove: async (stepUpToken) => {
      await guarded(removeTotp({ ...seams, stepUpToken }));
    },
  };
}

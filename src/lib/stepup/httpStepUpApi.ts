import {
  createStepUpChallenge,
  getStepUpConfig,
  resendStepUpChallenge,
  verifyStepUpChallenge,
} from "../selfservice/stepup";
import type { RequestOptions } from "../selfservice/http";
import { toStepUpError, type StepUpApi } from "./api";

type Seams = Pick<RequestOptions, "fetchImpl" | "config" | "session">;

async function guarded<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    throw toStepUpError(error);
  }
}

/** Step-up over the real self-service API (`/v1/self/stepup`). Needs a logged-in session. */
export function createHttpStepUpApi(seams: Seams = {}): StepUpApi {
  return {
    mode: "backend",
    getConfig: () => guarded(getStepUpConfig(seams)),
    createChallenge: (input) => guarded(createStepUpChallenge(input, seams)),
    verify: (challengeId, otp) => guarded(verifyStepUpChallenge(challengeId, otp, seams)),
    resend: (challengeId) => guarded(resendStepUpChallenge(challengeId, seams)),
  };
}

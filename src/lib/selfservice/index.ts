export { getSelfServiceConfig, selfUrl, type SelfServiceConfig } from "./config";
export { login, logout } from "./auth";
export { SelfServiceError, STEP_UP_HEADER, selfRequest, type RequestOptions } from "./http";
export {
  authorizationHeader,
  clearSession,
  getSession,
  hasSession,
  setSession,
  type Session,
} from "./session";
export {
  createStepUpChallenge,
  getStepUpConfig,
  resendStepUpChallenge,
  verifyStepUpChallenge,
  type CreateChallengeInput,
  type StepUpAction,
  type StepUpChallenge,
  type StepUpChannel,
  type StepUpConfig,
  type StepUpGrant,
} from "./stepup";

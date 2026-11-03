import {
  AuthenticationError,
  type CustomerSession,
} from "../authentication/client";

export interface SurveyResponse {
  id: number;
  text: string;
  value: number;
  sequenceNo: number;
}

export interface SurveyQuestion {
  id: number;
  componentKey: string;
  key: string;
  text: string;
  description?: string;
  sequenceNo: number;
  responseDatas: SurveyResponse[];
}

export interface Survey {
  id: number;
  key: string;
  name: string;
  description?: string;
  countryCode?: string;
  validFrom?: string;
  validTo?: string;
  questionDatas: SurveyQuestion[];
}

export interface SurveyAnswer {
  questionId: number;
  responseId: number;
  value: number;
}

export type SurveyErrorCode =
  | "expired"
  | "denied"
  | "unavailable"
  | "malformed"
  | "invalid"
  | "uncertain";

export class SurveyError extends Error {
  constructor(public readonly code: SurveyErrorCode) {
    super(code);
    this.name = "SurveyError";
  }
}

export interface SurveyClient {
  list(signal?: AbortSignal): Promise<Survey[]>;
  submit(
    clientId: number,
    survey: Survey,
    answers: SurveyAnswer[],
    signal?: AbortSignal,
  ): Promise<void>;
  isBlocked(surveyId: number): boolean;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const positiveId = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value > 0;

const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function parseResponse(value: unknown): SurveyResponse {
  if (
    !object(value) ||
    !positiveId(value.id) ||
    !nonempty(value.text) ||
    typeof value.value !== "number" ||
    !Number.isFinite(value.value) ||
    !Number.isInteger(value.sequenceNo)
  ) {
    throw new SurveyError("malformed");
  }

  return {
    id: value.id,
    text: value.text,
    value: value.value,
    sequenceNo: value.sequenceNo as number,
  };
}

function parseQuestion(value: unknown): SurveyQuestion {
  if (
    !object(value) ||
    !positiveId(value.id) ||
    !nonempty(value.key) ||
    !nonempty(value.text) ||
    !Number.isInteger(value.sequenceNo) ||
    !Array.isArray(value.responseDatas)
  ) {
    throw new SurveyError("malformed");
  }

  const responses = value.responseDatas.map(parseResponse);

  if (!responses.length || new Set(responses.map((r) => r.id)).size !== responses.length) {
    throw new SurveyError("malformed");
  }

  return {
    id: value.id,
    componentKey: typeof value.componentKey === "string" ? value.componentKey : "",
    key: value.key,
    text: value.text,
    description: typeof value.description === "string" ? value.description : undefined,
    sequenceNo: value.sequenceNo as number,
    responseDatas: responses,
  };
}

function parseSurvey(value: unknown): Survey {
  if (
    !object(value) ||
    !positiveId(value.id) ||
    !nonempty(value.key) ||
    !nonempty(value.name) ||
    !Array.isArray(value.questionDatas)
  ) {
    throw new SurveyError("malformed");
  }

  const questions = value.questionDatas.map(parseQuestion);

  if (!questions.length || new Set(questions.map((q) => q.id)).size !== questions.length) {
    throw new SurveyError("malformed");
  }

  return {
    id: value.id,
    key: value.key,
    name: value.name,
    description: typeof value.description === "string" ? value.description : undefined,
    countryCode: typeof value.countryCode === "string" ? value.countryCode : undefined,
    validFrom: typeof value.validFrom === "string" ? value.validFrom : undefined,
    validTo: typeof value.validTo === "string" ? value.validTo : undefined,
    questionDatas: questions.sort((a, b) => a.sequenceNo - b.sequenceNo),
  };
}

function failure(error: unknown): SurveyError {
  if (error instanceof SurveyError) return error;

  if (error instanceof AuthenticationError) {
    if (error.code === "expired") return new SurveyError("expired");
    return new SurveyError("unavailable");
  }

  return new SurveyError("unavailable");
}

function checkStatus(status: number, method: "GET" | "POST"): void {
  if (status >= 200 && status < 300) return;
  if (status === 401) throw new SurveyError("expired");
  if (status === 403 || status === 404) throw new SurveyError("denied");
  if (status === 409) throw new SurveyError("invalid");
  throw new SurveyError(method === "POST" ? "uncertain" : "unavailable");
}

export function createSurveyClient(session: CustomerSession): SurveyClient {
  const blocked = new Set<number>();

  async function list(signal?: AbortSignal): Promise<Survey[]> {
    try {
      const response = await session.request("surveys", {
        method: "GET",
        signal,
      });

      checkStatus(response.status, "GET");

      if (!Array.isArray(response.data)) {
        throw new SurveyError("malformed");
      }

      const surveys = response.data.map(parseSurvey);
      return surveys.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw failure(error);
    }
  }

  async function submit(
    clientId: number,
    survey: Survey,
    answers: SurveyAnswer[],
    signal?: AbortSignal,
  ): Promise<void> {
    if (
      !positiveId(clientId) ||
      !session.identity.clients.includes(clientId) ||
      !positiveId(survey.id) ||
      !Array.isArray(answers) ||
      answers.length !== survey.questionDatas.length
    ) {
      throw new SurveyError("invalid");
    }

    if (blocked.has(survey.id)) {
      throw new SurveyError("uncertain");
    }

    const submittedQuestions = new Set<number>();

    for (const answer of answers) {
      const question = survey.questionDatas.find((q) => q.id === answer.questionId);
      const response = question?.responseDatas.find((r) => r.id === answer.responseId);

      if (
        !question ||
        !response ||
        response.value !== answer.value ||
        submittedQuestions.has(answer.questionId)
      ) {
        throw new SurveyError("invalid");
      }

      submittedQuestions.add(answer.questionId);
    }

    const scorecardValues = answers.map((answer) => ({
      ...answer,
      createdOn: new Date().toISOString(),
    }));

    // Block repeat submissions once the request is dispatched. A network failure
    // cannot prove whether the server accepted the scorecard.
    blocked.add(survey.id);

    try {
      const response = await session.request(`surveys/scorecards/${survey.id}`, {
        method: "POST",
        body: {
          clientId,
          surveyId: survey.id,
          surveyName: survey.name,
          scorecardValues,
        },
        signal,
      });

      checkStatus(response.status, "POST");
    } catch (error) {
      const safe = failure(error);

      // A definite rejection can be corrected and retried.
      if (safe.code === "invalid" || safe.code === "denied" || safe.code === "expired") {
        blocked.delete(survey.id);
      }

      throw safe;
    }
  }

  return {
    list,
    submit,
    isBlocked: (surveyId) => blocked.has(surveyId),
  };
}
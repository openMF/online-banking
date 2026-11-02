import { describe, it, expect, vi } from "vitest";
import { createSurveyClient, type Survey } from "./client";
import type { CustomerSession } from "../authentication/client";

const survey: Survey = {
id: 1,
key: "feedback",
name: "Customer Feedback",
questionDatas: [
{
id: 10,
componentKey: "rating",
key: "service",
text: "How was our service?",
sequenceNo: 1,
responseDatas: [
{ id: 101, text: "Poor", value: 1, sequenceNo: 1 },
{ id: 102, text: "Good", value: 3, sequenceNo: 2 },
{ id: 103, text: "Excellent", value: 5, sequenceNo: 3 },
],
},
{
id: 20,
componentKey: "rating",
key: "experience",
text: "How was your experience?",
sequenceNo: 2,
responseDatas: [
{ id: 201, text: "Poor", value: 1, sequenceNo: 1 },
{ id: 202, text: "Good", value: 3, sequenceNo: 2 },
{ id: 203, text: "Excellent", value: 5, sequenceNo: 3 },
],
},
],
};

const answers = [
{ questionId: 10, responseId: 103, value: 5 },
{ questionId: 20, responseId: 202, value: 3 },
];

function setup(
request = vi.fn(),
clients = [123],
) {
const session = {
identity: { clients },
request,
} as unknown as CustomerSession;

return {
request,
client: createSurveyClient(session),
};
}

describe("Survey client", () => {
describe("list", () => {
it("fetches surveys", async () => {
const request = vi.fn().mockResolvedValue({
status: 200,
data: [survey],
});
const { client } = setup(request);

  const result = await client.list();

  expect(request).toHaveBeenCalledWith("surveys", {
    method: "GET",
    signal: undefined,
  });
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe("Customer Feedback");
});

it("sorts surveys alphabetically", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    data: [
      { ...survey, id: 2, name: "Zebra" },
      { ...survey, id: 3, name: "Alpha" },
    ],
  });
  const { client } = setup(request);

  const result = await client.list();

  expect(result.map((item) => item.name)).toEqual(["Alpha", "Zebra"]);
});

it("sorts questions by sequence number", async () => {
  const request = vi.fn().mockResolvedValue({
    status: 200,
    data: [{
      ...survey,
      questionDatas: [...survey.questionDatas].reverse(),
    }],
  });
  const { client } = setup(request);

  const result = await client.list();

  expect(result[0].questionDatas.map((q) => q.id)).toEqual([10, 20]);
});

it("returns an empty array when no surveys exist", async () => {
  const { client } = setup(
    vi.fn().mockResolvedValue({ status: 200, data: [] }),
  );

  await expect(client.list()).resolves.toEqual([]);
});

it("rejects malformed survey data", async () => {
  const { client } = setup(
    vi.fn().mockResolvedValue({
      status: 200,
      data: [{ id: 1, name: "Invalid" }],
    }),
  );

  await expect(client.list()).rejects.toMatchObject({
    code: "malformed",
  });
});

it.each([
  [401, "expired"],
  [403, "denied"],
  [404, "denied"],
  [500, "unavailable"],
])("maps GET status %i to %s", async (status, code) => {
  const { client } = setup(
    vi.fn().mockResolvedValue({ status, data: null }),
  );

  await expect(client.list()).rejects.toMatchObject({ code });
});

it("maps network errors to unavailable", async () => {
  const { client } = setup(
    vi.fn().mockRejectedValue(new Error("Network error")),
  );

  await expect(client.list()).rejects.toMatchObject({
    code: "unavailable",
  });
});
});

describe("submit", () => {
it("submits valid answers with the expected payload", async () => {
const request = vi.fn().mockResolvedValue({ status: 200 });
const { client } = setup(request);

  await client.submit(123, survey, answers);

  expect(request).toHaveBeenCalledTimes(1);

  const [path, options] = request.mock.calls[0];

  expect(path).toBe("surveys/scorecards/1");
  expect(options.method).toBe("POST");
  expect(options.body.clientId).toBe(123);
  expect(options.body.surveyId).toBe(1);
  expect(options.body.surveyName).toBe("Customer Feedback");
  expect(options.body.scorecardValues).toHaveLength(2);
  expect(options.body.scorecardValues[0]).toMatchObject(answers[0]);
  expect(Date.parse(options.body.scorecardValues[0].createdOn)).not.toBeNaN();
});

it("rejects a client not owned by the session", async () => {
  const request = vi.fn();
  const { client } = setup(request, [456]);

  await expect(
    client.submit(123, survey, answers),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(request).not.toHaveBeenCalled();
});

it("rejects incomplete answers", async () => {
  const request = vi.fn();
  const { client } = setup(request);

  await expect(
    client.submit(123, survey, [answers[0]]),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(request).not.toHaveBeenCalled();
});

it("rejects unknown questions and responses", async () => {
  const { client, request } = setup();

  await expect(
    client.submit(123, survey, [
      { questionId: 999, responseId: 103, value: 5 },
      answers[1],
    ]),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(request).not.toHaveBeenCalled();
});

it("rejects mismatched response values", async () => {
  const { client, request } = setup();

  await expect(
    client.submit(123, survey, [
      { questionId: 10, responseId: 103, value: 1 },
      answers[1],
    ]),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(request).not.toHaveBeenCalled();
});

it("rejects duplicate answers for one question", async () => {
  const { client, request } = setup();

  await expect(
    client.submit(123, survey, [answers[0], answers[0]]),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(request).not.toHaveBeenCalled();
});

it("blocks duplicate submissions after success", async () => {
  const request = vi.fn().mockResolvedValue({ status: 200 });
  const { client } = setup(request);

  await client.submit(123, survey, answers);

  expect(client.isBlocked(1)).toBe(true);

  await expect(
    client.submit(123, survey, answers),
  ).rejects.toMatchObject({ code: "uncertain" });

  expect(request).toHaveBeenCalledTimes(1);
});

it("keeps the survey blocked after an uncertain server error", async () => {
  const request = vi.fn().mockResolvedValue({ status: 500 });
  const { client } = setup(request);

  await expect(
    client.submit(123, survey, answers),
  ).rejects.toMatchObject({ code: "uncertain" });

  expect(client.isBlocked(1)).toBe(true);
});

it("allows retry after a definite validation rejection", async () => {
  const request = vi.fn()
    .mockResolvedValueOnce({ status: 409 })
    .mockResolvedValueOnce({ status: 200 });
  const { client } = setup(request);

  await expect(
    client.submit(123, survey, answers),
  ).rejects.toMatchObject({ code: "invalid" });

  expect(client.isBlocked(1)).toBe(false);

  await client.submit(123, survey, answers);

  expect(request).toHaveBeenCalledTimes(2);
});

it("keeps the survey blocked after a network error", async () => {
  const request = vi.fn().mockRejectedValue(new Error("Network error"));
  const { client } = setup(request);

  await expect(
    client.submit(123, survey, answers),
  ).rejects.toMatchObject({ code: "unavailable" });

  expect(client.isBlocked(1)).toBe(true);
});
});
});

import {
describe,
it,
expect,
vi,
beforeEach,
afterEach,
} from "vitest";

import {
render,
screen,
fireEvent,
waitFor,
cleanup,
} from "@testing-library/react";

import { SurveyParticipation } from "./SurveyParticipation";

import {
SurveyError,
type Survey,
type SurveyClient,
} from "../lib/surveys/client";

vi.mock("../i18n", () => ({
useI18n: () => ({ t: (value: string) => value }),
}));

const survey: Survey = {
id: 1,
key: "customer-satisfaction",
name: "Customer Satisfaction",
description: "Share your feedback",
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
],
};

function setup({
list = vi.fn().mockResolvedValue([survey]),
submit = vi.fn().mockResolvedValue(undefined),
clients = [123],
onExpired = vi.fn(),
onClose = vi.fn(),
isBlocked = false,
} = {}) {
const client = {
list,
submit,
isBlocked: vi.fn().mockReturnValue(isBlocked),
} as unknown as SurveyClient;

const result = render( <SurveyParticipation
   client={client}
   clients={clients}
   onExpired={onExpired}
   onClose={onClose}
 />,
);

return {
...result,
client,
list,
submit,
onExpired,
onClose,
};
}

describe("SurveyParticipation", () => {
beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
cleanup();
});

it("loads and displays available surveys", async () => {
setup();

expect(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
).not.toBeNull();


});

it("displays the loading state", () => {
setup({
list: vi.fn(() => new Promise(() => {})),
});


expect(
  screen.getByText("Consultando encuestas..."),
).not.toBeNull();


});

it("displays an empty state when no surveys exist", async () => {
setup({
list: vi.fn().mockResolvedValue([]),
});


expect(
  await screen.findByText(
    "No hay encuestas disponibles en este momento.",
  ),
).not.toBeNull();


});

it("displays survey questions and response options", async () => {
setup();


fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

expect(
  screen.getByText((_, element) =>
    element?.tagName === "STRONG" &&
    element.textContent?.includes("How was our service?") === true
  ),
).not.toBeNull();
expect(screen.getByLabelText("Poor")).not.toBeNull();
expect(screen.getByLabelText("Good")).not.toBeNull();
expect(screen.getByLabelText("Excellent")).not.toBeNull();


});

it("does not submit incomplete answers", async () => {
const { submit } = setup();


fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

fireEvent.click(
  screen.getByRole("button", {
    name: "Enviar respuestas",
  }),
);

expect(
  screen.getByText(
    "Responde todas las preguntas antes de enviar.",
  ),
).not.toBeNull();

expect(submit).not.toHaveBeenCalled();


});

it("submits selected answers successfully", async () => {
const { submit } = setup();

fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

fireEvent.click(screen.getByLabelText("Excellent"));

fireEvent.click(
  screen.getByRole("button", {
    name: "Enviar respuestas",
  }),
);

await waitFor(() => {
  expect(submit).toHaveBeenCalledWith(
    123,
    survey,
    [
      {
        questionId: 10,
        responseId: 103,
        value: 5,
      },
    ],
  );
});

expect(
  await screen.findByText(
    "¡Respuestas enviadas correctamente!",
  ),
).not.toBeNull();


});

it("allows the user to return to the survey list", async () => {
setup();


fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

fireEvent.click(
  screen.getByRole("button", {
    name: "Volver a las encuestas",
  }),
);

expect(
  screen.getByRole("button", {
    name: "Customer Satisfaction",
  }),
).not.toBeNull();


});

it("calls onClose after successful submission", async () => {
const { onClose } = setup();


fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

fireEvent.click(screen.getByLabelText("Excellent"));

fireEvent.click(
  screen.getByRole("button", {
    name: "Enviar respuestas",
  }),
);

await screen.findByText(
  "¡Respuestas enviadas correctamente!",
);

const closeButtons = screen.getAllByRole("button", {
  name: "Volver al inicio",
});

fireEvent.click(closeButtons[0]);

expect(onClose).toHaveBeenCalledOnce();


});

it("calls onExpired when the survey API reports an expired session", async () => {
const onExpired = vi.fn();


setup({
  list: vi.fn().mockRejectedValue(
    new SurveyError("expired")
  ),
  onExpired,
});

await waitFor(() => {
  expect(onExpired).toHaveBeenCalledOnce();
});


});

it("displays an error when survey loading fails", async () => {
setup({
list: vi.fn().mockRejectedValue(
new SurveyError("unavailable")
),
});


expect(
  await screen.findByText(
    "No se pudieron consultar las encuestas. Inténtalo más tarde.",
  ),
).not.toBeNull();


});

it("displays an error when submission fails", async () => {
const { submit } = setup({
submit: vi.fn().mockRejectedValue(
new SurveyError("denied")
),
});


fireEvent.click(
  await screen.findByRole("button", {
    name: "Customer Satisfaction",
  }),
);

fireEvent.click(screen.getByLabelText("Excellent"));

fireEvent.click(
  screen.getByRole("button", {
    name: "Enviar respuestas",
  }),
);

expect(
  await screen.findByText(
    "No tienes permiso para acceder a esta encuesta.",
  ),
).not.toBeNull();

expect(submit).toHaveBeenCalledOnce();


});

it("disables surveys that have already been submitted", async () => {
setup({
isBlocked: true,
});


const button = await screen.findByRole("button", {
  name: "Customer Satisfaction",
});

expect(button).toHaveProperty("disabled", true);


});

it("shows a message when no authorized clients exist", async () => {
setup({
clients: [],
});

expect(
  await screen.findByText(
    "No hay clientes autorizados para participar en encuestas.",
  ),
).not.toBeNull();


});

it("closes the survey interface", async () => {
const { onClose } = setup();

fireEvent.click(
  screen.getByRole("button", {
    name: "Volver al inicio",
  }),
);

expect(onClose).toHaveBeenCalledOnce();
});
});

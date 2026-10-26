import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import DemoBank from "./Banking";

afterEach(cleanup);

const accountNames = () =>
  screen
    .getAllByRole("button", { name: /^Fijar .* como bolsillo$/ })
    .map((button) => button.getAttribute("aria-label"));

const pin = (name: string) =>
  userEvent.click(screen.getByRole("button", { name: `Fijar ${name} como bolsillo` }));

function renderBank() {
  render(
    <I18nProvider>
      <DemoBank segment="personas" initialView="overview" onClose={() => {}} onTimeout={() => {}} />
    </I18nProvider>,
  );
}

describe("pocket accounts on the dashboard", () => {
  it("moves a pinned account first and puts it back when unpinned", async () => {
    renderBank();
    expect(accountNames()).toEqual([
      "Fijar Cuenta MIFOS como bolsillo",
      "Fijar Mi ahorro como bolsillo",
    ]);

    await pin("Mi ahorro");
    const savings = screen.getByRole("button", { name: "Fijar Mi ahorro como bolsillo" });
    expect(savings.getAttribute("aria-pressed")).toBe("true");
    expect(accountNames()[0]).toBe("Fijar Mi ahorro como bolsillo");

    await pin("Mi ahorro");
    expect(savings.getAttribute("aria-pressed")).toBe("false");
    expect(accountNames()[0]).toBe("Fijar Cuenta MIFOS como bolsillo");
  });

  it("keeps several pocket accounts in the order they were pinned", async () => {
    renderBank();
    await pin("Mi ahorro");
    await pin("Cuenta MIFOS");
    expect(accountNames()).toEqual([
      "Fijar Mi ahorro como bolsillo",
      "Fijar Cuenta MIFOS como bolsillo",
    ]);

    await pin("Mi ahorro");
    expect(accountNames()).toEqual([
      "Fijar Cuenta MIFOS como bolsillo",
      "Fijar Mi ahorro como bolsillo",
    ]);
  });
});

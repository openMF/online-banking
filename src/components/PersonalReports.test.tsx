import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { CustomerSession } from "../lib/authentication/client";
import { PersonalReports } from "./PersonalReports";

afterEach(cleanup);

it("ends the session when loading a report's parameters is refused with 401", async () => {
  const request = vi.fn<CustomerSession["request"]>(async (path) =>
    path === "runreports"
      ? { status: 200, ok: true, data: ["Statement"] }
      : { status: 401, ok: false, data: {} },
  );
  const session = {
    identity: { userId: 1 },
    expiresAt: Date.now() + 900000,
    request,
    logout: vi.fn(),
  } as unknown as CustomerSession;
  const onExpired = vi.fn();
  render(<PersonalReports session={session} onExpired={onExpired} onClose={vi.fn()} />);

  await userEvent.setup().click(await screen.findByRole("button", { name: /Statement/ }));

  await waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledWith(
    "runreports/Statement/parameters",
    expect.objectContaining({ method: "GET" }),
  );
});

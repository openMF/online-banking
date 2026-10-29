import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { resetNetworkActivity, setOnline, trackRequest } from "../lib/network";
import { NetworkStatus } from "./NetworkStatus";

function show() {
  const { container } = render(
    <I18nProvider>
      <NetworkStatus />
    </I18nProvider>,
  );
  return container.querySelector(".network-status-region") as HTMLElement;
}

/** A tracked request that stays open until `finish` is called. */
function openRequest() {
  let finish!: () => void;
  let handle!: { retrying(): void };
  const done = trackRequest(
    (h) =>
      new Promise<void>((resolve) => {
        handle = h;
        finish = resolve;
      }),
  );
  return { done, finish: () => finish(), retrying: () => handle.retrying() };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  resetNetworkActivity();
  vi.useRealTimers();
});

describe("NetworkStatus", () => {
  it("is an empty polite live region when nothing is happening, so it can announce later", () => {
    const region = show();
    expect(region.getAttribute("aria-live")).toBe("polite");
    // it never takes the role of the status of a screen
    expect(screen.queryByRole("status")).toBeNull();
    expect(region.textContent).toBe("");
  });

  it("marks the indicator of a modal dialog, so the page one can step aside while it is open", () => {
    const { container } = render(
      <I18nProvider>
        <NetworkStatus inDialog />
      </I18nProvider>,
    );
    const region = container.querySelector(".network-status-region");
    expect(region?.classList.contains("in-dialog")).toBe(true);
    expect(region?.getAttribute("aria-live")).toBe("polite");
  });

  it("does not flicker for a quick request", async () => {
    const region = show();
    const request = openRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(region.textContent).toBe("");

    request.finish();
    await act(async () => {
      await request.done;
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(region.textContent).toBe("");
  });

  it("says that it is loading when a request takes long, and stops when it ends", async () => {
    const region = show();
    const request = openRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });
    expect(region.textContent).toContain("Cargando…");

    request.finish();
    await act(async () => {
      await request.done;
    });
    expect(region.textContent).toBe("");
  });

  it("says at once that it is trying again, because that explains why it is slow", async () => {
    const region = show();
    const request = openRequest();

    await act(async () => {
      request.retrying();
    });

    expect(region.textContent).toContain("La conexión es lenta");
    request.finish();
    await act(async () => {
      await request.done;
    });
  });

  it("says that there is no connection after a failure, and clears when it comes back", async () => {
    const region = show();
    setOnline(false);
    await act(async () => {
      await trackRequest(() => Promise.reject(new Error("down"))).catch(() => undefined);
    });
    expect(region.textContent).toContain("Sin conexión a internet");
    expect(region.querySelector("[data-kind='offline']")).not.toBeNull();

    await act(async () => {
      setOnline(true);
    });
    expect(region.textContent).toBe("");
  });

  it("puts being offline before a retry, which would be pointless", async () => {
    const region = show();
    setOnline(false);
    const request = openRequest();
    await act(async () => {
      request.retrying();
    });
    expect(region.textContent).toContain("Sin conexión a internet");
    request.finish();
    await act(async () => {
      await request.done;
    });
  });

  it("hides the decorative icons from assistive technology and never takes the focus", async () => {
    const region = show();
    const request = openRequest();
    await act(async () => {
      request.retrying();
    });
    expect(region.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(region.querySelector("[tabindex]")).toBeNull();
    request.finish();
    await act(async () => {
      await request.done;
    });
  });
});

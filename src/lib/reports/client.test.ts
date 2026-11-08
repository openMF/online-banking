import { expect, it, vi } from "vitest";
import { AuthenticationError, type CustomerSession } from "../authentication/client";
import { buildSelfServiceUrl } from "../self-service-config";
import { createReportsClient } from "./client";

const config = {
  baseUrl: "https://bank.invalid/fineract-provider/api/v1/self",
  tenantId: "synthetic-tenant",
};

function setup(data: unknown = ["ClientSummary"]) {
  const request = vi
    .fn<CustomerSession["request"]>()
    .mockResolvedValue({ status: 200, ok: true, data });
  const download = vi
    .fn<NonNullable<CustomerSession["download"]>>()
    .mockResolvedValue({ status: 200, ok: true, blob: new Blob(["a,b"]), contentType: "text/csv" });
  const session = {
    identity: { userId: 1 },
    expiresAt: Date.now() + 900000,
    request,
    download,
    logout: vi.fn(),
  } as unknown as CustomerSession;
  return { client: createReportsClient(session), request, download };
}

it("requests the self-service report resources as relative paths the session accepts", async () => {
  const { client, request, download } = setup();
  await client.list();
  await client.parameters("ClientSummary");
  await client.run("ClientSummary", { R_clientId: "81" });
  await client.download("ClientSummary", { R_clientId: "81" }, "CSV");

  const paths = [...request.mock.calls, ...download.mock.calls].map(([path]) => path);
  expect(paths).toEqual([
    "runreports",
    "runreports/ClientSummary/parameters",
    "runreports/ClientSummary",
    "runreports/ClientSummary",
  ]);
  for (const path of paths) {
    expect(String(buildSelfServiceUrl(config, path))).toBe(`${config.baseUrl}/${path}`);
  }
});

it("reports an ended session as a 401, so the screen can end it too", async () => {
  const { client, request } = setup();
  request.mockRejectedValue(new AuthenticationError("expired"));
  await expect(client.list()).rejects.toMatchObject({ status: 401 });
});

/**
 * Typed client of the account transfers of selfservice-plugin (`/v1/self/accounttransfers`,
 * MX-478). Contract source of truth: the plugin's `SelfAccountTransferApiResource` and
 * `SelfAccountTransferDataValidator`.
 *
 * This is the thin layer: it sends what it is given and returns what the server answered, as
 * received. Reading the answer with care (it moves money) is the job of `src/lib/transfers`.
 */

import { selfRequest, type RequestOptions } from "./http";

type Options = Pick<RequestOptions, "fetchImpl" | "config" | "signal" | "session" | "customer"> & {
  /** One-time token of a step-up for `OWN_TRANSFER` or `TPT_TRANSFER`, when the server asks. */
  stepUpToken?: string;
};

/** `own`: between the accounts of the customer. `tpt`: to a registered third-party beneficiary. */
export type TransferKind = "own" | "tpt";

/** The body of `POST /v1/self/accounttransfers`. Every id comes from the template. */
export type CreateTransferBody = {
  fromOfficeId: number;
  fromClientId: number;
  fromAccountId: number;
  /** 1 loan, 2 savings. */
  fromAccountType: number;
  toOfficeId: number;
  toClientId: number;
  toAccountId: number;
  toAccountType: number;
  /** In `dateFormat`. */
  transferDate: string;
  /** A decimal as text (`"10.50"`): read by the server with `locale`, never through a float. */
  transferAmount: string;
  transferDescription: string;
  dateFormat: string;
  locale: string;
};

/** `GET /v1/self/accounttransfers/template`, `?type=tpt` for the beneficiaries. As received. */
export function getTransferTemplate(kind: TransferKind, options: Options = {}): Promise<unknown> {
  return selfRequest<unknown>("/accounttransfers/template", {
    ...options,
    method: "GET",
    query: kind === "tpt" ? { type: "tpt" } : undefined,
  });
}

/**
 * `POST /v1/self/accounttransfers` (`?type=tpt` for a beneficiary). One send, never repeated by
 * this layer: a transfer that failed in transit may have run. The server checks the request, the
 * limits and the one-time token in the same transaction as the transfer.
 */
export function createTransfer(
  kind: TransferKind,
  body: CreateTransferBody,
  options: Options = {},
): Promise<unknown> {
  return selfRequest<unknown>("/accounttransfers", {
    ...options,
    method: "POST",
    query: kind === "tpt" ? { type: "tpt" } : undefined,
    body,
  });
}

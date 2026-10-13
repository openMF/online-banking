import type { CallToolResult } from "./types.ts";
import { isConnectorPending, isLoginRequired } from "./login.ts";

export type CallToolErrorKind =
  | "pending"
  | "login"
  | "not_connected"
  | "scope_denied"
  | "access_denied"
  | "error";

export type CallToolErrorState = {
  kind: CallToolErrorKind;
  message: string;
  detail?: string;
};

type MessageRule = {
  needles: readonly string[];
  kind: CallToolErrorKind;
  message: string;
};

const MESSAGE_RULES: readonly MessageRule[] = [
  {
    needles: ["not_connected", "failed_precondition"],
    kind: "not_connected",
    message: "Connect this connector in Grok to load your data.",
  },
  {
    needles: ["scope_denied"],
    kind: "scope_denied",
    message: "This view isn't available — the app requested a tool outside its grant.",
  },
  {
    needles: ["access_denied"],
    kind: "access_denied",
    message: "You don't have access to this data.",
  },
];

function matchMessageRule(raw: string): MessageRule | undefined {
  return MESSAGE_RULES.find((rule) =>
    rule.needles.some((needle) => raw.includes(needle)),
  );
}

export function classifyCallToolError(
  result: CallToolResult,
): CallToolErrorState | null {
  if (result.ok) return null;
  const detail = result.errorMessage || undefined;
  const raw = (result.errorMessage ?? "").toLowerCase();
  if (isConnectorPending(result)) {
    return { kind: "pending", message: "Connecting to your data…", detail };
  }
  if (raw.includes("missing_connector_token")) {
    return {
      kind: "error",
      message: "Open this app from Grok to load your data.",
      detail,
    };
  }
  if (isLoginRequired(result)) {
    return {
      kind: "login",
      message: "Continue with Grok to load your data.",
      detail,
    };
  }
  const rule = matchMessageRule(raw);
  if (rule) return { kind: rule.kind, message: rule.message, detail };
  return {
    kind: "error",
    message: detail ?? "Something went wrong. Try again.",
    detail,
  };
}

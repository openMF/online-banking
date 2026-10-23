import { getLocale, translate } from "../i18n";

export type Segment = "personas" | "empresas";
export type Product = "cuenta" | "inversion" | "credito";
export type BankView =
  "overview" | "transfer" | "activity" | "beneficiaries" | "approvals" | "security";

export type Account = {
  id: string;
  name: string;
  number: string;
  balance: number;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  detail: string;
  amount: number;
  accountId: string;
};

export type Beneficiary = { id: string; name: string; account: string };

export type Transfer = {
  id: string;
  from: string;
  to: string;
  toName: string;
  amount: number;
  concept: string;
  own: boolean;
  date: string;
  status: "pending" | "approved" | "rejected";
};

// Monetary values are stored as integer centavos to avoid rounding drift.
export const money = (centavos: number) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "MXN",
  }).format(centavos / 100);

export const shortDate = (date: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
  }).format(new Date(date));

export function getAccounts(segment: Segment): Account[] {
  return [
    {
      id: "daily",
      name: segment === "empresas" ? "Cuenta empresarial" : "Cuenta MIFOS",
      number: "1024",
      balance: segment === "empresas" ? 53280000 : 12845000,
    },
    {
      id: "savings",
      name: "Mi ahorro",
      number: "2086",
      balance: segment === "empresas" ? 18000000 : 8723050,
    },
  ];
}

export function getTransactions(segment: Segment): Transaction[] {
  const day = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toISOString();
  };
  return [
    {
      id: "demo-1",
      date: day(0),
      description:
        segment === "empresas" ? "Pago de cliente" : "Depósito de nómina",
      detail: "Transferencia recibida",
      amount: segment === "empresas" ? 8500000 : 2850000,
      accountId: "daily",
    },
    {
      id: "demo-2",
      date: day(1),
      description:
        segment === "empresas" ? "Papelería del Centro" : "Café de la mañana",
      detail: "Pago realizado",
      amount: -14500,
      accountId: "daily",
    },
    {
      id: "demo-3",
      date: day(2),
      description: "Transferencia a Sofía",
      detail: "Transferencia enviada",
      amount: -250000,
      accountId: "daily",
    },
    {
      id: "demo-4",
      date: day(3),
      description: "Aportación a mi ahorro",
      detail: "Transferencia recibida",
      amount: 500000,
      accountId: "savings",
    },
    {
      id: "demo-5",
      date: day(3),
      description: "Aportación a mi ahorro",
      detail: "Transferencia enviada",
      amount: -500000,
      accountId: "daily",
    },
  ];
}

export const initialBeneficiaries: Beneficiary[] = [
  { id: "sofia", name: "Sofía Martínez", account: "000000000000002048" },
  { id: "daniel", name: "Daniel García", account: "000000000000004096" },
];

export function downloadFile(
  filename: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTransactions(transactions: Transaction[]) {
  // Treat user-entered concepts as text, never spreadsheet formulas.
  const cell = (value: string) =>
    `"${(/^[=+@-]/.test(value) ? "'" : "") + value.replace(/"/g, '""')}"`;
  const rows = transactions.map((t) =>
    [
      cell(t.date.slice(0, 10)),
      cell(t.description),
      (t.amount / 100).toFixed(2),
      cell("MXN"),
      cell(translate("DEMOSTRACIÓN")),
    ].join(","),
  );
  downloadFile(
    translate("mifos-movimientos-demo.csv"),
    `\ufeff${translate("Fecha")},${translate("Concepto")},${translate("Importe")},${translate("Moneda")},${translate("Tipo")}\n` +
      rows.join("\n"),
    "text/csv;charset=utf-8",
  );
}

export function transferReceipt(transfer: Transfer) {
  downloadFile(
    `mifos-demo-${transfer.id}.txt`,
    [
      translate("MIFOS | COMPROBANTE DE DEMOSTRACIÓN"),
      translate("Sin validez bancaria. No se ha movido dinero real."),
      "",
      `${translate("Referencia")}: ${transfer.id}`,
      `${translate("Fecha")}: ${new Date(transfer.date).toLocaleString(getLocale())}`,
      `${translate("Destinatario")}: ${transfer.toName}`,
      `${translate("Monto")}: ${money(transfer.amount)} MXN`,
      `${translate("Concepto")}: ${transfer.concept}`,
      `${translate("Estado")}: ${translate(transfer.status === "pending" ? "Pendiente de segunda firma" : transfer.status === "approved" ? "Simulada correctamente" : "Rechazada")}`,
    ].join("\n"),
  );
}

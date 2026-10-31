// Synthetic LoanChargeData based on the core read mapper. Never customer records.
export const charge = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  chargeId: 9,
  loanId: 473,
  name: "Synthetic fee",
  currency: { code: "MXN", decimalPlaces: 2 },
  amount: 100.25,
  amountPaid: 0,
  amountWaived: 0,
  amountWrittenOff: 0,
  amountOutstanding: 100.25,
  paid: false,
  waived: false,
  dueDate: [2026, 11, 5],
  penalty: false,
  chargeCalculationType: { id: 1, code: "chargeCalculationType.flat", value: "Flat" },
  chargeTimeType: { id: 2, code: "chargeTimeType.specifiedDueDate", value: "Specified due date" },
  ...overrides,
});
export const charges = () => [
  charge({ name: "Synthetic unpaid fee" }),
  charge({
    id: 2,
    name: "Synthetic paid fee",
    paid: true,
    amountPaid: 100.25,
    amountOutstanding: 0,
  }),
  charge({ id: 3, name: "Synthetic partial fee", amountPaid: 25, amountOutstanding: 75.25 }),
  charge({
    id: 4,
    name: "Synthetic waived fee",
    waived: true,
    amountWaived: 100.25,
    amountOutstanding: 0,
    dueDate: undefined,
  }),
];

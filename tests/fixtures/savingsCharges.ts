// Synthetic SavingsAccountChargeData shaped after GET /self/savingsaccounts/{id}/charges, never
// live data. Like Fineract, paid, waived and written-off amounts of zero are sent as 0.
const times = {
  specifiedDueDate: [2, "Specified due date"],
  savingsActivation: [3, "Savings Activation"],
  withdrawalFee: [5, "Withdrawal Fee"],
  annualFee: [6, "Annual Fee"],
  monthlyFee: [7, "Monthly Fee"],
  overdraftFee: [10, "Overdraft Fee"],
  weeklyFee: [11, "Weekly Fee"],
  savingsNoActivityFee: [16, "Saving No Activity Fee"],
} as const;
export const savingsCharge = (
  id: number,
  time: keyof typeof times = "specifiedDueDate",
  extra: Record<string, unknown> = {},
  accountId = 42,
) => {
  const [timeId, value] = times[time];
  return {
    id,
    chargeId: 100 + id,
    accountId,
    name: `Synthetic charge ${id}`,
    chargeTimeType: { id: timeId, code: `chargeTimeType.${time}`, value },
    dueDate: time === "specifiedDueDate" ? [2026, 12, 15] : undefined,
    chargeCalculationType: { id: 1, code: "chargeCalculationType.flat", value: "Flat" },
    percentage: 0,
    amountPercentageAppliedTo: 0,
    currency: {
      code: "MXN",
      name: "Mexican Peso",
      decimalPlaces: 2,
      displaySymbol: "$",
      nameCode: "currency.MXN",
      displayLabel: "Mexican Peso ($)",
    },
    amount: 25,
    amountPaid: 0,
    amountWaived: 0,
    amountWrittenOff: 0,
    amountOutstanding: 25,
    amountOrPercentage: 25,
    penalty: false,
    isActive: true,
    isFreeWithdrawal: false,
    freeWithdrawalChargeFrequency: 0,
    restartFrequency: 0,
    restartFrequencyEnum: 0,
    ...extra,
  };
};
export const percentOfAmount = {
  chargeCalculationType: {
    id: 2,
    code: "chargeCalculationType.percent.of.amount",
    value: "% Amount",
  },
};
/**
 * In the server's order: a percentage withdrawal fee, an annual fee owed, a paid overdraft penalty,
 * a part-paid monthly fee, a waived fee and an inactive one.
 */
export const savingsCharges = (accountId = 42) => [
  savingsCharge(
    1,
    "withdrawalFee",
    {
      ...percentOfAmount,
      name: "Synthetic withdrawal fee",
      amount: 0,
      amountOutstanding: 0,
      percentage: 1.5,
      amountOrPercentage: 1.5,
    },
    accountId,
  ),
  savingsCharge(
    2,
    "annualFee",
    {
      name: "Synthetic annual fee",
      amount: 100,
      amountOutstanding: 100,
      amountOrPercentage: 100,
      dueDate: [2027, 1, 15],
      feeOnMonthDay: [1, 15],
    },
    accountId,
  ),
  savingsCharge(
    3,
    "overdraftFee",
    {
      name: "Synthetic overdraft penalty",
      penalty: true,
      amount: 50,
      amountPaid: 50,
      amountOutstanding: 0,
      amountOrPercentage: 50,
    },
    accountId,
  ),
  savingsCharge(
    4,
    "monthlyFee",
    {
      name: "Synthetic monthly fee",
      amount: 30,
      amountPaid: 10,
      amountOutstanding: 20,
      amountOrPercentage: 30,
      dueDate: [2026, 12, 5],
      feeOnMonthDay: [12, 5],
      feeInterval: 2,
    },
    accountId,
  ),
  savingsCharge(
    5,
    "specifiedDueDate",
    { name: "Synthetic waived fee", amountWaived: 25, amountOutstanding: 0 },
    accountId,
  ),
  savingsCharge(
    6,
    "specifiedDueDate",
    { name: "Synthetic inactive fee", isActive: false, inactivationDate: [2026, 11, 1] },
    accountId,
  ),
];

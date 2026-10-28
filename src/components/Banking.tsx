import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  FileClock,
  House,
  Info,
  Landmark,
  ListFilter,
  LockKeyhole,
  LogOut,
  Pin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "./ui";
import { StepUpPanel } from "./StepUpPanel";
import { LocalizedTree, translate, translateWith, useI18n } from "../i18n";
import {
  exportTransactions,
  getAccounts,
  getTransactions,
  initialBeneficiaries,
  money,
  pocketsFirst,
  shortDate,
  transactionDetail,
  transferReceipt,
  type Account,
  type BankView,
  type Beneficiary,
  type Segment,
  type Transaction,
  type Transfer,
} from "../lib/demo";
import { ActivityFeed } from "./ActivityFeed";
import { AuthenticatorSection } from "./AuthenticatorSection";
import { recordDemoActivity, resetDemoActivity } from "../lib/activity";
import {
  canCompleteTransferLocally,
  resetDemoStepUpApi,
  selectStepUpApi,
} from "../lib/stepup";

type TransferDraft = Omit<Transfer, "id" | "date" | "status">;

// A component boundary keeps LocalizedTree from re-translating the already translated text.
function TransactionDetail({ transaction }: { transaction: Transaction }) {
  useI18n();
  return <small>{transactionDetail(transaction)}</small>;
}

function TransactionList({
  transactions,
  hidden = false,
}: {
  transactions: Transaction[];
  hidden?: boolean;
}) {
  if (!transactions.length)
    return (
      <LocalizedTree>
        <div className="empty-state">
          <Search size={28} />
          <h4>No hay movimientos por aquí.</h4>
          <p>Prueba otra búsqueda o realiza una transferencia de prueba.</p>
        </div>
      </LocalizedTree>
    );
  return (
    <LocalizedTree>
      <ul className="transaction-list">
        {transactions.map((transaction) => (
          <li key={transaction.id}>
            <span
              className={`transaction-icon ${transaction.amount > 0 ? "incoming" : ""}`}
            >
              {transaction.amount > 0 ? (
                <ArrowDownLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </span>
            <span className="transaction-description">
              <strong>{transaction.description}</strong>
              <TransactionDetail transaction={transaction} />
            </span>
            <time dateTime={transaction.date}>
              {shortDate(transaction.date)}
            </time>
            <strong
              className={`transaction-amount ${transaction.amount > 0 ? "positive" : ""}`}
            >
              {hidden
                ? "••••••"
                : `${transaction.amount > 0 ? "+" : "-"}${money(Math.abs(transaction.amount))}`}
            </strong>
          </li>
        ))}
      </ul>
    </LocalizedTree>
  );
}

function TransferPanel({
  accounts,
  beneficiaries,
  segment,
  onComplete,
  onActivity,
  onBeneficiaries,
  onApprovals,
}: {
  accounts: Account[];
  beneficiaries: Beneficiary[];
  segment: Segment;
  onComplete: (transfer: TransferDraft) => Transfer | null;
  onActivity: () => void;
  onBeneficiaries: () => void;
  onApprovals: () => void;
}) {
  const [step, setStep] = useState<"form" | "review" | "verify" | "success">(
    "form",
  );
  const [own, setOwn] = useState(false);
  const [from, setFrom] = useState(accounts[0].id);
  const [to, setTo] = useState(beneficiaries[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Transfer | null>(null);
  const source = accounts.find((account) => account.id === from)!;
  const destinationName = own
    ? accounts.find((account) => account.id === to)?.name
    : beneficiaries.find((beneficiary) => beneficiary.id === to)?.name;
  const cents = Math.round(Number(amount) * 100);
  const stepUpApi = selectStepUpApi();
  // Same field names as POST /v1/self/accounttransfers, so the real backend can bind the one-time
  // token to exactly this transfer.
  const stepUpPayload = {
    fromAccountId: from,
    toAccountId: to,
    transferAmount: cents / 100,
  };

  function changeType(value: boolean) {
    setOwn(value);
    setTo(
      value
        ? accounts.find((account) => account.id !== from)!.id
        : (beneficiaries[0]?.id ?? ""),
    );
    setError("");
  }

  function review(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!Number.isFinite(cents) || cents < 1 || cents > 5000000) {
      setError("Ingresa un importe entre $0.01 y $50,000.00 MXN.");
      return;
    }
    if (cents > source.balance) {
      setError(
        "El saldo de esta cuenta es insuficiente. Elige otra cuenta o un importe menor.",
      );
      return;
    }
    if (!destinationName || (own && from === to)) {
      setError("Selecciona una cuenta de destino diferente al origen.");
      return;
    }
    if (concept.trim().length < 2) {
      setError("Escribe un concepto de al menos 2 caracteres.");
      return;
    }
    setStep("review");
  }

  /**
   * Called once the step-up verification succeeded (or the server does not require it). The
   * verification itself happens in {@link StepUpPanel}; this component never checks a code.
   */
  function finish() {
    if (!canCompleteTransferLocally(stepUpApi)) {
      // The verification was real, but this demo cannot send the protected transfer: do not pretend
      // that money moved.
      setError(
        "Las transferencias reales todavía no están conectadas en esta demostración. No se movió dinero.",
      );
      return;
    }
    const transfer = onComplete({
      from,
      to,
      toName: destinationName!,
      amount: cents,
      concept: concept.trim(),
      own,
    });
    if (!transfer) {
      setError("El saldo disponible cambió. Regresa y verifica el importe.");
      setStep("review");
      return;
    }
    setResult(transfer);
    setStep("success");
    setError("");
  }

  if (step === "success" && result)
    return (
      <LocalizedTree>
        <div className="transfer-success form-success" role="status">
          <span
            className={`success-symbol ${result.status === "pending" ? "pending-symbol" : ""}`}
          >
            {result.status === "pending" ? (
              <FileClock size={32} />
            ) : (
              <CheckCheck size={32} />
            )}
          </span>
          <p className="eyebrow">
            {result.status === "pending"
              ? "UN PASO MÁS, EN EQUIPO"
              : "ASÍ DE SIMPLE"}
          </p>
          <h3>
            {result.status === "pending"
              ? "Lista para una segunda firma."
              : "Transferencia simulada."}
          </h3>
          <p>
            {result.status === "pending"
              ? "El saldo no cambiará hasta que un segundo firmante apruebe esta operación de prueba."
              : "La operación se registró en tu cuenta de prueba. No se ha movido dinero real."}
          </p>
          <strong className="receipt-amount">
            {money(result.amount)} <small>MXN</small>
          </strong>
          <dl className="review-details">
            <div>
              <dt>Para</dt>
              <dd>{result.toName}</dd>
            </div>
            <div>
              <dt>Concepto</dt>
              <dd>{result.concept}</dd>
            </div>
            <div>
              <dt>Referencia demo</dt>
              <dd>{result.id}</dd>
            </div>
          </dl>
          <button
            className="button button-primary"
            onClick={result.status === "pending" ? onApprovals : onActivity}
          >
            {result.status === "pending"
              ? "Ver aprobaciones"
              : "Ver mis movimientos"}
            <ArrowRight size={17} />
          </button>
          <button
            className="button button-outline"
            onClick={() => transferReceipt(result)}
          >
            <Download size={16} />
            Descargar comprobante demo
          </button>
          <button
            className="subtle-link"
            onClick={() => {
              setStep("form");
              setAmount("");
              setConcept("");
              setResult(null);
            }}
          >
            Hacer otra transferencia
          </button>
        </div>
      </LocalizedTree>
    );

  return (
    <LocalizedTree>
      <div className="transfer-layout">
        <div className="transfer-form-area">
          <div className="step-indicator">
            <span className="active">1</span>
            <i />
            <span className={step !== "form" ? "active" : ""}>2</span>
            <i />
            <span className={step === "verify" ? "active" : ""}>3</span>
          </div>
          <h4>
            {step === "form"
              ? "¿A dónde vamos hoy?"
              : step === "review"
                ? "Todo claro antes de continuar."
                : "Un último paso, por seguridad."}
          </h4>
          <p className="panel-description">
            {step === "form"
              ? "Elige el destino de tu transferencia de prueba."
              : step === "review"
                ? "Revisa los datos de tu operación simulada."
                : "Ingresa el código que te enviamos para confirmar."}
          </p>
          {step === "form" ? (
            <form onSubmit={review} className="form-stack">
              <div className="form-segment">
                <button
                  className={!own ? "selected" : ""}
                  aria-pressed={!own}
                  type="button"
                  onClick={() => changeType(false)}
                >
                  A un beneficiario
                </button>
                <button
                  className={own ? "selected" : ""}
                  aria-pressed={own}
                  type="button"
                  onClick={() => changeType(true)}
                >
                  Entre mis cuentas
                </button>
              </div>
              <label>
                Cuenta de origen
                <select
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    if (own)
                      setTo(
                        accounts.find(
                          (account) => account.id !== event.target.value,
                        )!.id,
                      );
                  }}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {money(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {own ? "Cuenta de destino" : "Beneficiario"}
                <select
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Selecciona un destino
                  </option>
                  {own
                    ? accounts
                        .filter((account) => account.id !== from)
                        .map((account) => (
                          <option value={account.id} key={account.id}>
                            {account.name} · {account.number}
                          </option>
                        ))
                    : beneficiaries.map((beneficiary) => (
                        <option key={beneficiary.id} value={beneficiary.id}>
                          {beneficiary.name} · {beneficiary.account.slice(-4)}
                        </option>
                      ))}
                </select>
              </label>
              {!own && (
                <button
                  className="subtle-link align-start"
                  type="button"
                  onClick={onBeneficiaries}
                >
                  <Plus size={14} />
                  Agregar un beneficiario
                </button>
              )}
              <label>
                Importe en MXN
                <div className="currency-input">
                  <span>$</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={Math.min(50000, source.balance / 100)}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <span>MXN</span>
                </div>
              </label>
              <label>
                Concepto
                <input
                  value={concept}
                  onChange={(event) => setConcept(event.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="¿Para qué es esta transferencia?"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-primary" type="submit">
                Revisar transferencia
                <ArrowRight size={17} />
              </button>
              <p className="form-note">
                Límite de prueba: $50,000.00 MXN por operación.
              </p>
            </form>
          ) : (
            <>
              <dl className="review-details">
                <div>
                  <dt>Desde</dt>
                  <dd>{source.name}</dd>
                </div>
                <div>
                  <dt>Para</dt>
                  <dd>{destinationName}</dd>
                </div>
                <div>
                  <dt>Importe</dt>
                  <dd className="review-total">{money(cents)} MXN</dd>
                </div>
                <div>
                  <dt>Concepto</dt>
                  <dd>{concept.trim()}</dd>
                </div>
                <div>
                  <dt>Comisión de prueba</dt>
                  <dd>$0.00 MXN</dd>
                </div>
              </dl>
              {step === "review" ? (
                <div className="form-stack">
                  <button
                    className="button button-primary"
                    onClick={() => {
                      setError("");
                      setStep("verify");
                    }}
                  >
                    Continuar a verificación
                    <ShieldCheck size={17} />
                  </button>
                  <button
                    className="back-link centered"
                    onClick={() => setStep("form")}
                  >
                    <ArrowLeft size={15} />
                    Editar datos
                  </button>
                </div>
              ) : (
                <>
                  <StepUpPanel
                    api={stepUpApi}
                    action={own ? "OWN_TRANSFER" : "TPT_TRANSFER"}
                    payload={stepUpPayload}
                    submitLabel={
                      segment === "empresas"
                        ? "Enviar a segunda firma"
                        : "Confirmar transferencia demo"
                    }
                    onVerified={finish}
                    onNotRequired={finish}
                    onBack={() => {
                      setStep("review");
                      setError("");
                    }}
                  />
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <aside className="transfer-aside">
          <ShieldCheck size={30} />
          <h4>
            Tu tranquilidad
            <br />
            va primero.
          </h4>
          <p>
            Revisa siempre el destino y el importe antes de confirmar una
            operación.
          </p>
          {segment === "empresas" && (
            <div className="business-notice">
              <Users size={20} />
              <strong>Dos firmas. Más control.</strong>
              <p>
                Las transferencias empresariales requieren una segunda
                aprobación en esta demo.
              </p>
            </div>
          )}
          <span>
            <LockKeyhole size={13} />
            Entorno de demostración
          </span>
        </aside>
      </div>
    </LocalizedTree>
  );
}

function BeneficiariesPanel({
  beneficiaries,
  onChange,
}: {
  beneficiaries: Beneficiary[];
  onChange: (beneficiaries: Beneficiary[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  function add(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Ingresa un nombre de al menos 2 caracteres.");
      return;
    }
    if (!/^\d{18}$/.test(account)) {
      setError("La cuenta de prueba debe tener exactamente 18 dígitos.");
      return;
    }
    if (beneficiaries.some((beneficiary) => beneficiary.account === account)) {
      setError("Esta cuenta ya está en tus beneficiarios.");
      return;
    }
    onChange([
      ...beneficiaries,
      { id: `beneficiary-${Date.now()}`, name: name.trim(), account },
    ]);
    setAdding(false);
    setName("");
    setAccount("");
    setError("");
    setNotice("Beneficiario de prueba agregado correctamente.");
  }
  return (
    <LocalizedTree>
      <div className="beneficiaries-panel">
        <div className="panel-title-row">
          <p>Las personas que forman parte de tus planes.</p>
          <button
            className="button button-primary button-small"
            onClick={() => setAdding(!adding)}
          >
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? "Cancelar" : "Agregar beneficiario"}
          </button>
        </div>
        {adding && (
          <form onSubmit={add} className="form-stack beneficiary-form">
            <h4>Un nuevo destino.</h4>
            <label>
              Nombre del beneficiario de prueba
              <input
                required
                minLength={2}
                maxLength={50}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre y apellido ficticios"
                autoComplete="off"
              />
            </label>
            <label>
              Cuenta de prueba (18 dígitos)
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{18}"
                maxLength={18}
                value={account}
                onChange={(event) =>
                  setAccount(event.target.value.replace(/\D/g, ""))
                }
                placeholder="000000000000000001"
                autoComplete="off"
              />
            </label>
            <p className="form-note">
              Usa únicamente datos ficticios. La cuenta no se verifica con
              ninguna institución.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button button-primary">
              Guardar beneficiario
              <Check size={16} />
            </button>
          </form>
        )}
        {notice && (
          <p className="inline-notice" role="status">
            <Check size={15} />
            {notice}
          </p>
        )}
        <ul className="beneficiary-list">
          {beneficiaries.map((beneficiary) => (
            <li key={beneficiary.id}>
              <span className="person-avatar">
                {beneficiary.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                <strong>{beneficiary.name}</strong>
                <small>Cuenta demo · {beneficiary.account.slice(-4)}</small>
              </span>
              {deleting === beneficiary.id ? (
                <div className="delete-confirm">
                  <span>¿Eliminar?</span>
                  <button
                    className="subtle-link"
                    onClick={() => {
                      onChange(
                        beneficiaries.filter(
                          (item) => item.id !== beneficiary.id,
                        ),
                      );
                      setDeleting(null);
                      setNotice("Beneficiario eliminado de la demo.");
                    }}
                  >
                    Sí
                  </button>
                  <button
                    className="subtle-link"
                    onClick={() => setDeleting(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="icon-button"
                  aria-label={translateWith("Eliminar a {name}", {
                    name: beneficiary.name,
                  })}
                  onClick={() => setDeleting(beneficiary.id)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!beneficiaries.length && (
          <div className="empty-state">
            <Users size={30} />
            <h4>Tu lista comienza aquí.</h4>
            <p>
              Agrega un beneficiario de prueba para simular una transferencia.
            </p>
          </div>
        )}
      </div>
    </LocalizedTree>
  );
}

export default function DemoBank({
  segment,
  initialView,
  onClose,
  onTimeout,
}: {
  segment: Segment;
  initialView: BankView;
  onClose: () => void;
  onTimeout: () => void;
}) {
  const { locale } = useI18n();
  const [view, setView] = useState<BankView>(initialView);
  // Changes the key of the history, so it is read again after the authenticator changed.
  const [historyVersion, setHistoryVersion] = useState(0);
  const [accounts, setAccounts] = useState(() => getAccounts(segment));
  const [transactions, setTransactions] = useState(() =>
    getTransactions(segment),
  );
  const [beneficiaries, setBeneficiaries] =
    useState<Beneficiary[]>(initialBeneficiaries);
  const [approvals, setApprovals] = useState<Transfer[]>([]);
  const [hidden, setHidden] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [pockets, setPockets] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalCode, setApprovalCode] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Ending the demo session also forgets the demo step-up state (attempts, lock-out).
  useEffect(() => resetDemoStepUpApi, []);

  // Signing in to the demo is the first entry of this session's demo activity history; ending the
  // session forgets it (the next one starts again with the older demo history).
  useEffect(() => {
    recordDemoActivity("LOGIN");
    return resetDemoActivity;
  }, []);

  /** The beneficiaries panel hands over the whole new list: work out what was added or removed. */
  function changeBeneficiaries(next: Beneficiary[]) {
    const known = new Set(beneficiaries.map((item) => item.id));
    const kept = new Set(next.map((item) => item.id));
    next
      .filter((item) => !known.has(item.id))
      .forEach((item) => recordDemoActivity("BENEFICIARY_ADDED", { name: item.name }));
    beneficiaries
      .filter((item) => !kept.has(item.id))
      .forEach((item) => recordDemoActivity("BENEFICIARY_DELETED", { name: item.name }));
    setBeneficiaries(next);
  }

  /** A transfer that really went through (not one that still waits for the second signature). */
  function recordTransfer(transfer: Transfer) {
    recordDemoActivity("TRANSFER_CONFIRMED", {
      amount: (transfer.amount / 100).toFixed(2),
      currency: "MXN",
      toName: transfer.toName,
    });
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onTimeoutRef.current(), 10 * 60 * 1000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, []);

  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const pending = approvals.filter(
    (transfer) => transfer.status === "pending",
  ).length;
  const activity = useMemo(
    () =>
      transactions.filter((transaction) => {
        const matchesAccount =
          selectedAccount === "all" ||
          transaction.accountId === selectedAccount;
        const matchesType =
          filter === "all" ||
          (filter === "in" ? transaction.amount > 0 : transaction.amount < 0);
        const normalize = (value: string) =>
          value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        return (
          matchesAccount &&
          matchesType &&
          normalize(
            translate(transaction.description, locale) +
              transactionDetail(transaction),
          ).includes(normalize(search))
        );
      }),
    [transactions, selectedAccount, filter, search, locale],
  );

  function execute(transfer: Transfer): boolean {
    if (
      (accounts.find((account) => account.id === transfer.from)?.balance ?? 0) <
      transfer.amount
    )
      return false;
    setAccounts((current) =>
      current.map((account) => ({
        ...account,
        balance:
          account.balance -
          (account.id === transfer.from ? transfer.amount : 0) +
          (transfer.own && account.id === transfer.to ? transfer.amount : 0),
      })),
    );
    const debit: Transaction = {
      id: `${transfer.id}-out`,
      date: transfer.date,
      description: transfer.concept,
      detail: "Para {name}",
      counterparty: transfer.toName,
      amount: -transfer.amount,
      accountId: transfer.from,
    };
    const newTransactions: Transaction[] = [debit];
    if (transfer.own)
      newTransactions.push({
        ...debit,
        id: `${transfer.id}-in`,
        detail: "Transferencia entre mis cuentas",
        amount: transfer.amount,
        accountId: transfer.to,
      });
    setTransactions((current) => [...newTransactions, ...current]);
    return true;
  }

  function completeTransfer(draft: TransferDraft): Transfer | null {
    const transfer: Transfer = {
      ...draft,
      id: `AVT-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      status: segment === "empresas" ? "pending" : "approved",
    };
    if (segment === "empresas")
      setApprovals((current) => [transfer, ...current]);
    else if (!execute(transfer)) return null;
    else recordTransfer(transfer);
    return transfer;
  }

  function approve(event: FormEvent) {
    event.preventDefault();
    if (approvalCode !== "654321") {
      setApprovalError(
        "Para la segunda firma de prueba utiliza el código 654321.",
      );
      return;
    }
    const transfer = approvals.find(
      (item) => item.id === approvalId && item.status === "pending",
    );
    if (!transfer) return;
    if (!execute(transfer)) {
      setApprovalError(
        "El saldo ya no es suficiente para aprobar esta transferencia.",
      );
      return;
    }
    recordTransfer(transfer);
    setApprovals((current) =>
      current.map((item) =>
        item.id === approvalId ? { ...item, status: "approved" } : item,
      ),
    );
    setApprovalId(null);
    setApprovalCode("");
    setApprovalError("");
    setNotice(
      "Segunda firma confirmada. Transferencia simulada correctamente.",
    );
  }

  const navigation = [
    { id: "overview" as const, label: "Mi resumen", icon: House },
    { id: "transfer" as const, label: "Transferir", icon: ArrowUpRight },
    { id: "activity" as const, label: "Movimientos", icon: ListFilter },
    { id: "beneficiaries" as const, label: "Beneficiarios", icon: Users },
    { id: "security" as const, label: "Actividad de seguridad", icon: ShieldCheck },
    ...(segment === "empresas"
      ? [{ id: "approvals" as const, label: "Aprobaciones", icon: FileClock }]
      : []),
  ];

  function navigate(next: BankView) {
    setView(next);
    setNotice("");
    setSupport(false);
  }

  return (
    <LocalizedTree>
      <div className="bank-app">
        <aside className="bank-sidebar">
          <Brand compact />
          <span className="bank-segment-label">
            {segment === "empresas" ? "BANCA EMPRESARIAL" : "BANCA PERSONAL"}
          </span>
          <nav aria-label="Navegación de banca demo">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === "approvals" && pending > 0 && (
                  <b className="count-badge">{pending}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="bank-sidebar-bottom">
            <button
              className="bank-support"
              onClick={() => setSupport(!support)}
              aria-expanded={support}
            >
              <CircleHelp size={17} />
              Estamos de tu lado
            </button>
            <div className="bank-user">
              <span className="person-avatar">
                {segment === "empresas" ? "EN" : "ML"}
              </span>
              <span>
                <strong>
                  {segment === "empresas" ? "Estudio Norte" : "Mariana López"}
                </strong>
                <small>Perfil de demostración</small>
              </span>
              <button
                className="icon-button"
                aria-label="Cerrar sesión demo"
                onClick={onClose}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="bank-main">
          <div className="bank-demo-bar">
            <span>
              <i />
              Experiencia de demostración
            </span>
            <span>
              <LockKeyhole size={12} />
              Sin dinero real
            </span>
          </div>
          {support && (
            <div className="bank-support-panel">
              <CircleHelp size={20} />
              <div>
                <strong>Una persona, cuando la necesitas.</strong>
                <p>
                  Contacta a MIFOS al{" "}
                  <a href="tel:+524774614700">477 461 4700</a> o visita{" "}
                  <a
                    href="https://www.mifos.com.mx/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    el sitio oficial
                  </a>
                  . No compartas contraseñas ni códigos.
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar ayuda"
                onClick={() => setSupport(false)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="bank-page-heading">
            <div>
              <p>
                {view === "overview"
                  ? "TU SIGUIENTE PASO COMIENZA AQUÍ"
                  : "TU DINERO, BAJO TU CONTROL"}
              </p>
              <h3>
                {view === "overview"
                  ? segment === "empresas"
                    ? "Hola, Estudio Norte."
                    : "Hola, Mariana."
                  : {
                      transfer: "Mueve tus planes.",
                      activity: "Cada paso, en detalle.",
                      beneficiaries: "Tus personas de confianza.",
                      approvals: "Avancemos en equipo.",
                      security: "Lo que pasa en tu cuenta.",
                    }[view]}
              </h3>
            </div>
            <span className="bank-date">
              {new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {view === "overview" && (
                <>
                  <div className="total-balance">
                    <span>
                      Tu saldo total{" "}
                      <button
                        className="icon-button"
                        aria-label={
                          hidden ? "Mostrar saldos" : "Ocultar saldos"
                        }
                        onClick={() => setHidden(!hidden)}
                      >
                        {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                    <strong>
                      {hidden ? "••••••••" : money(total)}
                      <small>MXN</small>
                    </strong>
                    <p>Más claridad para lo que viene.</p>
                  </div>
                  <div className="account-grid">
                    {pocketsFirst(accounts, pockets).map((account) => (
                      <motion.div
                        key={account.id}
                        layout
                        className="account-card"
                      >
                        <button
                          className={`account-choice ${selectedAccount === account.id ? "selected" : ""}`}
                          aria-pressed={selectedAccount === account.id}
                          onClick={() =>
                            setSelectedAccount(
                              selectedAccount === account.id ? "all" : account.id,
                            )
                          }
                        >
                          <span className="account-choice-top">
                            <span>
                              {account.id === "daily" ? (
                                <Wallet size={18} />
                              ) : (
                                <Landmark size={18} />
                              )}
                              {account.name}
                            </span>
                            <ChevronRight size={16} />
                          </span>
                          <strong>
                            {hidden ? "••••••" : money(account.balance)}
                          </strong>
                          <small>Cuenta de prueba · {account.number}</small>
                        </button>
                        <button
                          className={`icon-button pocket-toggle ${pockets.includes(account.id) ? "active" : ""}`}
                          aria-pressed={pockets.includes(account.id)}
                          aria-label={translateWith(
                            "Fijar {name} como bolsillo",
                            { name: translate(account.name) },
                          )}
                          onClick={() =>
                            setPockets((current) =>
                              current.includes(account.id)
                                ? current.filter((id) => id !== account.id)
                                : [...current, account.id],
                            )
                          }
                        >
                          <Pin size={14} />
                          {pockets.includes(account.id) && (
                            <span>Bolsillo</span>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  <div className="bank-quick-actions">
                    <button
                      className="button button-primary"
                      onClick={() => navigate("transfer")}
                    >
                      <Send size={16} />
                      Hacer una transferencia
                    </button>
                    <button
                      className="button button-outline"
                      onClick={() => navigate("activity")}
                    >
                      Ver movimientos
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="activity-heading">
                    <h4>Lo más reciente</h4>
                    <button
                      className="subtle-link"
                      onClick={() => navigate("activity")}
                    >
                      Ver todos
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <TransactionList
                    transactions={transactions
                      .filter(
                        (transaction) =>
                          selectedAccount === "all" ||
                          transaction.accountId === selectedAccount,
                      )
                      .slice(0, 4)}
                    hidden={hidden}
                  />
                </>
              )}
              {view === "transfer" && (
                <TransferPanel
                  accounts={accounts}
                  beneficiaries={beneficiaries}
                  segment={segment}
                  onComplete={completeTransfer}
                  onActivity={() => {
                    setSelectedAccount("all");
                    setFilter("all");
                    setSearch("");
                    navigate("activity");
                  }}
                  onBeneficiaries={() => navigate("beneficiaries")}
                  onApprovals={() => navigate("approvals")}
                />
              )}
              {view === "activity" && (
                <>
                  <div className="activity-toolbar">
                    <label className="search-input">
                      <Search size={17} />
                      <span className="sr-only">Buscar movimientos</span>
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar un movimiento"
                      />
                    </label>
                    <label className="sr-only" htmlFor="activity-filter">
                      Tipo de movimiento
                    </label>
                    <select
                      id="activity-filter"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="all">Todos los movimientos</option>
                      <option value="in">Ingresos</option>
                      <option value="out">Egresos</option>
                    </select>
                    <button
                      className="button button-outline button-small"
                      onClick={() => exportTransactions(activity)}
                      disabled={!activity.length}
                    >
                      <Download size={15} />
                      CSV
                    </button>
                  </div>
                  <div className="account-filter">
                    <button
                      className={selectedAccount === "all" ? "active" : ""}
                      onClick={() => setSelectedAccount("all")}
                    >
                      Todas las cuentas
                    </button>
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        className={
                          selectedAccount === account.id ? "active" : ""
                        }
                        onClick={() => setSelectedAccount(account.id)}
                      >
                        {account.name}
                      </button>
                    ))}
                  </div>
                  <p className="results-count" role="status">
                    {activity.length}{" "}
                    {translate(
                      activity.length === 1
                        ? "movimiento de demostración"
                        : "movimientos de demostración",
                      locale,
                    )}
                  </p>
                  <TransactionList transactions={activity} />
                </>
              )}
              {view === "beneficiaries" && (
                <BeneficiariesPanel
                  beneficiaries={beneficiaries}
                  onChange={changeBeneficiaries}
                />
              )}
              {view === "security" && (
                <div className="security-view">
                  <AuthenticatorSection
                    onChanged={() => setHistoryVersion((version) => version + 1)}
                  />
                  {/* a new key reads the history again: pairing or removing shows up at once */}
                  <ActivityFeed key={historyVersion} />
                </div>
              )}
              {view === "approvals" && (
                <div className="approvals-panel">
                  <div className="demo-notice">
                    <Building2 size={20} />
                    <span>
                      Dos firmas, un mismo objetivo. Aquí puedes simular la
                      aprobación de un segundo firmante. Código de prueba:{" "}
                      <strong>654321</strong>.
                    </span>
                  </div>
                  {notice && (
                    <p className="inline-notice" role="status">
                      <Check size={16} />
                      {notice}
                    </p>
                  )}
                  {!approvals.length ? (
                    <div className="empty-state">
                      <CheckCheck size={32} />
                      <h4>Todo está al día.</h4>
                      <p>
                        Las nuevas transferencias empresariales aparecerán aquí
                        para su segunda firma.
                      </p>
                      <button
                        className="button button-primary"
                        onClick={() => navigate("transfer")}
                      >
                        Crear transferencia
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <ul className="approval-list">
                      {approvals.map((transfer) => (
                        <li key={transfer.id}>
                          <div className="approval-summary">
                            <span className="transaction-icon">
                              <FileClock size={19} />
                            </span>
                            <div>
                              <strong>{transfer.toName}</strong>
                              <small>
                                {transfer.concept} · {shortDate(transfer.date)}
                              </small>
                            </div>
                            <strong>{money(transfer.amount)}</strong>
                            <span
                              className={`approval-status ${transfer.status}`}
                            >
                              {transfer.status === "pending"
                                ? "Por aprobar"
                                : transfer.status === "approved"
                                  ? "Aprobada"
                                  : "Rechazada"}
                            </span>
                          </div>
                          {transfer.status === "pending" &&
                            (approvalId === transfer.id ? (
                              <form
                                className="approval-form form-stack"
                                onSubmit={approve}
                              >
                                <label>
                                  Código de segunda firma demo
                                  <input
                                    value={approvalCode}
                                    onChange={(event) =>
                                      setApprovalCode(
                                        event.target.value.replace(/\D/g, ""),
                                      )
                                    }
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    placeholder="654321"
                                    required
                                  />
                                </label>
                                {approvalError && (
                                  <p role="alert" className="form-error">
                                    {approvalError}
                                  </p>
                                )}
                                <div className="approval-actions">
                                  <button
                                    className="button button-primary button-small"
                                    type="submit"
                                  >
                                    Confirmar segunda firma
                                    <Check size={16} />
                                  </button>
                                  <button
                                    className="subtle-link"
                                    type="button"
                                    onClick={() => {
                                      setApprovalId(null);
                                      setApprovalCode("");
                                      setApprovalError("");
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="approval-actions">
                                <button
                                  className="button button-primary button-small"
                                  onClick={() => {
                                    setApprovalId(transfer.id);
                                    setApprovalCode("");
                                    setApprovalError("");
                                  }}
                                >
                                  Simular segunda firma
                                  <ShieldCheck size={15} />
                                </button>
                                <button
                                  className="subtle-link"
                                  onClick={() => {
                                    setApprovals((current) =>
                                      current.map((item) =>
                                        item.id === transfer.id
                                          ? { ...item, status: "rejected" }
                                          : item,
                                      ),
                                    );
                                    setNotice(
                                      "Operación rechazada. Tu saldo no se modificó.",
                                    );
                                  }}
                                >
                                  Rechazar
                                </button>
                              </div>
                            ))}
                          {transfer.status === "approved" && (
                            <button
                              className="subtle-link receipt-link"
                              onClick={() => transferReceipt(transfer)}
                            >
                              <Download size={14} />
                              Comprobante demo
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="bank-disclaimer">
            <Info size={13} />
            Todos los datos son ficticios. La sesión se cierra tras 10 minutos
            de inactividad.
          </p>
        </div>
      </div>
    </LocalizedTree>
  );
}

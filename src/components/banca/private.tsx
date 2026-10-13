import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  CircleHelp,
  FilePlus2,
  Home,
  Info,
  LockKeyhole,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACTIVATION_MS,
  capFor,
  dailyUsedNow,
  formatMoney,
  formatWhen,
  isBeneficiaryActive,
  maskAccount,
  NAV,
  passwordIssues,
  REAL_ACTIVATION_LABEL,
  SCREEN_TITLE,
  SECOND_SIGN_AT,
  type Receipt,
  type Screen,
} from "@/lib/banca/model";
import { useBanca, useSessionUser } from "@/lib/banca/store";
import { useAskOtp } from "@/components/banca/otp";
import { TermsBody } from "@/components/banca/public";
import { Button, Field, inputClass, Mark, Modal, Panel } from "@/components/banca/ui";

const ICONS: Record<string, typeof Home> = {
  dashboard: Home,
  transfer: ArrowLeftRight,
  movements: ScrollText,
  approvals: ShieldCheck,
  request: FilePlus2,
  settings: Settings,
  audit: ScrollText,
  notices: Bell,
  about: Info,
  help: CircleHelp,
};

export function AppShell() {
  const screen = useBanca((state) => state.screen);
  const go = useBanca((state) => state.go);
  const endSession = useBanca((state) => state.endSession);
  const touch = useBanca((state) => state.touch);
  const user = useSessionUser();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const expires = useBanca((state) => state.sessionExpiresAt);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, (expires ?? now) - now);
  const warn = Boolean(expires && remaining > 0 && remaining < 60_000);

  useEffect(() => {
    if (warn) return;
    const bump = () => touch();
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [touch, warn]);

  if (!user) return null;
  const unread = user.notices.filter((notice) => !notice.read).length;
  const pendingCount = user.pending.filter((item) => item.status === "pendiente_segunda_firma").length;
  const items = NAV.filter((item) => !item.empresasOnly || user.segment === "empresas");

  function navigate(next: Screen) {
    go(next);
    setOpen(false);
    if (next === "notices") useBanca.getState().markNoticesRead();
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-1 bg-brand" />
      <div className="flex min-h-[calc(100vh-4px)]">
        <aside className="hidden w-64 shrink-0 flex-col bg-ink text-on-ink md:flex">
          <SidebarBody
            name={user.displayName}
            role={user.roleLabel}
            items={items}
            screen={screen}
            unread={unread}
            pendingCount={pendingCount}
            onNavigate={navigate}
            onLogout={() => {
              endSession("voluntario");
              toast("Sesión cerrada.");
            }}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-on-ink">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-md p-2 md:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
                <Menu className="size-5" />
              </button>
              <h1 className="text-sm font-semibold tracking-wide">{SCREEN_TITLE[screen]}</h1>
            </div>
            <p className="num text-xs text-on-ink/75">Sesión {formatClock(remaining)}</p>
          </header>
          <p className="border-b border-line bg-card px-4 py-2 text-xs text-muted">
            Prototipo de demostración. No está conectado al núcleo de Mifos y no mueve dinero real.
          </p>
          <div className="flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-5xl">
              {screen === "dashboard" ? <Dashboard /> : null}
              {screen === "transfer" ? <Transfer /> : null}
              {screen === "movements" ? <Movements /> : null}
              {screen === "approvals" ? <Approvals /> : null}
              {screen === "request" ? <RequestProduct /> : null}
              {screen === "settings" ? <SettingsView /> : null}
              {screen === "audit" ? <AuditView /> : null}
              {screen === "notices" ? <Notices /> : null}
              {screen === "about" ? <About /> : null}
              {screen === "help" ? <Help /> : null}
            </div>
          </div>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/60 md:hidden" onClick={() => setOpen(false)}>
          <div className="flex h-full w-72 flex-col bg-ink text-on-ink" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="self-end p-4" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
            <SidebarBody
              name={user.displayName}
              role={user.roleLabel}
              items={items}
              screen={screen}
              unread={unread}
              pendingCount={pendingCount}
              onNavigate={navigate}
              onLogout={() => endSession("voluntario")}
            />
          </div>
        </div>
      ) : null}
      {warn ? (
        <Modal
          title="La sesión está por cerrarse"
          onClose={() => touch()}
          footer={<Button onClick={() => touch()}>Continuar</Button>}
        >
          <p className="text-sm text-muted">
            Por inactividad, Banca Web se cerrará en {formatClock(remaining)}. Elija continuar si sigue en el canal.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function SidebarBody({
  name,
  role,
  items,
  screen,
  unread,
  pendingCount,
  onNavigate,
  onLogout,
}: {
  name: string;
  role: string;
  items: typeof NAV;
  screen: Screen;
  unread: number;
  pendingCount: number;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="border-b border-on-ink/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <Mark className="size-9" />
          <div>
            <p className="text-sm font-bold">MIFOS</p>
            <p className="text-xs text-on-ink/65">Banca Web</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium leading-snug">Hola, {name}</p>
        <p className="mt-1 text-xs text-on-ink/65">{role}</p>
      </div>
      <nav className="flex-1 overflow-auto py-2">
        {items.map((item) => {
          const Icon = ICONS[item.screen] ?? Home;
          const badge = item.screen === "notices" ? unread : item.screen === "approvals" ? pendingCount : 0;
          const active = screen === item.screen;
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className={
                active
                  ? "flex w-full items-center gap-3 border-l-4 border-brand bg-on-ink/10 px-4 py-3 text-left text-sm"
                  : "flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left text-sm text-on-ink/80 hover:bg-on-ink/5"
              }
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? (
                <span className="num rounded-full bg-brand px-2 py-0.5 text-xs text-on-brand">{badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <button type="button" onClick={onLogout} className="flex items-center gap-3 px-4 py-4 text-left text-sm text-on-ink/80">
        <LogOut className="size-4" />
        Cerrar sesión
      </button>
    </>
  );
}

function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Dashboard() {
  const user = useSessionUser();
  const go = useBanca((state) => state.go);
  if (!user) return null;
  const balance = user.accounts.reduce((sum, account) => sum + account.balance, 0);
  const used = dailyUsedNow(user);
  const recent = user.movements.slice(0, 4);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Último ingreso: {formatWhen(user.previousLogin)} · Banca Web</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Productos contratados" value={String(user.accounts.length)} />
        <Stat label="Cuentas de crédito" value="0" />
        <Stat label={user.segment === "empresas" ? "Cuentas empresariales" : "Cuentas de captación"} value={String(user.accounts.length)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Resumen de crédito" value={formatMoney(0)} />
        <Stat label="Resumen de captación" value={formatMoney(balance)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Cuentas" action={<Button size="sm" variant="ghost" onClick={() => go("transfer")}>Transferir</Button>}>
          <div className="space-y-3">
            {user.accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold">{account.alias}</p>
                  <p className="text-xs text-muted">{account.product}</p>
                  <p className="num text-xs text-muted">{account.number}</p>
                </div>
                <p className="num text-lg font-semibold">{formatMoney(account.balance)}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Límites de hoy">
          <p className="text-sm text-muted">Disponible</p>
          <p className="num text-2xl font-semibold">{formatMoney(Math.max(user.dailyLimit - used, 0))}</p>
          <p className="mt-2 text-xs text-muted">
            Tope diario {formatMoney(user.dailyLimit)} · por operación {formatMoney(user.perOpLimit)}
          </p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => go("settings")}>
            Ajustar límites
          </Button>
        </Panel>
      </div>
      {user.segment === "empresas" ? (
        <Panel title="Personas facultadas">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Captura y autoriza hasta {formatMoney(SECOND_SIGN_AT)}</p>
              <p className="font-semibold">María Elena Ríos Campos</p>
            </div>
            <div>
              <p className="text-xs text-muted">Autoriza montos superiores</p>
              <p className="font-semibold">{user.signerName}</p>
            </div>
          </div>
          {user.pending.some((item) => item.status === "pendiente_segunda_firma") ? (
            <Button className="mt-4" onClick={() => go("approvals")}>
              Revisar autorizaciones
            </Button>
          ) : null}
        </Panel>
      ) : null}
      <Panel title="Últimos movimientos" action={<Button size="sm" variant="quiet" onClick={() => go("movements")}>Ver todos</Button>}>
        {recent.length === 0 ? <p className="text-sm text-muted">Aún no hay movimientos.</p> : null}
        <ul className="space-y-3">
          {recent.map((movement) => (
            <li key={movement.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{movement.concept}</p>
                <p className="text-xs text-muted">{formatWhen(movement.at)}</p>
              </div>
              <p className={movement.direction === "cargo" ? "num font-semibold text-brand" : "num font-semibold"}>
                {movement.direction === "cargo" ? "−" : "+"}
                {formatMoney(movement.amount)}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="num mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function Transfer() {
  const user = useSessionUser();
  const transfer = useBanca((state) => state.transfer);
  const addBeneficiary = useBanca((state) => state.addBeneficiary);
  const removeBeneficiary = useBanca((state) => state.removeBeneficiary);
  const ask = useAskOtp();
  const [originId, setOriginId] = useState(user?.accounts[0]?.id ?? "");
  const [selected, setSelected] = useState<string>("");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("500.00");
  const [reference, setReference] = useState("1234");
  const [concept, setConcept] = useState("PRESTAMO");
  const [benefOpen, setBenefOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [draft, setDraft] = useState({ name: "", account: "", alias: "", limit: "15000" });

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const destinations = useMemo(() => {
    if (!user) return [];
    const own = user.accounts
      .filter((account) => account.id !== originId)
      .map((account) => ({
        id: `own-${account.id}`,
        name: "Cuenta propia",
        account: account.number,
        alias: account.alias,
        own: true,
        activatesAt: 0,
        limit: user.perOpLimit,
      }));
    const third = user.beneficiaries.map((item) => ({ ...item, own: false }));
    return [...own, ...third].filter((item) => {
      const hay = `${item.name} ${item.alias} ${item.account}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [user, originId, query]);

  useEffect(() => {
    if (!selected && destinations[0]) setSelected(destinations[0].id);
  }, [destinations, selected]);

  if (!user) return null;
  const current = destinations.find((item) => item.id === selected) ?? destinations[0];

  function confirmTransfer() {
    if (!current) {
      toast.error("Seleccione una cuenta destino.");
      return;
    }
    if (!current.own && !isBeneficiaryActive(current, tick)) {
      toast.error("Ese beneficiario sigue en periodo de activación.");
      return;
    }
    ask(() => {
      const result = transfer({
        fromAccountId: originId,
        beneficiaryName: current.name,
        beneficiaryAccount: current.account,
        own: current.own,
        amount: Number(amount),
        concept,
        reference,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.receipt) setReceipt(result.receipt);
    });
  }

  function saveBenef(event: FormEvent) {
    event.preventDefault();
    ask(() => {
      const result = addBeneficiary({
        name: draft.name,
        account: draft.account,
        alias: draft.alias,
        limit: Number(draft.limit),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBenefOpen(false);
      setDraft({ name: "", account: "", alias: "", limit: String(user?.perOpLimit ?? 15000) });
      toast.success("Beneficiario registrado. Aún no puede recibir fondos.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {user.accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => {
              setOriginId(account.id);
              setSelected("");
            }}
            className={
              originId === account.id
                ? "min-w-56 rounded-lg border-2 border-brand bg-card p-4 text-left"
                : "min-w-56 rounded-lg border border-line bg-card p-4 text-left"
            }
          >
            <p className="text-xs text-muted">MIFOS</p>
            <p className="num text-xl font-semibold">{formatMoney(account.balance)}</p>
            <p className="mt-1 text-xs text-muted">{account.alias}</p>
            <p className="num text-xs">Cta. {account.number}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Cuenta destino"
          action={
            <Button size="sm" variant="ghost" onClick={() => setBenefOpen(true)}>
              Agregar
            </Button>
          }
        >
          <input
            className={inputClass}
            placeholder="Buscar beneficiario"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 space-y-2">
            {destinations.length === 0 ? <p className="text-sm text-muted">No hay destinos con ese criterio.</p> : null}
            {destinations.map((item) => {
              const active = item.own || isBeneficiaryActive(item, tick);
              const left = Math.max(0, item.activatesAt - tick);
              return (
                <div
                  key={item.id}
                  className={
                    current?.id === item.id
                      ? "rounded-md border border-brand bg-paper p-3"
                      : "rounded-md border border-transparent p-3 hover:bg-paper"
                  }
                >
                  <button type="button" className="w-full text-left" onClick={() => setSelected(item.id)}>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.alias} · {item.account}
                    </p>
                    {!active ? (
                      <p className="mt-1 text-xs text-brand">
                        Activo en {formatClock(left)} · en producción el plazo es de {REAL_ACTIVATION_LABEL}
                      </p>
                    ) : null}
                  </button>
                  {!item.own ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-muted underline"
                      onClick={() =>
                        ask(() => {
                          const result = removeBeneficiary(item.id);
                          if (!result.ok) toast.error(result.error);
                          else {
                            if (selected === item.id) setSelected("");
                            toast.success("Beneficiario dado de baja.");
                          }
                        })
                      }
                    >
                      Dar de baja
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Transferir">
          {current ? (
            <p className="mb-3 text-sm text-muted">
              Beneficiario: <strong className="text-ink">{current.name}</strong> ({current.account})
            </p>
          ) : null}
          <div className="space-y-3">
            <Field label="Monto">
              <input className={inputClass} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </Field>
            <Field label="Referencia" hint="Numérica, hasta 7 dígitos.">
              <input className={inputClass} inputMode="numeric" value={reference} onChange={(event) => setReference(event.target.value.replace(/\D/g, "").slice(0, 7))} />
            </Field>
            <Field label="Concepto">
              <input className={inputClass} maxLength={40} value={concept} onChange={(event) => setConcept(event.target.value)} />
            </Field>
            <p className="text-xs text-muted">
              Comisión por transferencia entre cuentas Mifos: {formatMoney(0)}. Se mostrará de nuevo en el comprobante.
              {user.segment === "empresas" ? ` Arriba de ${formatMoney(SECOND_SIGN_AT)} a terceros queda pendiente de segunda firma.` : ""}
            </p>
            <Button className="w-full" onClick={confirmTransfer}>
              Confirmar
            </Button>
          </div>
        </Panel>
      </div>
      {benefOpen ? (
        <Modal title="Agregar beneficiario" onClose={() => setBenefOpen(false)}>
          <form action="javascript:void(0)" className="space-y-3" onSubmit={saveBenef}>
            <Field label="Cuenta Mifos" hint="11 dígitos. Otros bancos, vía SPEI, no están en este prototipo.">
              <input className={inputClass} inputMode="numeric" value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value.replace(/\D/g, "").slice(0, 11) })} />
            </Field>
            <Field label="Nombre del beneficiario">
              <input className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Alias">
              <input className={inputClass} value={draft.alias} onChange={(event) => setDraft({ ...draft, alias: event.target.value })} />
            </Field>
            <Field label="Límite de transferencia">
              <input className={inputClass} inputMode="decimal" value={draft.limit} onChange={(event) => setDraft({ ...draft, limit: event.target.value })} />
            </Field>
            <p className="text-xs text-muted">
              Después de la clave dinámica el alta espera {Math.round(ACTIVATION_MS / 1000)} segundos en este prototipo, que
              representan el plazo real de {REAL_ACTIVATION_LABEL}.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBenefOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {receipt ? <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} /> : null}
    </div>
  );
}

export function ReceiptDialog({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const go = useBanca((state) => state.go);
  function download() {
    const text = [
      "MIFOS · Banca Web",
      "Comprobante de operación",
      `Fecha: ${formatWhen(receipt.at)}`,
      `Importe: ${formatMoney(receipt.amount)}`,
      `Comisión: ${formatMoney(receipt.commission)}`,
      `Estado: ${receipt.kind === "aplicada" ? "Aplicada" : "Pendiente de segunda firma"}`,
      `Cuenta origen: ${maskAccount(receipt.originMask)}`,
      `Beneficiario: ${receipt.beneficiary}`,
      `Cuenta destino: ${maskAccount(receipt.destMask)}`,
      `Concepto: ${receipt.concept}`,
      `Referencia: ${receipt.reference}`,
      `Número de movimiento: ${receipt.folio}`,
      "Prototipo de demostración. No es un comprobante fiscal ni una operación real.",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comprobante-${receipt.folio}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal
      title={receipt.kind === "aplicada" ? "Transferencia exitosa" : "Pendiente de autorización"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={download}>
            Descargar
          </Button>
          <Button
            onClick={() => {
              onClose();
              go(receipt.kind === "pendiente" ? "approvals" : "movements");
            }}
          >
            Aceptar
          </Button>
        </>
      }
    >
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border border-ink text-xl font-semibold">
          {receipt.kind === "aplicada" ? "✓" : "…"}
        </div>
        <p className="text-xs text-muted">{formatWhen(receipt.at)}</p>
        <p className="num mt-1 text-3xl font-semibold">{formatMoney(receipt.amount)}</p>
        <p className="mt-1 text-xs text-muted">Esta transferencia no genera comisión</p>
      </div>
      <dl className="mt-4 space-y-1 rounded-md bg-paper p-3 text-sm">
        <Row k="Cuenta origen" v={maskAccount(receipt.originMask)} />
        <Row k="Beneficiario" v={receipt.beneficiary} />
        <Row k="Cuenta destino" v={maskAccount(receipt.destMask)} />
        <Row k="Concepto" v={receipt.concept} />
        <Row k="Referencia" v={receipt.reference} />
        <Row k="Número de movimiento" v={receipt.folio} />
      </dl>
    </Modal>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function Movements() {
  const user = useSessionUser();
  const [accountId, setAccountId] = useState("all");
  if (!user) return null;
  const rows = user.movements.filter((movement) => accountId === "all" || movement.accountId === accountId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={accountId === "all"} onClick={() => setAccountId("all")}>
          Todas
        </FilterChip>
        {user.accounts.map((account) => (
          <FilterChip key={account.id} active={accountId === account.id} onClick={() => setAccountId(account.id)}>
            {account.alias}
          </FilterChip>
        ))}
      </div>
      {rows.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted">No hay movimientos en esta cuenta.</p>
        </Panel>
      ) : null}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink text-xs tracking-wide text-on-ink uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Folio</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((movement) => (
              <tr key={movement.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{movement.concept}</p>
                  <p className="text-xs text-muted">{movement.counterparty ?? user.accounts.find((account) => account.id === movement.accountId)?.alias}</p>
                </td>
                <td className={movement.direction === "cargo" ? "num px-4 py-3 text-brand" : "num px-4 py-3"}>
                  {movement.direction === "cargo" ? "−" : "+"}
                  {formatMoney(movement.amount)}
                </td>
                <td className="num px-4 py-3">{formatMoney(movement.balanceAfter)}</td>
                <td className="num px-4 py-3">{movement.folio}</td>
                <td className="px-4 py-3 text-muted">{formatWhen(movement.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((movement) => (
          <article key={movement.id} className="rounded-lg border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{movement.concept}</p>
                <p className="text-xs text-muted">{formatWhen(movement.at)}</p>
              </div>
              <p className={movement.direction === "cargo" ? "num font-semibold text-brand" : "num font-semibold"}>
                {movement.direction === "cargo" ? "−" : "+"}
                {formatMoney(movement.amount)}
              </p>
            </div>
            <p className="num mt-2 text-xs text-muted">
              Saldo {formatMoney(movement.balanceAfter)} · Folio {movement.folio}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "h-10 rounded-full bg-ink px-4 text-sm text-on-ink" : "h-10 rounded-full border border-line bg-card px-4 text-sm"}
    >
      {children}
    </button>
  );
}

function Approvals() {
  const user = useSessionUser();
  const resolvePending = useBanca((state) => state.resolvePending);
  const ask = useAskOtp();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  if (!user) return null;
  if (user.segment !== "empresas") {
    return <Panel><p className="text-sm text-muted">Las autorizaciones con segunda firma aplican al perfil empresarial.</p></Panel>;
  }
  const rows = user.pending;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Las transferencias a terceros mayores a {formatMoney(SECOND_SIGN_AT)} quedan capturadas hasta que el facultado
        autorizador ({user.signerName}) confirma con su clave dinámica.
      </p>
      {rows.length === 0 ? <Panel><p className="text-sm text-muted">No hay operaciones en bandeja.</p></Panel> : null}
      {rows.map((item) => (
        <Panel key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{item.status === "pendiente_segunda_firma" ? "Pendiente de segunda firma" : "Rechazada"}</p>
              <p className="num text-2xl font-semibold">{formatMoney(item.amount)}</p>
              <p className="mt-1 text-sm">{item.beneficiaryName}</p>
              <p className="text-xs text-muted">
                {item.concept} · Ref. {item.reference} · Folio {item.folio}
              </p>
              <p className="text-xs text-muted">{formatWhen(item.createdAt)}</p>
            </div>
            {item.status === "pendiente_segunda_firma" ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    ask(() => {
                      const result = resolvePending(item.id, false);
                      if (!result.ok) toast.error(result.error);
                      else toast("Operación rechazada. No hubo cargo.");
                    })
                  }
                >
                  Rechazar
                </Button>
                <Button
                  onClick={() =>
                    ask(() => {
                      const result = resolvePending(item.id, true);
                      if (!result.ok) toast.error(result.error);
                      else if (result.receipt) setReceipt(result.receipt);
                    })
                  }
                >
                  Autorizar
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      ))}
      {receipt ? <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} /> : null}
    </div>
  );
}

function RequestProduct() {
  const user = useSessionUser();
  const requestProduct = useBanca((state) => state.requestProduct);
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("12");
  if (!user) return null;
  const options =
    user.segment === "empresas"
      ? ["Crédito PyME", "Cuenta de inversión empresarial"]
      : ["Crédito personal", "Cuenta de inversión", "Pagaré Mifos"];

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = requestProduct({ product, amount: Number(amount), termMonths: Number(term) });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Solicitud recibida. Un asesor dará seguimiento. No es un contrato.");
    setAmount("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel title="Solicitar un producto">
        <form action="javascript:void(0)" className="space-y-3" onSubmit={submit}>
          <Field label="Producto">
            <select className={inputClass} value={product} onChange={(event) => setProduct(event.target.value)}>
              <option value="">Seleccione</option>
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Monto"
            hint={user.segment === "empresas" ? "Crédito PyME de referencia: desde $250,000 hasta $4,000,000, sujeto a análisis." : "Sujeto a evaluación. No es una oferta vinculante."}
          >
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Plazo en meses">
            <input className={inputClass} inputMode="numeric" value={term} onChange={(event) => setTerm(event.target.value.replace(/\D/g, "").slice(0, 3))} />
          </Field>
          <Button type="submit">Enviar solicitud</Button>
        </form>
      </Panel>
      <Panel title="Solicitudes de esta sesión">
        {user.requests.length === 0 ? <p className="text-sm text-muted">Todavía no envía solicitudes.</p> : null}
        <ul className="space-y-3">
          {user.requests.map((item) => (
            <li key={item.id} className="border-b border-line pb-3 text-sm last:border-0">
              <p className="font-semibold">{item.product}</p>
              <p className="num">{formatMoney(item.amount)} · {item.termMonths} meses</p>
              <p className="text-xs text-muted">Folio {item.folio} · {formatWhen(item.at)} · Recibida</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function SettingsView() {
  const user = useSessionUser();
  const changePassword = useBanca((state) => state.changePassword);
  const changeContact = useBanca((state) => state.changeContact);
  const updateLimits = useBanca((state) => state.updateLimits);
  const ask = useAskOtp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [daily, setDaily] = useState("");
  const [perOp, setPerOp] = useState("");
  const [passOk, setPassOk] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setPhone(user.phone);
    setDaily(String(user.dailyLimit));
    setPerOp(String(user.perOpLimit));
  }, [user]);

  if (!user) return null;
  const cap = capFor(user.segment);

  return (
    <div className="grid max-w-xl gap-4">
      <Panel title="Cambiar contraseña">
        <div className="space-y-3">
          <Field label="Contraseña actual">
            <input className={inputClass} type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </Field>
          <Field label="Nueva contraseña" hint="8 caracteres, mayúscula, minúscula, dígito y símbolo.">
            <input className={inputClass} type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
          </Field>
          <Field label="Confirmar nueva contraseña">
            <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </Field>
          <Button
            onClick={() => {
              const issues = passwordIssues(next, user.clientNumber);
              if (issues.length) {
                toast.error(`La nueva contraseña necesita ${issues.join(", ")}.`);
                return;
              }
              if (next !== confirm) {
                toast.error("Las contraseñas no coinciden.");
                return;
              }
              ask(() => {
                const result = changePassword(current, next);
                if (!result.ok) toast.error(result.error);
                else {
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                  setPassOk(true);
                }
              });
            }}
          >
            Cambiar contraseña
          </Button>
        </div>
      </Panel>
      <Panel title="Medios de aviso">
        <div className="space-y-3">
          <Field label="Correo">
            <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Button
            variant="ink"
            onClick={() =>
              ask(() => {
                const result = changeContact("email", email);
                if (!result.ok) toast.error(result.error);
                else toast.success("Correo actualizado. Revise el aviso en su bandeja.");
              })
            }
          >
            Guardar correo
          </Button>
          <Field label="Celular">
            <input className={inputClass} inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} />
          </Field>
          <Button
            variant="ink"
            onClick={() =>
              ask(() => {
                const result = changeContact("phone", phone);
                if (!result.ok) toast.error(result.error);
                else toast.success("Teléfono actualizado.");
              })
            }
          >
            Guardar teléfono
          </Button>
        </div>
      </Panel>
      <Panel title="Límites del canal">
        <div className="space-y-3">
          <Field label="Límite diario" hint={`Tope institucional ${formatMoney(cap)}. Bajarlo no pide clave; subirlo, sí.`}>
            <input className={inputClass} inputMode="decimal" value={daily} onChange={(event) => setDaily(event.target.value)} />
          </Field>
          <Field label="Límite por operación">
            <input className={inputClass} inputMode="decimal" value={perOp} onChange={(event) => setPerOp(event.target.value)} />
          </Field>
          <Button
            onClick={() => {
              const nextDaily = Number(daily);
              const nextOp = Number(perOp);
              const raises = nextDaily > user.dailyLimit || nextOp > user.perOpLimit;
              const run = () => {
                const result = updateLimits(nextDaily, nextOp);
                if (!result.ok) toast.error(result.error);
                else toast.success("Límites actualizados.");
              };
              if (raises) ask(run);
              else run();
            }}
          >
            Guardar límites
          </Button>
        </div>
      </Panel>
      {passOk ? (
        <Modal title="Cambio exitoso" onClose={() => setPassOk(false)} footer={<Button onClick={() => setPassOk(false)}>Aceptar</Button>}>
          <div className="text-center">
            <LockKeyhole className="mx-auto size-8 text-ink" />
            <p className="mt-3 text-sm">Su contraseña fue modificada. Úsela en el próximo ingreso.</p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function AuditView() {
  const user = useSessionUser();
  if (!user) return null;
  return (
    <Panel title="Bitácora del canal">
      <p className="mb-4 text-sm text-muted">
        Registro de accesos, bloqueos, cambios de seguridad y operaciones monetarias. Cada evento tiene folio.
      </p>
      <ul className="space-y-4">
        {user.audit.map((event) => (
          <li key={event.id} className="border-b border-line pb-4 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{event.event}</p>
              <p className="num text-xs text-muted">{event.folio}</p>
            </div>
            <p className="text-xs text-muted">{formatWhen(event.at)} · Banca Web</p>
            <p className="mt-1 text-sm">{event.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Notices() {
  const user = useSessionUser();
  if (!user) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Avisos simulados a los medios que usted registró: SMS y correo.</p>
      {user.notices.map((notice) => (
        <article key={notice.id} className="rounded-lg border border-line bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-brand">{notice.channel}</p>
            <p className="text-xs text-muted">{formatWhen(notice.at)}</p>
          </div>
          <h2 className="mt-1 font-semibold">{notice.title}</h2>
          <p className="mt-1 text-sm text-muted">{notice.body}</p>
        </article>
      ))}
    </div>
  );
}

function About() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Mifos">
        <div className="space-y-3 text-sm leading-relaxed text-muted">
          <p>
            COMPANY NAME , S.A. DE C.V., S.F.P. es una sociedad financiera popular fundada en 2007 por
            empresarios leoneses. Está autorizada, regulada y supervisada por la Comisión Nacional Bancaria y de
            Valores, y sus usuarios pueden acudir a la CONDUSEF.
          </p>
          <p>
            Capta ahorro del público y coloca crédito para la actividad productiva de su zona, al amparo de la Ley de
            Ahorro y Crédito Popular. No es una institución de banca múltiple y sus depósitos no están cubiertos por el
            IPAB: los protege el Fondo de Protección de Sociedades Financieras Populares hasta 25,000 UDIS por ahorrador.
          </p>
          <p>
            Banca Web adopta, como estándar de diseño de este canal, los controles de la banca electrónica previstos en
            la Circular Única de Bancos: identificador único, factores de autenticación, límites, sesión, comprobante y
            bitácora.
          </p>
        </div>
      </Panel>
      <Panel title="Dónde estamos">
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <Building2 className="mt-0.5 size-4 shrink-0" />
            <p>
              Matriz: Blvd. Paseo de los Insurgentes 301, Col. Los Paraísos, León, Guanajuato, C.P. 37328.
            </p>
          </div>
          <p>Sucursal Oriental: Blvd. Mariano Escobedo 2805, Col. Oriental, León, Gto., C.P. 37510.</p>
          <p className="font-semibold">477 461 4700</p>
          <p className="text-muted">avantthya.com.mx</p>
        </div>
      </Panel>
    </div>
  );
}

function Help() {
  const resetDemo = useBanca((state) => state.resetDemo);
  const [open, setOpen] = useState(0);
  const [terms, setTerms] = useState(false);
  const faqs = [
    {
      q: "Si sospecho que alguien conoce mi información, ¿puedo cambiar la contraseña?",
      a: "Sí, en cualquier momento, desde Ajustes. Le pediremos la contraseña actual y la clave dinámica. Conviene cambiarla al menos cada tres meses y no reutilizarla en otros sitios.",
    },
    {
      q: "¿Qué operaciones tiene este canal?",
      a: "Consulta de saldos y movimientos, transferencias entre cuentas propias y a terceros Mifos, alta de beneficiarios con periodo de activación, comprobantes y solicitud de productos. Las transferencias a otros bancos no están habilitadas en el prototipo.",
    },
    {
      q: "¿Por qué una transferencia pide otra clave?",
      a: "Entrar usa un factor que solo usted conoce. Mover dinero, dar de alta un beneficiario o subir límites pide además la clave dinámica de un solo uso, que en la operación real vive en su banca móvil.",
    },
    {
      q: "¿Dónde veo comisiones y aclaraciones?",
      a: "Antes de confirmar se informa la comisión, que en cuentas Mifos es de cero pesos. Para una aclaración acuda a la Unidad Especializada de Atención a Usuarios al 477 461 4700, o a CONDUSEF al 55 5340 0999 y 800 999 8080.",
    },
  ];
  return (
    <div className="space-y-3">
      {faqs.map((item, index) => (
        <div key={item.q} className="overflow-hidden rounded-lg border border-line bg-card">
          <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium" onClick={() => setOpen(open === index ? -1 : index)}>
            {item.q}
            <span className="text-muted">{open === index ? "–" : "+"}</span>
          </button>
          {open === index ? <p className="px-4 pb-4 text-sm text-muted">{item.a}</p> : null}
        </div>
      ))}
      <Panel title="Controles del canal">
        <ul className="space-y-2 text-sm text-muted">
          <li>Identificador único y contraseña para abrir sesión.</li>
          <li>Clave dinámica en transferencias, beneficiarios, medios de aviso, contraseña e incremento de límites.</li>
          <li>Cierre automático a los 5 minutos y bloqueo de 10 minutos tras 3 intentos.</li>
          <li>Periodo de activación antes de usar un beneficiario nuevo.</li>
          <li>En empresas, segunda firma arriba de {formatMoney(SECOND_SIGN_AT)}.</li>
          <li>Comprobante con folio y bitácora de la sesión.</li>
        </ul>
        <Button variant="ghost" className="mt-4" onClick={() => setTerms(true)}>
          Leer términos y aviso de privacidad
        </Button>
      </Panel>
      <Panel title="Seguridad">
        <p className="text-sm text-muted">
          Mifos no pide su contraseña ni su clave dinámica por teléfono, correo o mensaje. El dominio de referencia
          es avantthya.com.mx. No comparta el token y revise siempre el último ingreso al entrar.
        </p>
        <Button
          className="mt-4"
          variant="ink"
          onClick={() => {
            resetDemo();
            toast.success("Volvimos a los datos de demostración.");
          }}
        >
          Restablecer demostración
        </Button>
      </Panel>
      {terms ? (
        <Modal title="Términos de Banca Web" onClose={() => setTerms(false)} wide>
          <TermsBody />
        </Modal>
      ) : null}
    </div>
  );
}

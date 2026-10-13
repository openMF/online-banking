import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Landmark, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import wordmark from "@/assets/logo-wordmark.png";
import { DEMO_ACTIVATION_CODE } from "@/lib/banca/demo";
import {
  DEMO_PASSWORD,
  passwordIssues,
  type Segment,
} from "@/lib/banca/model";
import { useBanca, usePendingUser } from "@/lib/banca/store";
import { Button, Field, inputClass, Mark, Modal } from "@/components/banca/ui";
import { toast } from "sonner";

const FEATURES = [
  "Consulta de saldos y movimientos",
  "Transferencias entre cuentas propias",
  "Transferencias a terceros Mifos",
  "Comprobante, límites y bitácora",
];

export function PublicScreens() {
  const screen = useBanca((state) => state.screen);
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <div className="h-1 bg-brand" />
      <header className="flex items-center justify-between gap-4 px-4 py-4 text-on-ink sm:px-8">
        <div className="flex items-center gap-3">
          <Mark className="size-10" />
          <div>
            <p className="text-sm font-bold tracking-wide">MIFOS</p>
            <p className="text-xs text-on-ink/70">Banca Web</p>
          </div>
        </div>
        <p className="hidden text-xs text-on-ink/70 sm:block">Crédito · Ahorro · Inversión</p>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
        <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div className="hidden text-on-ink lg:block">
            <p className="text-xs font-semibold tracking-widest text-brand">CANAL ELECTRÓNICO</p>
            <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight">
              Su dinero, con los controles de una banca electrónica formal.
            </h1>
            <ul className="mt-8 space-y-3 text-sm text-on-ink/85">
              {FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="size-1.5 rounded-full bg-brand" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-sm text-xs leading-relaxed text-on-ink/60">
              COMPANY NAME , S.A. DE C.V., S.F.P. Entidad autorizada, regulada y supervisada por la CNBV.
              Los depósitos están protegidos por el Fondo de Protección hasta por 25,000 UDIS por ahorrador.
            </p>
          </div>
          {screen === "register" ? <RegisterCard /> : screen === "login" ? <LoginCard /> : <LandingCard />}
        </div>
      </main>
      <footer className="flex flex-col gap-2 px-4 py-4 text-xs text-on-ink/65 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>León, Guanajuato · 477 461 4700</p>
        <p>Prototipo de demostración. No realiza operaciones reales.</p>
      </footer>
    </div>
  );
}

function LandingCard() {
  const continueClient = useBanca((state) => state.continueClient);
  const go = useBanca((state) => state.go);
  const [segment, setSegment] = useState<Segment>("personas");
  const [client, setClient] = useState("344988355");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = continueClient(client);
    if (!result.ok) setError(result.error);
  }

  function demo(nextSegment: Segment, number: string) {
    setSegment(nextSegment);
    setClient(number);
    setError("");
    const result = continueClient(number);
    if (!result.ok) setError(result.error);
  }

  return (
    <form action="javascript:void(0)" onSubmit={submit} className="rounded-lg bg-card p-6 shadow-xl">
      <img src={wordmark} alt="Mifos. Crédito, ahorro e inversión" className="mx-auto mb-5 h-16 w-auto" />
      <SegmentSwitch
        value={segment}
        onChange={(next) => {
          setSegment(next);
          setClient(next === "personas" ? "344988355" : "880214001");
          setError("");
        }}
      />
      <div className="mt-5">
        <Field label="Número de cliente" error={error} hint="Identificador único de usuario, de 6 a 12 dígitos.">
          <span className="relative block">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className={`${inputClass} pl-10`}
              inputMode="numeric"
              autoComplete="username"
              value={client}
              onChange={(event) => {
                setClient(event.target.value.replace(/\D/g, "").slice(0, 12));
                setError("");
              }}
            />
          </span>
        </Field>
      </div>
      <Button type="submit" className="mt-4 w-full">
        Continuar
      </Button>
      <Button
        variant="ink"
        className="mt-2 w-full"
        onClick={() => {
          setError("");
          go("register");
        }}
      >
        Registrarse
      </Button>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => demo("personas", "344988355")}
          className="rounded-md border border-line px-3 py-2 text-left hover:border-brand"
        >
          <span className="block text-xs text-muted">Demo personas</span>
          <span className="text-sm font-semibold">Noé López Guzmán</span>
        </button>
        <button
          type="button"
          onClick={() => demo("empresas", "880214001")}
          className="rounded-md border border-line px-3 py-2 text-left hover:border-brand"
        >
          <span className="block text-xs text-muted">Demo empresas</span>
          <span className="text-sm font-semibold">Taller Industrial del Bajío</span>
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-muted">Contraseña de demostración: {DEMO_PASSWORD}</p>
    </form>
  );
}

function LoginCard() {
  const user = usePendingUser();
  const login = useBanca((state) => state.login);
  const go = useBanca((state) => state.go);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = login(password);
    if (!result.ok) setError(result.error);
    else toast.success(`Bienvenido. Sesión segura iniciada.`);
  }

  return (
    <form action="javascript:void(0)" onSubmit={submit} className="rounded-lg bg-card p-6 shadow-xl">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-paper text-muted">
        {user?.segment === "empresas" ? <Landmark className="size-6" /> : <UserRound className="size-6" />}
      </div>
      <h2 className="text-center text-lg font-semibold">{user?.loginHint ?? "Cliente"}</h2>
      <p className="mt-2 text-center text-sm text-muted">
        Si las iniciales son correctas, ingrese su contraseña. Si no las reconoce, cancele: podría no estar en el
        sitio de Mifos.
      </p>
      <div className="mt-5">
        <Field label="Contraseña" error={error}>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className={`${inputClass} pr-11 pl-10`}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShow((value) => !value)}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </Field>
      </div>
      <Button type="submit" className="mt-4 w-full">
        Iniciar sesión
      </Button>
      <Button variant="ink" className="mt-2 w-full" onClick={() => go("landing")}>
        Cancelar
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        Factor categoría 2. Después de 3 errores el acceso se bloquea 10 minutos.
      </p>
    </form>
  );
}

function RegisterCard() {
  const go = useBanca((state) => state.go);
  const enroll = useBanca((state) => state.enroll);
  const [segment, setSegment] = useState<Segment>("personas");
  const [show, setShow] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [activation, setActivation] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    paternal: "",
    maternal: "",
    company: "",
    rfc: "",
    email: "",
    client: "",
    password: "",
    confirm: "",
    phone: "",
    birth: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!accepted) {
      setError("Debe aceptar los términos del servicio y el aviso de privacidad.");
      return;
    }
    const client = form.client.replace(/\D/g, "");
    if (!/^\d{6,12}$/.test(client)) {
      setError("El número de cliente debe tener entre 6 y 12 dígitos. Se obtiene en sucursal.");
      return;
    }
    const issues = passwordIssues(form.password, client);
    if (issues.length) {
      setError(`La contraseña necesita ${issues.join(", ")}.`);
      return;
    }
    if (form.password !== form.confirm) {
      setError("La confirmación no coincide.");
      return;
    }
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
      setError("Capture un celular de 10 dígitos. Ahí enviaremos avisos de operaciones.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Capture un correo válido.");
      return;
    }
    if (segment === "personas") {
      if (!form.name.trim() || !form.paternal.trim()) {
        setError("Nombre y apellido paterno son obligatorios.");
        return;
      }
      if (!form.birth) {
        setError("Indique su fecha de nacimiento.");
        return;
      }
      const born = new Date(form.birth);
      const adult = new Date();
      adult.setFullYear(adult.getFullYear() - 18);
      if (Number.isNaN(born.getTime()) || born > adult) {
        setError("El titular debe ser mayor de edad.");
        return;
      }
    } else if (!form.company.trim() || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(form.rfc.trim())) {
      setError("Capture la razón social y un RFC de persona moral válido.");
      return;
    }
    setActivation(true);
  }

  function confirmActivation() {
    if (code.trim() !== DEMO_ACTIVATION_CODE) {
      setError("El código de activación no coincide.");
      return;
    }
    const displayName =
      segment === "personas"
        ? `${form.name} ${form.paternal} ${form.maternal}`.replace(/\s+/g, " ").trim()
        : form.company.trim();
    const result = enroll({
      segment,
      clientNumber: form.client,
      password: form.password,
      displayName,
      email: form.email,
      phone: form.phone,
      extraId: segment === "empresas" ? form.rfc : "",
    });
    if (!result.ok) {
      setError(result.error);
      setActivation(false);
      return;
    }
    setActivation(false);
    toast.success("Banca Web activada. Ya puede iniciar sesión.");
  }

  return (
    <>
      <form action="javascript:void(0)" onSubmit={submit} className="max-h-[78vh] overflow-auto rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="size-5 text-brand" />
          <div>
            <h2 className="font-semibold">Contratar Banca Web</h2>
            <p className="text-xs text-muted">Solo si ya es cliente. El alta de cuenta se hace en sucursal.</p>
          </div>
        </div>
        <SegmentSwitch value={segment} onChange={setSegment} />
        <div className="mt-4 grid gap-3">
          {segment === "personas" ? (
            <>
              <Field label="Nombre">
                <input className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Apellido paterno">
                  <input className={inputClass} value={form.paternal} onChange={(event) => set("paternal", event.target.value)} />
                </Field>
                <Field label="Apellido materno">
                  <input className={inputClass} value={form.maternal} onChange={(event) => set("maternal", event.target.value)} />
                </Field>
              </div>
              <Field label="Fecha de nacimiento">
                <input className={inputClass} type="date" value={form.birth} onChange={(event) => set("birth", event.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Razón social">
                <input className={inputClass} value={form.company} onChange={(event) => set("company", event.target.value)} />
              </Field>
              <Field label="RFC">
                <input className={inputClass} value={form.rfc} onChange={(event) => set("rfc", event.target.value.toUpperCase())} />
              </Field>
            </>
          )}
          <Field label="Correo electrónico">
            <input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
          </Field>
          <Field label="Número de celular">
            <input className={inputClass} inputMode="numeric" value={form.phone} onChange={(event) => set("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} />
          </Field>
          <Field label="Número de cliente">
            <input className={inputClass} inputMode="numeric" value={form.client} onChange={(event) => set("client", event.target.value.replace(/\D/g, "").slice(0, 12))} />
          </Field>
          <Field label="Contraseña" hint="8 caracteres, mayúscula, minúscula, dígito y símbolo.">
            <span className="relative block">
              <input
                className={`${inputClass} pr-11`}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
              />
              <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2 text-muted" onClick={() => setShow((value) => !value)} aria-label="Mostrar contraseña">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </Field>
          <Field label="Confirmar contraseña">
            <input className={inputClass} type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => set("confirm", event.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-brand" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>
              Acepto los{" "}
              <button type="button" className="font-semibold text-brand underline" onClick={() => setTermsOpen(true)}>
                términos de Banca Web
              </button>{" "}
              y el aviso de privacidad.
            </span>
          </label>
          {error ? <p className="text-xs text-brand">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit">Registrar</Button>
            <Button variant="ink" onClick={() => go("landing")}>
              Cancelar
            </Button>
          </div>
        </div>
      </form>
      {termsOpen ? (
        <Modal title="Términos de Banca Web" onClose={() => setTermsOpen(false)} wide footer={<Button onClick={() => { setAccepted(true); setTermsOpen(false); }}>Aceptar</Button>}>
          <TermsBody />
        </Modal>
      ) : null}
      {activation ? (
        <Modal
          title="Solo un paso más"
          onClose={() => setActivation(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => toast("En producción reenviaríamos el código. Use 482915.")}>
                Reenviar
              </Button>
              <Button onClick={confirmActivation}>Aceptar</Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            Enviamos un código de activación a {form.email || "su correo"}. En este prototipo el código es{" "}
            <strong className="text-ink">{DEMO_ACTIVATION_CODE}</strong>.
          </p>
          <div className="mt-4">
            <Field label="Código de activación" error={error && activation ? error : undefined}>
              <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function SegmentSwitch({ value, onChange }: { value: Segment; onChange: (value: Segment) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-md bg-paper p-1 text-sm font-semibold">
      {(
        [
          ["personas", "Personas"],
          ["empresas", "Empresas"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={value === id ? "h-10 rounded bg-ink text-on-ink" : "h-10 rounded text-muted"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function TermsBody() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted">
      <p>
        El servicio de Banca Web de COMPANY NAME , S.A. DE C.V., S.F.P. (Mifos) permite consultar
        saldos y movimientos, y ordenar transferencias entre cuentas propias y a terceros de la misma entidad.
      </p>
      <p>
        El identificador de usuario es único. Para iniciar sesión se valida ese identificador y un factor de
        autenticación categoría 2 (contraseña). Las transferencias, el alta o baja de beneficiarios, el cambio de
        medios de aviso y el incremento de límites exigen además una clave dinámica de un solo uso, factor categoría 3.
      </p>
      <p>
        La sesión termina a los 5 minutos sin actividad. Tres autenticaciones fallidas bloquean el acceso 10 minutos.
        Un beneficiario nuevo no puede recibir fondos hasta concluir el periodo de activación. En empresas, los cargos
        mayores a $50,000.00 requieren la intervención del facultado autorizador.
      </p>
      <p>
        Usted puede disminuir sus límites de inmediato. Incrementarlos pide clave dinámica y no puede rebasar el tope
        institucional del perfil. Cada operación monetaria genera comprobante con folio, y queda en la bitácora.
      </p>
      <p>
        Aviso de privacidad: los datos se usan para identificarle, autenticarle, operar el canal y enviarle alertas.
        Puede ejercer sus derechos ARCO en Blvd. Paseo de los Insurgentes 301, Col. Los Paraísos, León, Gto., o al
        477 461 4700. Este prototipo guarda la información solo en su navegador.
      </p>
    </div>
  );
}

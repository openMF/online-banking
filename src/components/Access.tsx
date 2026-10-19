import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Info,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Brand } from "./ui";
import type { Product, Segment } from "../lib/demo";
import { LocalizedTree, translate, useI18n } from "../i18n";

function SegmentChoice({
  segment,
  setSegment,
}: {
  segment: Segment;
  setSegment: (segment: Segment) => void;
}) {
  return (
    <LocalizedTree>
      <div className="form-segment" aria-label="Tipo de cuenta">
        <button
          type="button"
          className={segment === "personas" ? "selected" : ""}
          aria-pressed={segment === "personas"}
          onClick={() => setSegment("personas")}
        >
          <UserRound size={16} />
          Personas
        </button>
        <button
          type="button"
          className={segment === "empresas" ? "selected" : ""}
          aria-pressed={segment === "empresas"}
          onClick={() => setSegment("empresas")}
        >
          <Building2 size={16} />
          Empresas
        </button>
      </div>
    </LocalizedTree>
  );
}

export function Login({
  initialSegment,
  onLogin,
  onRegister,
}: {
  initialSegment: Segment;
  onLogin: (segment: Segment) => void;
  onRegister: () => void;
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [client, setClient] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const demoClient = segment === "personas" ? "344988355" : "880214001";

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (client.trim() !== demoClient || password !== "Mifos#26") {
      setError(
        "Los datos no coinciden con el acceso de prueba. Usa el botón de datos demo.",
      );
      return;
    }
    setBusy(true);
    timer.current = setTimeout(() => onLogin(segment), 500);
  }

  return (
    <LocalizedTree>
      <div className="access-content">
        <Brand compact />
        {recovery ? (
          <>
            <button
              className="back-link"
              onClick={() => {
                setRecovery(false);
                setRecoveryDone(false);
              }}
            >
              <ArrowLeft size={16} />
              Volver al acceso
            </button>
            <div className="modal-heading">
              <p className="eyebrow">SIEMPRE DE TU LADO</p>
              <h3>Recupera tu acceso.</h3>
              <p>
                Para una cuenta real, utiliza los canales oficiales de
                MIFOS.
              </p>
            </div>
            {recoveryDone ? (
              <div className="form-success" role="status">
                <Mail size={32} />
                <h4>Así de sencillo sería.</h4>
                <p>
                  En un entorno conectado recibirías instrucciones en tu correo.
                  Esta demo no envía mensajes ni cambia contraseñas.
                </p>
                <a
                  className="button button-primary"
                  href="https://www.mifos.com.mx/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ir al sitio oficial
                  <ArrowUpRight size={17} />
                </a>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setRecoveryDone(true);
                }}
                className="form-stack"
              >
                <label>
                  Correo de prueba
                  <input
                    type="email"
                    required
                    placeholder="nombre@ejemplo.com"
                    autoComplete="off"
                  />
                </label>
                <button className="button button-primary" type="submit">
                  Simular recuperación
                  <ArrowRight size={17} />
                </button>
                <p className="form-note">
                  Usa datos ficticios. No se enviará ningún correo.
                </p>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="modal-heading">
              <p className="eyebrow">TU BANCA, MÁS CERCA</p>
              <h3>Qué bueno verte.</h3>
              <p>Entra y descubre una forma más simple de avanzar.</p>
            </div>
            <div className="demo-notice">
              <Info size={17} />
              <span>
                Estás en una <strong>demostración</strong>. No ingreses tus
                credenciales bancarias reales.
              </span>
            </div>
            <SegmentChoice
              segment={segment}
              setSegment={(value) => {
                setSegment(value);
                setClient("");
                setPassword("");
                setError("");
              }}
            />
            <form className="form-stack" onSubmit={submit}>
              <label>
                Número de cliente demo
                <input
                  name="client"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  placeholder="Tu número de cliente"
                  maxLength={9}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </label>
              <label>
                Contraseña de prueba
                <span className="password-field">
                  <input
                    name="password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              <button
                className="subtle-link forgot-link"
                type="button"
                onClick={() => setRecovery(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
              {error && (
                <p id="login-error" className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="button button-primary"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Preparando tu banca...
                  </>
                ) : (
                  <>
                    Entrar a mi banca
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  setClient(demoClient);
                  setPassword("Mifos#26");
                  setError("");
                }}
              >
                Completar con datos demo
              </button>
            </form>
            <p className="demo-credentials">
              Acceso de prueba: {demoClient} / Mifos#26
            </p>
            <p className="access-bottom">
              ¿Es tu primera vez?{" "}
              <button className="subtle-link" onClick={onRegister}>
                Comienza aquí
              </button>
            </p>
          </>
        )}
        <div className="access-security">
          <LockKeyhole size={13} />
          Prototipo local. Sin conexión a cuentas reales.
        </div>
      </div>
    </LocalizedTree>
  );
}

export function Onboarding({
  initialSegment,
  initialProduct,
  onComplete,
}: {
  initialSegment: Segment;
  initialProduct: Product;
  onComplete: (segment: Segment) => void;
}) {
  const [segment, setSegment] = useState(initialSegment);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState(initialProduct);
  const [nameError, setNameError] = useState("");
  return (
    <LocalizedTree>
      <div className="access-content">
        <Brand compact />
        {step < 2 ? (
          <>
            <div className="onboarding-progress">
              <span className="active" />
              <span className={step > 0 ? "active" : ""} />
              <p>Paso {step + 1} de 2</p>
            </div>
            <div className="modal-heading">
              <p className="eyebrow">EL PRIMER PASO ES TUYO</p>
              <h3>
                {step === 0
                  ? "Hagamos espacio a tus planes."
                  : "Conozcámonos un poco."}
              </h3>
              <p>
                {step === 0
                  ? "Elige la experiencia que mejor va contigo."
                  : "Usa un nombre y correo ficticios para explorar el registro."}
              </p>
            </div>
            {step === 0 ? (
              <div className="form-stack">
                <div className="profile-options">
                  <button
                    className={segment === "personas" ? "selected" : ""}
                    aria-pressed={segment === "personas"}
                    onClick={() => setSegment("personas")}
                  >
                    <UserRound size={25} />
                    <strong>Para mí</strong>
                    <span>Mis ahorros, mis metas, mi futuro.</span>
                    <span className="selection-indicator">
                      {segment === "personas" && <Check size={14} />}
                    </span>
                  </button>
                  <button
                    className={segment === "empresas" ? "selected" : ""}
                    aria-pressed={segment === "empresas"}
                    onClick={() => setSegment("empresas")}
                  >
                    <Building2 size={25} />
                    <strong>Para mi empresa</strong>
                    <span>El siguiente capítulo de mi negocio.</span>
                    <span className="selection-indicator">
                      {segment === "empresas" && <Check size={14} />}
                    </span>
                  </button>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => setStep(1)}
                >
                  Continuar
                  <ArrowRight size={17} />
                </button>
                <p className="form-note">
                  Registro de demostración. No abre una cuenta bancaria real.
                </p>
              </div>
            ) : (
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (name.trim().length < 2) {
                    setNameError(
                      "Escribe al menos dos caracteres, sin contar espacios.",
                    );
                    return;
                  }
                  setStep(2);
                }}
              >
                <label>
                  {segment === "empresas"
                    ? "Nombre de la empresa de prueba"
                    : "Tu nombre de prueba"}
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setNameError("");
                    }}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={
                      nameError ? "onboarding-name-error" : undefined
                    }
                    required
                    minLength={2}
                    maxLength={60}
                    pattern=".*\S.*"
                    placeholder={
                      segment === "empresas" ? "Estudio Norte" : "Mariana"
                    }
                    autoComplete="off"
                  />
                </label>
                {nameError && (
                  <p
                    className="form-error"
                    role="alert"
                    id="onboarding-name-error"
                  >
                    {nameError}
                  </p>
                )}
                <label>
                  Correo electrónico de prueba
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    maxLength={100}
                    placeholder="hola@ejemplo.com"
                    autoComplete="off"
                  />
                </label>
                <label>
                  ¿Cuál es tu siguiente paso?
                  <select
                    value={product}
                    onChange={(event) =>
                      setProduct(event.target.value as Product)
                    }
                  >
                    <option value="cuenta">Organizar mi dinero</option>
                    <option value="inversion">Hacer crecer mi ahorro</option>
                    <option value="credito">Impulsar un proyecto</option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>
                    Entiendo que esta es una demo, que los datos se mantienen
                    solo durante esta sesión y que no se abrirá una cuenta real.
                  </span>
                </label>
                <button className="button button-primary" type="submit">
                  Crear mi experiencia demo
                  <ArrowRight size={17} />
                </button>
                <button
                  className="back-link centered"
                  type="button"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={15} />
                  Volver
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="form-success onboarding-complete" role="status">
            <span className="success-symbol">
              <CheckCheck size={32} />
            </span>
            <p className="eyebrow">YA DISTE EL PRIMER PASO</p>
            <h3>
              Tu futuro se ve bien,
              <br />
              {name.trim()}.
            </h3>
            <p>
              Tu experiencia de prueba está lista. Explora tu cuenta, organiza
              tus movimientos y simula tu primera transferencia.
            </p>
            <button
              className="button button-primary"
              onClick={() => onComplete(segment)}
            >
              Explorar mi banca demo
              <ArrowRight size={17} />
            </button>
            <p className="form-note">
              No se creó una cuenta real ni se enviaron tus datos. Para
              contratar, visita el{" "}
              <a
                href="https://www.mifos.com.mx/"
                target="_blank"
                rel="noreferrer"
              >
                sitio oficial de MIFOS
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </LocalizedTree>
  );
}

export function Contact({ initialProduct }: { initialProduct: Product }) {
  const { locale } = useI18n();
  const [product, setProduct] = useState(initialProduct);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const productName = {
    cuenta: "Cuenta MIFOS",
    inversion: "inversión",
    credito: "crédito",
  }[product];
  const text = `${translate("Hola, me gustaría conocer las condiciones vigentes de", locale)} ${translate(productName, locale)}. ${message.trim()}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Consulta copiada. Compártela por un canal oficial.");
    } catch {
      setCopyStatus(
        "No se pudo copiar. Selecciona el texto de tu consulta y cópialo manualmente.",
      );
    }
  }

  return (
    <LocalizedTree>
      <div className="access-content">
        <Brand compact />
        <div className="modal-heading">
          <p className="eyebrow">PERSONAS, NO SOLO PANTALLAS</p>
          <h3>Hablemos de tus planes.</h3>
          <p>
            Consulta tasas, comisiones y requisitos vigentes directamente con
            MIFOS.
          </p>
        </div>
        <div className="contact-channels">
          <a href="tel:+524774614700">
            <Phone size={19} />
            <span>
              <small>Llámanos</small>
              <strong>477 461 4700</strong>
            </span>
            <ArrowUpRight size={17} />
          </a>
          <a
            href="https://www.mifos.com.mx/"
            target="_blank"
            rel="noreferrer"
          >
            <Globe size={19} />
            <span>
              <small>Canal oficial</small>
              <strong>mifos.com.mx</strong>
            </span>
            <ArrowUpRight size={17} />
          </a>
        </div>
        {prepared ? (
          <div className="prepared-message" role="status">
            <h4>Tu consulta está lista.</h4>
            <p className="selectable-message">{text}</p>
            <p className="form-note">
              No se ha enviado ningún mensaje. Cópialo y compártelo con un
              asesor a través de los canales oficiales.
            </p>
            <button className="button button-primary" onClick={copy}>
              <Copy size={16} />
              Copiar mi consulta
            </button>
            {copyStatus && (
              <p className="form-note" role="status">
                {copyStatus}
              </p>
            )}
            <button className="back-link" onClick={() => setPrepared(false)}>
              <ArrowLeft size={15} />
              Editar consulta
            </button>
          </div>
        ) : (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setPrepared(true);
            }}
          >
            <label>
              Me interesa
              <select
                value={product}
                onChange={(event) => setProduct(event.target.value as Product)}
              >
                <option value="cuenta">Cuenta MIFOS</option>
                <option value="inversion">Ahorro e inversión</option>
                <option value="credito">Crédito</option>
              </select>
            </label>
            <label>
              ¿Qué te gustaría saber?{" "}
              <span className="optional">(opcional)</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Cuéntanos sobre tu siguiente paso. No incluyas datos sensibles."
              />
            </label>
            <button className="button button-primary" type="submit">
              Preparar mi consulta
              <ArrowRight size={17} />
            </button>
            <p className="form-note">
              Este formulario solo prepara tu mensaje. No recopila ni envía
              información.
            </p>
          </form>
        )}
      </div>
    </LocalizedTree>
  );
}

export function Legal({
  topic,
}: {
  topic: "privacidad" | "terminos" | "proteccion";
}) {
  const content = {
    privacidad: {
      title: "Tu información, de tu lado.",
      copy: "Esta experiencia demostrativa no usa analítica, cookies de seguimiento ni servicios de envío de formularios. Los datos que ingresas se mantienen únicamente en memoria durante la sesión y se descartan al cerrar la experiencia. No ingreses datos personales, credenciales bancarias ni información financiera reales.",
      second:
        "Los enlaces externos te llevan a canales de terceros, cuyas políticas de privacidad son independientes. Para conocer el aviso de privacidad aplicable a los productos reales, consulta el sitio oficial de MIFOS.",
      url: "https://www.mifos.com.mx/aviso-privacidad/",
    },
    terminos: {
      title: "Claridad, desde el inicio.",
      copy: "Este sitio es un prototipo de interfaz inspirado en los flujos de Mifos Online Banking. No es un canal bancario operativo, no autentica clientes reales, no abre cuentas, no procesa créditos ni mueve dinero. Todos los saldos, movimientos, perfiles, códigos de verificación e historias de uso son ilustrativos.",
      second:
        "Las simulaciones no constituyen una oferta, cotización, recomendación financiera ni promesa de rendimientos. Las condiciones oficiales, comisiones, tasas, GAT y CAT deben verificarse directamente con MIFOS antes de contratar.",
      url: "https://www.mifos.com.mx/terminos-condiciones/",
    },
    proteccion: {
      title: "Conoce tu respaldo.",
      copy: "MIFOS es el nombre comercial de Company Name, S.F.P., una Sociedad Financiera Popular. El Fondo de Protección cubre depósitos elegibles hasta por 25,000 UDIS por persona y por institución, conforme a la legislación y condiciones aplicables.",
      second:
        "La protección no aplica a los saldos ficticios de esta demo. Consulta la situación regulatoria, los alcances, exclusiones y condiciones vigentes en los canales oficiales de MIFOS, la CNBV y la CONDUSEF.",
      url: "https://www.mifos.com.mx/fondo-de-proteccion/",
    },
  }[topic];
  return (
    <LocalizedTree>
      <div className="access-content legal-content">
        <Brand compact />
        <div className="modal-heading">
          <ShieldCheck size={30} className="text-brand" />
          <h3>{content.title}</h3>
        </div>
        <p>{content.copy}</p>
        <p>{content.second}</p>
        <a
          className="button button-primary"
          href={content.url}
          target="_blank"
          rel="noreferrer"
        >
          Consultar información oficial
          <ArrowUpRight size={17} />
        </a>
        <p className="form-note">
          Demostración independiente. Sin operaciones financieras reales.
        </p>
      </div>
    </LocalizedTree>
  );
}

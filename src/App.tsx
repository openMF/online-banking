import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Globe2,
  HeartHandshake,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Brand, Eyebrow, Modal, Reveal, TextLink } from "./components/ui";
import ProductPreview from "./components/ProductPreview";
import { Contact, Legal, Onboarding } from "./components/Access";
import { CustomerAccess, CustomerHome } from "./components/CustomerAccess";
import type { CustomerSession } from "./lib/authentication/client";
import { authenticationMessages } from "./lib/authentication/messages";
import type { BankView, Product, Segment } from "./lib/demo";
import { LocaleToggle, LocalizedTree } from "./i18n";

const DemoBank = lazy(() => import("./components/Banking"));
type ModalType =
  | "login"
  | "onboarding"
  | "contact"
  | "demo"
  | "privacidad"
  | "terminos"
  | "proteccion"
  | null;

const products = [
  {
    id: "cuenta" as const,
    number: "01",
    icon: Wallet,
    name: "Tu dinero, a tu ritmo.",
    category: "CUENTA MIFOS",
    description:
      "El control de tu día a día. Consulta, organiza y transfiere desde un mismo lugar.",
    link: "Conoce tu cuenta",
  },
  {
    id: "inversion" as const,
    number: "02",
    icon: TrendingUp,
    name: "Dale futuro a tu ahorro.",
    category: "AHORRO E INVERSIÓN",
    description:
      "Haz espacio para lo que viene, con alternativas que acompañan tus metas.",
    link: "Explora tus posibilidades",
  },
  {
    id: "credito" as const,
    number: "03",
    icon: Sparkles,
    name: "Tus ideas, más lejos.",
    category: "CRÉDITO A TU MEDIDA",
    description:
      "Ese proyecto merece un siguiente paso. Encuentra el impulso para hacerlo realidad.",
    link: "Impulsa tu proyecto",
  },
];

const showcaseContent = {
  cuenta: {
    eyebrow: "MÁS SIMPLE. MÁS TUYA.",
    title: (
      <>
        Tu banca.
        <br />
        Donde tú estés.
      </>
    ),
    description:
      "Menos vueltas. Más tiempo para lo que importa. Lleva el control de tus finanzas con una experiencia hecha para ti.",
    points: [
      "Tus cuentas, en una sola vista.",
      "Transferencias en pocos pasos.",
      "Cada movimiento, siempre claro.",
    ],
    cta: "Explora la banca digital",
  },
  inversion: {
    eyebrow: "PIENSA EN GRANDE. EMPIEZA HOY.",
    title: (
      <>
        Tus metas.
        <br />
        Un poco más cerca.
      </>
    ),
    description:
      "Un viaje, un nuevo hogar, tu tranquilidad. Explora cómo el tiempo puede acompañar a tu ahorro.",
    points: [
      "Elige un monto a tu ritmo.",
      "Visualiza distintos plazos.",
      "Consulta siempre las condiciones.",
    ],
    cta: "Hablemos de tu inversión",
  },
  credito: {
    eyebrow: "EL IMPULSO PARA LO QUE VIENE.",
    title: (
      <>
        Una gran idea.
        <br />
        Un nuevo comienzo.
      </>
    ),
    description:
      "Ponle números a ese proyecto que tienes en mente. Da el primer paso con una simulación sencilla.",
    points: [
      "Explora diferentes montos.",
      "Encuentra un plazo para tu proyecto.",
      "Recibe orientación personalizada.",
    ],
    cta: "Encuentra tu siguiente paso",
  },
};

const stories = [
  {
    quote:
      "Mis planes siguen creciendo. Ahora mi forma de manejar el dinero también.",
    name: "Mariana",
    role: "Emprendedora",
    initials: "MR",
    detail: "Organizar sus finanzas, sin perder de vista su próximo proyecto.",
  },
  {
    quote: "Tener todo claro me deja más tiempo para lo que de verdad importa.",
    name: "Daniel",
    role: "Profesionista independiente",
    initials: "DG",
    detail: "Un solo lugar para seguir sus movimientos y cuidar su ahorro.",
  },
  {
    quote: "Cuando el equipo tiene claridad, el negocio puede mirar más lejos.",
    name: "Estudio Norte",
    role: "Pequeña empresa",
    initials: "EN",
    detail: "Dos firmas y una vista compartida para avanzar con más control.",
  },
];

const faqs = [
  {
    question: "¿Qué es MIFOS?",
    answer:
      "MIFOS es el nombre comercial de Company Name, S.F.P., una Sociedad Financiera Popular mexicana que ofrece soluciones de crédito, ahorro e inversión. Consulta su información institucional y regulatoria vigente en mifos.com.mx.",
  },
  {
    question: "¿Cómo puedo abrir una cuenta?",
    answer:
      'Con el botón "Abre tu cuenta" puedes explorar un registro de demostración. Para abrir una cuenta real, visita el sitio oficial o contacta a un asesor al 477 461 4700. Los requisitos, disponibilidad y condiciones dependen del producto y de la validación de identidad correspondiente.',
  },
  {
    question: "¿Cómo está protegido mi ahorro?",
    answer:
      "Los depósitos elegibles de una SOFIPO están protegidos por el Fondo de Protección hasta por 25,000 UDIS por persona y por institución, conforme a las disposiciones aplicables. Consulta los alcances y exclusiones en los canales oficiales. Los saldos de esta demo son ficticios y no son depósitos.",
  },
  {
    question: "¿Qué puedo hacer en la banca digital?",
    answer:
      "En esta experiencia puedes explorar saldos y movimientos, agregar beneficiarios, simular transferencias, descargar comprobantes de prueba y exportar movimientos a CSV. La versión empresarial incluye un flujo de segunda firma. Todas estas acciones son locales y no mueven dinero real.",
  },
  {
    question: "¿Cuáles son las comisiones y las tasas?",
    answer:
      "Las comisiones, tasas, GAT, CAT, montos y plazos reales varían según el producto y las condiciones vigentes. No publicamos valores oficiales no verificados. Solicita la información actual directamente a MIFOS antes de contratar. Los simuladores usan tasas hipotéticas claramente indicadas.",
  },
  {
    question: "¿Esta experiencia opera con dinero real?",
    answer:
      "No. Este es un prototipo de experiencia digital inspirado en Mifos Online Banking. Los perfiles, saldos, transferencias, verificaciones e historias son ilustrativos. No está conectado a sistemas bancarios y no abre cuentas ni realiza operaciones reales. Utiliza únicamente datos de prueba.",
  },
];

export default function App() {
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [segment, setSegment] = useState<Segment>("personas");
  const [product, setProduct] = useState<Product>("cuenta");
  const [modal, setModal] = useState<ModalType>(null);
  const [demoView, setDemoView] = useState<BankView>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [solutionsMenu, setSolutionsMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [story, setStory] = useState(0);
  const [toast, setToast] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setSolutionsMenu(false);
      if (
        !document.querySelector(".site-header")?.contains(event.target as Node)
      )
        setMobileMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const expandedToggle = document.querySelector<HTMLButtonElement>(
          '.mobile-menu-button[aria-expanded="true"], .nav-dropdown > button[aria-expanded="true"]',
        );
        setSolutionsMenu(false);
        setMobileMenu(false);
        if (!document.querySelector("dialog[open]")) expandedToggle?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const onResize = () => {
      if (desktop.matches) setMobileMenu(false);
    };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function openModal(next: ModalType) {
    setModal(next);
    setMobileMenu(false);
    setSolutionsMenu(false);
  }
  function openDemo(view: BankView = "overview") {
    setDemoView(view);
    openModal("demo");
  }
  function chooseProduct(next: Product) {
    setProduct(next);
    setSolutionsMenu(false);
    setMobileMenu(false);
    document.getElementById("banca-digital")?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
  }
  function navigationClick() {
    setMobileMenu(false);
    setSolutionsMenu(false);
  }
  function authenticated(value: Segment) {
    setSegment(value);
    setDemoView("overview");
    setModal("demo");
  }

  const content = showcaseContent[product];

  // Real customers never mount the demo dashboard or illustrative landing content.
  if (customerSession) {
    return (
      <CustomerHome
        session={customerSession}
        onEnd={(expired, revocation) => {
          setCustomerSession(null);
          setModal("login");
          setSessionNotice(expired
            ? authenticationMessages.expired
            : "Sesión local cerrada. Solicitando cierre al servidor...");
          void revocation.then((acknowledged) => setSessionNotice(expired
            ? authenticationMessages.expired
            : acknowledged
              ? "Sesión local cerrada. El servidor confirmó el cierre del token de acceso."
              : "Sesión local cerrada. No pudimos confirmar el cierre en el servidor."));
        }}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <LocalizedTree>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <header className={`site-header ${scrolled ? "header-scrolled" : ""}`}>
          <div className="header-inner">
            <a
              href="#inicio"
              className="brand-link"
              aria-label="MIFOS, inicio"
              onClick={navigationClick}
            >
              <Brand />
            </a>
            <div className="header-segments" aria-label="Tipo de banca">
              <button
                className={segment === "personas" ? "active" : ""}
                aria-pressed={segment === "personas"}
                onClick={() => setSegment("personas")}
              >
                Personas
              </button>
              <button
                className={segment === "empresas" ? "active" : ""}
                aria-pressed={segment === "empresas"}
                onClick={() => setSegment("empresas")}
              >
                Empresas
              </button>
            </div>
            <nav className="desktop-nav" aria-label="Navegación principal">
              <div
                className="nav-dropdown"
                ref={menuRef}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  )
                    setSolutionsMenu(false);
                }}
              >
                <button
                  aria-expanded={solutionsMenu}
                  aria-controls="solutions-menu"
                  onClick={() => setSolutionsMenu(!solutionsMenu)}
                >
                  Soluciones
                  <ChevronDown
                    size={12}
                    className={solutionsMenu ? "rotated" : ""}
                  />
                </button>
                <AnimatePresence>
                  {solutionsMenu && (
                    <motion.div
                      id="solutions-menu"
                      className="solutions-dropdown"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span>UN SIGUIENTE PASO PARA CADA PLAN</span>
                      {products.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => chooseProduct(item.id)}
                        >
                          <item.icon size={20} />
                          <span>
                            <strong>
                              {item.category === "CUENTA MIFOS"
                                ? "Cuenta MIFOS"
                                : item.id === "inversion"
                                  ? "Ahorro e inversión"
                                  : "Crédito a tu medida"}
                            </strong>
                            <small>{item.name}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <a href="#nosotros">Por qué MIFOS</a>
              <a href="#ayuda">Ayuda</a>
            </nav>
            <div className="header-actions">
              <LocaleToggle />
              <button
                className="login-button"
                onClick={() => openModal("login")}
              >
                <LockKeyhole size={14} />
                Banca en línea
                <ArrowUpRight size={14} />
              </button>
              <button
                className="button button-primary header-cta"
                onClick={() => openModal("onboarding")}
              >
                Abre tu cuenta
                <ArrowRight size={15} />
              </button>
            </div>
            <button
              className="mobile-menu-button icon-button"
              aria-label={mobileMenu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenu}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          <AnimatePresence>
            {mobileMenu && (
              <motion.nav
                id="mobile-navigation"
                className="mobile-navigation"
                aria-label="Navegación móvil"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mobile-segments">
                  <button
                    className={segment === "personas" ? "active" : ""}
                    aria-pressed={segment === "personas"}
                    onClick={() => setSegment("personas")}
                  >
                    Personas
                  </button>
                  <button
                    className={segment === "empresas" ? "active" : ""}
                    aria-pressed={segment === "empresas"}
                    onClick={() => setSegment("empresas")}
                  >
                    Empresas
                  </button>
                </div>
                <LocaleToggle />
                {products.map((item) => (
                  <button key={item.id} onClick={() => chooseProduct(item.id)}>
                    {item.id === "cuenta"
                      ? "Cuenta MIFOS"
                      : item.id === "inversion"
                        ? "Ahorro e inversión"
                        : "Crédito"}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                <a href="#nosotros" onClick={navigationClick}>
                  Por qué MIFOS
                  <ArrowUpRight size={16} />
                </a>
                <a href="#ayuda" onClick={navigationClick}>
                  Ayuda
                  <ArrowUpRight size={16} />
                </a>
                <button onClick={() => openModal("login")}>
                  <LockKeyhole size={16} />
                  Banca en línea
                </button>
                <button
                  className="button button-primary"
                  onClick={() => openModal("onboarding")}
                >
                  Abre tu cuenta
                  <ArrowRight size={17} />
                </button>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main id="contenido" tabIndex={-1}>
          <section className="hero" id="inicio" aria-labelledby="hero-title">
            <div className="hero-image-plane">
              <motion.img
                className="hero-image"
                src="/images/mifos-city.jpg"
                alt="Arquitectura contemporánea de Ciudad de México con un monumental arco rojo, una visión del futuro de MIFOS"
                fetchPriority="high"
                width="1568"
                height="882"
                initial={{ scale: reducedMotion ? 1 : 1.045 }}
                animate={{ scale: 1 }}
                transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <div className="hero-image-shade" />
            </div>
            <div className="container hero-inner">
              <motion.div
                className="hero-copy"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
                  },
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7 },
                    },
                  }}
                >
                  <Eyebrow>
                    {segment === "personas"
                      ? "EL FUTURO ES TUYO"
                      : "EL FUTURO DE TU EMPRESA EMPIEZA AQUÍ"}
                  </Eyebrow>
                </motion.div>
                <motion.h1
                  id="hero-title"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.8 },
                    },
                  }}
                >
                  <span className="hero-brand">MIFOS.</span>
                  <span>
                    {segment === "personas" ? "Siempre hacia" : "Tu negocio,"}
                  </span>
                  <span className="hero-accent">
                    {segment === "personas" ? "adelante." : "más adelante."}
                  </span>
                </motion.h1>
                <motion.p
                  className="hero-description"
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7 },
                    },
                  }}
                >
                  {segment === "personas" ? (
                    <>
                      Tu dinero, tus metas, tu siguiente paso.
                      <br />
                      Ahorra, invierte y crece con una banca de tu lado.
                    </>
                  ) : (
                    <>
                      Las grandes ideas merecen un gran aliado.
                      <br />
                      Haz crecer tu empresa con una banca de tu lado.
                    </>
                  )}
                </motion.p>
                <motion.div
                  className="hero-actions"
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7 },
                    },
                  }}
                >
                  <button
                    className="button button-primary"
                    onClick={() => openModal("onboarding")}
                  >
                    Comienza tu futuro
                    <ArrowUpRight size={17} />
                  </button>
                  <button
                    className="hero-demo-button"
                    onClick={() => openDemo()}
                  >
                    <span>
                      <Play size={11} fill="currentColor" />
                    </span>
                    Conoce tu banca
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </section>

          <section className="trust-section" aria-label="Respaldo y regulación">
            <div className="container trust-inner">
              <p>
                Visión de futuro.
                <br />
                <strong>Respaldo que da tranquilidad.</strong>
              </p>
              <a
                href="https://www.gob.mx/cnbv"
                target="_blank"
                rel="noreferrer"
                className="trust-brand"
              >
                <Landmark size={28} strokeWidth={1.2} />
                <span>
                  <strong className="cnbv-wordmark">CNBV</strong>
                  <small>Institución regulada</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
              <a
                href="https://www.condusef.gob.mx/"
                target="_blank"
                rel="noreferrer"
                className="trust-brand"
              >
                <ShieldCheck size={28} strokeWidth={1.2} />
                <span>
                  <strong className="condusef-wordmark">CONDUSEF</strong>
                  <small>Protección al usuario</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
              <button
                onClick={() => openModal("proteccion")}
                className="trust-brand protection-brand"
              >
                <span className="protection-mark">
                  <ShieldCheck size={30} strokeWidth={1.2} />
                </span>
                <span>
                  <strong>Fondo de Protección</strong>
                  <small>Tu ahorro protegido hasta 25,000 UDIS*</small>
                </span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </section>

          <section
            className="solutions-section section-space"
            id="soluciones"
            aria-labelledby="solutions-title"
          >
            <div className="container">
              <Reveal className="section-heading centered-heading">
                <Eyebrow>UN SIGUIENTE PASO PARA CADA PLAN</Eyebrow>
                <h2 id="solutions-title">
                  Grandes planes.
                  <br />
                  <span className="muted-heading">Soluciones a tu medida.</span>
                </h2>
                <p>
                  No todos soñamos lo mismo. Tu banca también debe entenderlo.
                </p>
              </Reveal>
              <div className="solutions-grid">
                {products.map((item, index) => (
                  <Reveal key={item.id} delay={index * 0.1}>
                    <button
                      className={`solution-item ${product === item.id ? "is-selected" : ""}`}
                      onClick={() => chooseProduct(item.id)}
                      aria-pressed={product === item.id}
                    >
                      <span className="solution-top">
                        <item.icon size={28} strokeWidth={1.35} />
                        <span>{item.number} /</span>
                      </span>
                      <span className="solution-category">{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <span className="solution-link">
                        {item.link}
                        <ArrowUpRight size={17} />
                      </span>
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section
            className="showcase-section"
            id="banca-digital"
            aria-labelledby="showcase-title"
          >
            <div className="container showcase-grid">
              <Reveal className="showcase-copy">
                <Eyebrow>{content.eyebrow}</Eyebrow>
                <h2 id="showcase-title">{content.title}</h2>
                <p>{content.description}</p>
                <ul className="check-list">
                  {content.points.map((point) => (
                    <li key={point}>
                      <Check size={16} />
                      {point}
                    </li>
                  ))}
                </ul>
                <TextLink
                  onClick={() =>
                    product === "cuenta" ? openDemo() : openModal("contact")
                  }
                >
                  {content.cta}
                </TextLink>
                <span className="showcase-disclosure">
                  Una vista previa de lo que viene. Datos ilustrativos.
                </span>
              </Reveal>
              <Reveal className="showcase-visual" delay={0.15}>
                <div
                  className="product-switcher"
                  aria-label="Explorar producto"
                >
                  {products.map((item) => (
                    <button
                      key={item.id}
                      className={product === item.id ? "active" : ""}
                      aria-pressed={product === item.id}
                      onClick={() => setProduct(item.id)}
                    >
                      {item.id === "cuenta"
                        ? "Mi cuenta"
                        : item.id === "inversion"
                          ? "Mi inversión"
                          : "Mi crédito"}
                      {product === item.id && (
                        <motion.span
                          layoutId="product-indicator"
                          className="product-indicator"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <ProductPreview
                  product={product}
                  segment={segment}
                  onDemo={openDemo}
                  onContact={() => openModal("contact")}
                />
              </Reveal>
            </div>
          </section>

          <section
            className="benefits-section section-space"
            id="nosotros"
            aria-labelledby="benefits-title"
          >
            <div className="container benefits-grid">
              <Reveal className="benefits-image">
                <img
                  src="/images/mifos-everyday.jpg"
                  alt="Una mujer disfruta de un momento tranquilo en una cafetería mientras consulta su teléfono"
                  loading="lazy"
                  width="1024"
                  height="1280"
                />
              </Reveal>
              <Reveal className="benefits-copy" delay={0.12}>
                <Eyebrow>TECNOLOGÍA CON UN LADO HUMANO</Eyebrow>
                <h2 id="benefits-title">
                  Más que tu dinero.
                  <br />
                  <span className="muted-heading">Tu tranquilidad.</span>
                </h2>
                <p>
                  Innovamos en la forma. Conservamos lo importante: estar de tu
                  lado.
                </p>
                <div className="benefit-list">
                  <div>
                    <Fingerprint size={26} strokeWidth={1.35} />
                    <div>
                      <h3>La confianza, en cada paso.</h3>
                      <p>
                        Controles de acceso y verificación para una experiencia
                        pensada con cuidado.
                      </p>
                    </div>
                  </div>
                  <div>
                    <HeartHandshake size={26} strokeWidth={1.35} />
                    <div>
                      <h3>Digital, sin dejar de ser cercana.</h3>
                      <p>
                        Una experiencia sencilla y personas dispuestas a
                        escucharte cuando lo necesitas.
                      </p>
                    </div>
                  </div>
                  <div>
                    <Globe2 size={26} strokeWidth={1.35} />
                    <div>
                      <h3>Raíces mexicanas. Visión de futuro.</h3>
                      <p>
                        Entendemos tus planes porque compartimos las ganas de
                        seguir adelante.
                      </p>
                    </div>
                  </div>
                </div>
                <TextLink onClick={() => openModal("contact")}>
                  Conoce a tu próximo aliado
                </TextLink>
              </Reveal>
            </div>
          </section>

          <section className="stories-section" aria-labelledby="stories-title">
            <div className="container stories-grid">
              <Reveal className="stories-intro">
                <Eyebrow>DETRÁS DE CADA META, UNA HISTORIA</Eyebrow>
                <h2 id="stories-title">
                  Lo que viene
                  <br />
                  se ve mejor.
                </h2>
                <p>
                  Distintas formas de avanzar.
                  <br />
                  Una banca que puede acompañarlas.
                </p>
                <span className="illustrative-label">
                  HISTORIAS ILUSTRATIVAS · NO TESTIMONIOS REALES
                </span>
              </Reveal>
              <div className="story-content">
                <span className="quote-mark" aria-hidden="true">
                  “
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.figure
                    key={story}
                    initial={{ opacity: 0, x: reducedMotion ? 0 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reducedMotion ? 0 : -16 }}
                    transition={{ duration: 0.25 }}
                    aria-live="polite"
                  >
                    <blockquote>{stories[story].quote}</blockquote>
                    <figcaption>
                      <span className="story-avatar">
                        {stories[story].initials}
                      </span>
                      <span>
                        <strong>{stories[story].name}</strong>
                        <small>
                          {stories[story].role} · Perfil ilustrativo
                        </small>
                      </span>
                    </figcaption>
                    <p className="story-detail">{stories[story].detail}</p>
                  </motion.figure>
                </AnimatePresence>
                <div className="story-navigation">
                  <div className="story-dots">
                    {stories.map((_, index) => (
                      <button
                        key={index}
                        className={story === index ? "active" : ""}
                        aria-label={`Ver historia ${index + 1}`}
                        aria-pressed={story === index}
                        onClick={() => setStory(index)}
                      />
                    ))}
                  </div>
                  <div>
                    <button
                      className="round-button"
                      aria-label="Historia anterior"
                      onClick={() =>
                        setStory((story + stories.length - 1) % stories.length)
                      }
                    >
                      <ArrowLeft size={17} />
                    </button>
                    <button
                      className="round-button"
                      aria-label="Siguiente historia"
                      onClick={() => setStory((story + 1) % stories.length)}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="pricing-section section-space"
            id="condiciones"
            aria-labelledby="pricing-title"
          >
            <div className="container">
              <Reveal className="section-heading centered-heading">
                <Eyebrow>LA CLARIDAD TAMBIÉN ES UN BENEFICIO</Eyebrow>
                <h2 id="pricing-title">
                  Costos claros.
                  <br />
                  <span className="muted-heading">Decisiones tuyas.</span>
                </h2>
                <p>
                  Sin promesas pequeñas ni sorpresas grandes. Conoce las
                  condiciones antes de elegir.
                </p>
              </Reveal>
              <div className="pricing-grid">
                {[
                  {
                    id: "cuenta" as const,
                    title:
                      segment === "empresas"
                        ? "Cuenta empresarial"
                        : "Cuenta MIFOS",
                    heading: "Tu día a día, resuelto.",
                    description:
                      "Un punto de partida para organizar y mover tu dinero.",
                    label: "COMISIONES Y APERTURA",
                    cost: "Según el producto contratado",
                    points: [
                      "Consulta de saldos y movimientos",
                      "Transferencias entre cuentas",
                      segment === "empresas"
                        ? "Control con segunda firma"
                        : "Acceso desde tu navegador",
                    ],
                    button: "Consultar comisiones",
                  },
                  {
                    id: "inversion" as const,
                    title: "Ahorro e inversión",
                    heading: "Piensa en lo que viene.",
                    description:
                      "Dale una dirección a tu ahorro, a tu propio ritmo.",
                    label: "TASA ANUAL Y GAT",
                    cost: "Según el monto y el plazo",
                    points: [
                      "Alternativas de ahorro",
                      "Plazos para diferentes metas",
                      "Orientación personalizada",
                    ],
                    button: "Consultar rendimientos",
                  },
                  {
                    id: "credito" as const,
                    title:
                      segment === "empresas"
                        ? "Crédito empresarial"
                        : "Crédito a tu medida",
                    heading: "Hazlo posible.",
                    description:
                      "El siguiente paso para ese proyecto que no puede esperar.",
                    label: "TASA, CAT Y COMISIONES",
                    cost: "Sujeto a evaluación crediticia",
                    points: [
                      "Opciones para tus proyectos",
                      "Condiciones antes de contratar",
                      "Acompañamiento en el proceso",
                    ],
                    button: "Cotizar mi crédito",
                  },
                ].map((plan, index) => (
                  <Reveal delay={index * 0.08} key={plan.id}>
                    <div
                      className={`pricing-option ${index === 1 ? "pricing-featured" : ""}`}
                    >
                      <span className="pricing-category">{plan.title}</span>
                      <h3>{plan.heading}</h3>
                      <p>{plan.description}</p>
                      <div className="pricing-terms">
                        <span>{plan.label}</span>
                        <strong>{plan.cost}</strong>
                      </div>
                      <ul className="check-list">
                        {plan.points.map((point) => (
                          <li key={point}>
                            <Check size={14} />
                            {point}
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`button ${index === 1 ? "button-primary" : "button-outline"}`}
                        onClick={() => {
                          setProduct(plan.id);
                          openModal("contact");
                        }}
                      >
                        {plan.button}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </Reveal>
                ))}
              </div>
              <p className="pricing-disclaimer">
                Los costos, tasas, GAT y CAT vigentes se confirman en los
                canales oficiales de MIFOS. Esta experiencia no constituye
                una oferta de contratación.
              </p>
            </div>
          </section>

          <section
            className="faq-section"
            id="ayuda"
            aria-labelledby="faq-title"
          >
            <div className="container faq-grid">
              <Reveal className="faq-intro">
                <Eyebrow>HABLEMOS CON CLARIDAD</Eyebrow>
                <h2 id="faq-title">
                  Tú preguntas.
                  <br />
                  <span className="muted-heading">Nosotros, claro.</span>
                </h2>
                <p>
                  Las respuestas para dar tu siguiente paso con tranquilidad.
                </p>
                <TextLink onClick={() => openModal("contact")}>
                  ¿Platicamos?
                </TextLink>
              </Reveal>
              <div className="faq-list">
                {faqs.map((item, index) => (
                  <div
                    className={`faq-item ${faq === index ? "is-open" : ""}`}
                    key={item.question}
                  >
                    <h3>
                      <button
                        id={`faq-button-${index}`}
                        aria-expanded={faq === index}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() => setFaq(faq === index ? null : index)}
                      >
                        {item.question}
                        <span>
                          {faq === index ? (
                            <Minus size={18} />
                          ) : (
                            <Plus size={18} />
                          )}
                        </span>
                      </button>
                    </h3>
                    <div
                      className="faq-answer"
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-button-${index}`}
                      hidden={faq !== index}
                    >
                      <p>{item.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="final-cta" aria-labelledby="cta-title">
            <div className="cta-arches" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="container final-cta-inner">
              <Reveal>
                <Eyebrow light>MIFOS. SIEMPRE DE TU LADO.</Eyebrow>
                <h2 id="cta-title">
                  El siguiente paso
                  <br />
                  es tuyo.
                </h2>
                <p>Tu futuro no espera. Hagamos que suceda.</p>
                <button
                  className="button button-white"
                  onClick={() => openModal("onboarding")}
                >
                  Comienza hoy
                  <ArrowUpRight size={17} />
                </button>
              </Reveal>
              <span className="cta-brand-symbol" aria-hidden="true">
                A
              </span>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="container">
            <div className="footer-top">
              <div className="footer-brand">
                <a href="#inicio" aria-label="MIFOS, volver al inicio">
                  <Brand />
                </a>
                <p>
                  Tu dinero. Tu futuro.
                  <br />
                  Siempre de tu lado.
                </p>
                <span>
                  <span className="mexico-mark">
                    <i />
                    <i />
                    <i />
                  </span>
                  Orgullosamente mexicana.
                </span>
              </div>
              <div className="footer-link-group">
                <h3>Un paso adelante</h3>
                <button onClick={() => chooseProduct("cuenta")}>
                  Cuenta MIFOS
                </button>
                <button onClick={() => chooseProduct("inversion")}>
                  Ahorro e inversión
                </button>
                <button onClick={() => chooseProduct("credito")}>
                  Crédito
                </button>
                <button
                  onClick={() => {
                    setSegment("empresas");
                    document.getElementById("inicio")?.scrollIntoView({
                      behavior: reducedMotion ? "instant" : "smooth",
                    });
                  }}
                >
                  Para tu empresa
                </button>
              </div>
              <div className="footer-link-group">
                <h3>Conoce MIFOS</h3>
                <a href="#nosotros">De nuestro lado</a>
                <a href="#condiciones">Costos y condiciones</a>
                <a
                  href="https://www.mifos.com.mx/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sitio institucional
                  <ArrowUpRight size={12} />
                </a>
                <button onClick={() => openModal("proteccion")}>
                  Tu ahorro protegido
                </button>
              </div>
              <div className="footer-link-group">
                <h3>Estamos contigo</h3>
                <a href="#ayuda">Preguntas frecuentes</a>
                <button onClick={() => openModal("contact")}>
                  Habla con un asesor
                </button>
                <a href="tel:+524774614700">477 461 4700</a>
                <div className="footer-socials">
                  <a
                    href="https://www.facebook.com/mifosoficial/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MIFOS en Facebook"
                  >
                    f
                  </a>
                  <a
                    href="https://mx.linkedin.com/company/mifos"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MIFOS en LinkedIn"
                  >
                    in
                  </a>
                  <a
                    href="https://x.com/mifos"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="MIFOS en X"
                  >
                    𝕏
                  </a>
                </div>
              </div>
            </div>
            <div className="footer-legal">
              <p>
                MIFOS es el nombre comercial de Company Name, S.A.
                de C.V., S.F.P. Consulta la información regulatoria y las
                condiciones vigentes en el sitio oficial. *El Fondo de
                Protección cubre depósitos elegibles hasta por 25,000 UDIS por
                persona y por institución, conforme a la legislación aplicable.
              </p>
              <p>
                <strong>Experiencia de demostración.</strong> Inspirada en Mifos
                Online Banking. No está conectada a sistemas financieros ni
                procesa operaciones reales. Los saldos, perfiles, historias y
                simulaciones son ilustrativos. No ingreses información personal
                ni credenciales reales.
              </p>
            </div>
            <div className="footer-bottom">
              <span>
                © {new Date().getFullYear()} MIFOS. Todos los derechos
                reservados.
              </span>
              <div>
                <button onClick={() => openModal("privacidad")}>
                  Privacidad
                </button>
                <button onClick={() => openModal("terminos")}>
                  Términos de uso
                </button>
                <a
                  href="https://github.com/openMF/online-banking"
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspirado en Mifos
                  <ArrowUpRight size={12} />
                </a>
              </div>
              <a
                href="#inicio"
                className="back-to-top"
                aria-label="Volver arriba"
              >
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </footer>

        {modal && (
          <Modal
            key={modal}
            title={
              modal === "demo"
                ? "Banca digital de demostración"
                : modal === "login"
                  ? "Acceso a la banca"
                  : modal === "onboarding"
                    ? "Abre tu experiencia de prueba"
                    : modal === "contact"
                      ? "Contacta a MIFOS"
                      : "Información y condiciones"
            }
            wide={modal === "demo"}
            onClose={() => setModal(null)}
          >
            {modal === "login" ? (
              <>
                {sessionNotice && (
                  <LocalizedTree>
                    <p role="status" className="form-note">{sessionNotice}</p>
                  </LocalizedTree>
                )}
                <CustomerAccess
                  onAuthenticated={(session) => {
                    setModal(null);
                    setSessionNotice("");
                    setCustomerSession(session);
                  }}
                  initialSegment={segment}
                  onLogin={authenticated}
                  onRegister={() => setModal("onboarding")}
                />
              </>
            ) : modal === "onboarding" ? (
              <Onboarding
                initialSegment={segment}
                initialProduct={product}
                onComplete={authenticated}
              />
            ) : modal === "contact" ? (
              <Contact initialProduct={product} />
            ) : modal === "demo" ? (
              <Suspense
                fallback={
                  <div className="bank-loading">
                    <LoaderCircle size={30} className="spin" />
                    <p>Preparando tu siguiente paso...</p>
                  </div>
                }
              >
                <DemoBank
                  segment={segment}
                  initialView={demoView}
                  onClose={() => {
                    setModal(null);
                    setToast(
                      "Sesión demo cerrada. Los datos de prueba se han restablecido.",
                    );
                  }}
                  onTimeout={() => {
                    setModal(null);
                    setToast(
                      "Cerramos tu sesión demo después de 10 minutos de inactividad.",
                    );
                  }}
                />
              </Suspense>
            ) : (
              <Legal topic={modal} />
            )}
          </Modal>
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Check size={17} />
              <span>{toast}</span>
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => setToast("")}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </LocalizedTree>
    </MotionConfig>
  );
}

import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowUpRight,
  Image,
  ImageOff,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  SmartphoneNfc,
  TriangleAlert,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { LocalizedTree, translate, translateWith, useI18n, type Locale } from "../i18n";
import {
  ACTIVITY_GROUPS,
  describeActivity,
  selectActivityApi,
  useActivityFeed,
  type ActivityApi,
  type ActivityErrorCode,
  type ActivityGroup,
  type ActivityItem,
  type ActivityType,
} from "../lib/activity";

type Icon = ComponentType<{ size?: number }>;

const ICONS: Record<ActivityType, Icon> = {
  LOGIN: LogIn,
  LOGIN_FAILED: ShieldAlert,
  LOGIN_NEW_DEVICE: MonitorSmartphone,
  LOGOUT: LogOut,
  PASSWORD_CHANGED: KeyRound,
  PASSWORD_RESET: KeyRound,
  TRANSFER_CONFIRMED: ArrowUpRight,
  BENEFICIARY_ADDED: UserPlus,
  BENEFICIARY_UPDATED: Users,
  BENEFICIARY_DELETED: UserMinus,
  PROFILE_IMAGE_CHANGED: Image,
  PROFILE_IMAGE_REMOVED: ImageOff,
  SINPE_SUBSCRIPTION_CHANGED: Smartphone,
  STEP_UP_REQUESTED: LockKeyhole,
  STEP_UP_VERIFIED: ShieldCheck,
  STEP_UP_LOCKED: ShieldAlert,
  AUTHENTICATOR_ENROLLED: SmartphoneNfc,
  AUTHENTICATOR_REMOVED: SmartphoneNfc,
  AUTHENTICATOR_RESET: SmartphoneNfc,
  AUTHENTICATOR_LOCKED: ShieldAlert,
  RECOVERY_CODES_REGENERATED: KeyRound,
  RECOVERY_CODE_USED: KeyRound,
};

/** The chips of the filter, in order. The label is a Spanish source string (catalog key). */
const FILTERS: { id: "all" | ActivityGroup; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "access", label: "Accesos" },
  { id: "money", label: "Transferencias y beneficiarios" },
  { id: "account", label: "Cuenta" },
  { id: "verification", label: "Verificaciones" },
];

const ERRORS: Record<ActivityErrorCode, string> = {
  network: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  session: "Tu sesión terminó. Inicia sesión de nuevo para ver tu actividad.",
  invalid: "No pudimos leer tu actividad. Inténtalo más tarde.",
  unknown: "No pudimos leer tu actividad. Inténtalo más tarde.",
};

function when(occurredAt: string, locale: Locale): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Entry({ item, locale }: { item: ActivityItem; locale: Locale }) {
  const Icon = ICONS[item.type] ?? ShieldCheck;
  const { title, extra, warning } = describeActivity(item, locale);
  return (
    <li className={`activity-entry${warning ? " warning" : ""}`} data-type={item.type}>
      <span className="activity-icon" aria-hidden="true">
        {warning ? <TriangleAlert size={17} /> : <Icon size={17} />}
      </span>
      <div className="activity-text">
        <strong>{title}</strong>
        {extra && <span>{extra}</span>}
        <small>
          <time dateTime={item.occurredAt}>{when(item.occurredAt, locale)}</time>
          {item.ipAddress && (
            <>
              {" · "}IP {item.ipAddress}
            </>
          )}
        </small>
      </div>
      {item.outcome === "FAILURE" && (
        // Entry is its own component: LocalizedTree does not reach into it, so translate here.
        <span className="activity-flag">{translate("No completado")}</span>
      )}
    </li>
  );
}

/**
 * The history of logins and sensitive actions of the user (US-E12-05): what happened, when and
 * from where (masked IP), so that unauthorised use can be spotted. The data comes from an
 * {@link ActivityApi}: the server, or the in-memory demo. Pass `api` in tests.
 */
export function ActivityFeed({ api }: { api?: ActivityApi }) {
  const { locale } = useI18n();
  const source = useMemo(() => api ?? selectActivityApi(), [api]);
  const [filter, setFilter] = useState<"all" | ActivityGroup>("all");
  const types = useMemo(() => (filter === "all" ? [] : [...ACTIVITY_GROUPS[filter]]), [filter]);
  const feed = useActivityFeed(source, types);
  const busy = feed.phase === "loading" || feed.phase === "loading-more";

  return (
    <LocalizedTree>
      <section className="activity-feed" aria-labelledby="activity-feed-title">
        <h3 id="activity-feed-title">Actividad de seguridad</h3>
        <p className="activity-intro">
          Revisa los accesos y las acciones importantes de tu cuenta. Si algo no te suena familiar,
          cambia tu contraseña y contacta a tu institución.
        </p>
        {source.mode === "demo" && (
          <p className="activity-demo">Actividad de demostración: no es información real.</p>
        )}

        <div className="activity-filters" role="group" aria-label={translate("Filtrar actividad")}>
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="activity-chip"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="activity-status" role="status">
          {feed.phase === "loading"
            ? "Cargando tu actividad…"
            : feed.phase === "error"
              ? ""
              : feed.total === 0
                ? ""
                : translateWith("Mostrando {shown} de {total}", {
                    shown: feed.items.length,
                    total: feed.total,
                  })}
        </p>

        {feed.phase === "error" && feed.errorCode && (
          <div className="activity-error">
            <p className="form-error" role="alert">
              {ERRORS[feed.errorCode]}
            </p>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={feed.retry}
            >
              Reintentar
            </button>
          </div>
        )}

        {feed.phase !== "error" && feed.phase !== "loading" && feed.items.length === 0 && (
          <p className="activity-empty">Todavía no hay actividad para mostrar.</p>
        )}

        {feed.items.length > 0 && (
          <ol className="activity-list" aria-label={translate("Lista de actividad")}>
            {feed.items.map((item) => (
              <Entry key={item.id} item={item} locale={locale} />
            ))}
          </ol>
        )}

        {feed.hasMore && feed.phase !== "error" && (
          <button
            type="button"
            className="button button-outline button-small activity-more"
            disabled={busy}
            onClick={feed.loadMore}
          >
            {feed.phase === "loading-more" ? "Cargando…" : "Mostrar más"}
          </button>
        )}
      </section>
    </LocalizedTree>
  );
}

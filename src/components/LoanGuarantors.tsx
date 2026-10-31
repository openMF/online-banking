import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  GuarantorError,
  guarantorMessages,
  guarantorTypeLabel,
  selectGuarantor,
  type Guarantor,
  type GuarantorClient,
} from "../lib/loans/guarantors";

export function LoanGuarantors({
  client,
  loanId,
  onExpired,
}: {
  client: GuarantorClient;
  loanId: number;
  onExpired: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<Guarantor[]>();
  const [selected, setSelected] = useState<number>();
  const [error, setError] = useState<GuarantorError>();
  const [loading, setLoading] = useState(false);
  const expired = useRef(onExpired);
  expired.current = onExpired;
  const heading = useRef<HTMLHeadingElement>(null);
  const entry = useRef<HTMLButtonElement>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setList(undefined);
    setSelected(undefined);
    setError(undefined);
    setLoading(true);
    void client
      .list(loanId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setList(next);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        const safe = e instanceof GuarantorError ? e : new GuarantorError("unavailable");
        setList(undefined);
        setSelected(undefined);
        setError(safe);
        if (safe.code === "expired") expired.current();
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [client, loanId, open, revision]);
  useEffect(() => {
    if (selected != null) heading.current?.focus();
  }, [selected]);
  const detail = selected == null || !list ? undefined : selectGuarantor(list, loanId, selected);
  return (
    <section className="loan-guarantors" aria-label={t("Garantes del préstamo")}>
      <h4>{t("Garantes del préstamo")}</h4>
      {!open ? (
        <button ref={entry} className="button button-outline" onClick={() => setOpen(true)}>
          {t("Ver garantes")}
        </button>
      ) : (
        <>
          <p>{t("Consulta de solo lectura. Para agregar garantes, contacta a tu institución.")}</p>
          {loading && <p role="status">{t("Cargando garantes...")}</p>}
          {error && <p role="alert">{t(guarantorMessages[error.code])}</p>}
          {list?.length === 0 && (
            <p role="status">{t("Este préstamo no tiene garantes registrados.")}</p>
          )}
          {detail ? (
            <div className="guarantor-detail">
              <h5 ref={heading} tabIndex={-1}>
                {t("Detalle del garante")}
              </h5>
              <dl className="loan-details">
                <dt>{t("ID del garante")}</dt>
                <dd>{detail.id}</dd>
                <dt>{t("Nombre del garante")}</dt>
                <dd>{detail.name ?? t("Nombre no disponible")}</dd>
                <dt>{t("Tipo de garante")}</dt>
                <dd>{t(guarantorTypeLabel(detail.typeId))}</dd>
                {detail.relationship && (
                  <>
                    <dt>{t("Relación con el cliente")}</dt>
                    <dd>{detail.relationship}</dd>
                  </>
                )}
                {detail.active != null && (
                  <>
                    <dt>{t("Estado del garante")}</dt>
                    <dd>{t(detail.active ? "Activo" : "Inactivo")}</dd>
                  </>
                )}
              </dl>
              <button
                className="button button-outline"
                onClick={() => {
                  const id = selected;
                  setSelected(undefined);
                  requestAnimationFrame(() => {
                    if (id != null) buttons.current.get(id)?.focus();
                  });
                }}
              >
                {t("Volver a los garantes")}
              </button>
            </div>
          ) : (
            list &&
            list.length > 0 && (
              <ul>
                {list.map((g) => (
                  <li key={g.id}>
                    <span>
                      {g.name ?? t("Nombre no disponible")} · {t(guarantorTypeLabel(g.typeId))}
                    </span>{" "}
                    <button
                      className="button button-outline"
                      ref={(el) => {
                        if (el) buttons.current.set(g.id, el);
                        else buttons.current.delete(g.id);
                      }}
                      onClick={() => setSelected(g.id)}
                    >
                      {t("Ver detalle del garante")} {g.id}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          <div className="loan-actions">
            <button
              className="button button-outline"
              disabled={loading || error?.code === "expired"}
              onClick={() => {
                setList(undefined);
                setSelected(undefined);
                setRevision((v) => v + 1);
              }}
            >
              {t("Actualizar garantes")}
            </button>
            <button
              className="button button-outline"
              onClick={() => {
                setOpen(false);
                setList(undefined);
                setSelected(undefined);
                setError(undefined);
                requestAnimationFrame(() => entry.current?.focus());
              }}
            >
              {t("Volver al detalle del préstamo")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  SurveyError,
  type Survey,
  type SurveyAnswer,
  type SurveyClient,
} from "../lib/surveys/client";

export function SurveyParticipation({
  client,
  clients,
  onExpired,
  onClose,
}: {
  client: SurveyClient;
  clients: readonly number[];
  onExpired: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selected, setSelected] = useState<Survey>();
  const [clientId, setClientId] = useState(clients.length === 1 ? String(clients[0]) : "");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const outcome = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const mounted = useRef(true);

  function fail(failure: unknown) {
    if (!mounted.current) return;
    if (failure instanceof SurveyError && failure.code === "expired") {
      onExpired();
      return;
    }
    setError(
      failure instanceof SurveyError
        ? failure.code === "denied"
          ? "No tienes permiso para acceder a esta encuesta."
          : failure.code === "invalid"
            ? "La encuesta o las respuestas han cambiado. Actualiza la lista e inténtalo de nuevo."
            : failure.code === "uncertain"
              ? "No pudimos confirmar el envío. No vuelvas a enviarlo; contacta con tu institución."
              : "No se pudieron consultar las encuestas. Inténtalo más tarde."
        : "No se pudieron consultar las encuestas. Inténtalo más tarde.",
    );
  }

  useEffect(() => {
    mounted.current = true;
    heading.current?.focus();
    const controller = new AbortController();

    void client.list(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setSurveys(result);
      },
      (failure) => {
        if (!controller.signal.aborted) fail(failure);
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [client]);

  useEffect(() => {
    if (success || error) outcome.current?.focus();
  }, [success, error]);

  function choose(survey: Survey) {
    setSelected(survey);
    setAnswers({});
    setError("");
    setSuccess(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || pending.current || !clientId) return;

    const questions = selected.questionDatas;
    if (questions.some((question) => answers[question.id] === undefined)) {
      setError("Responde todas las preguntas antes de enviar.");
      return;
    }

    const submission: SurveyAnswer[] = questions.map((question) => {
      const response = question.responseDatas.find((item) => item.id === answers[question.id])!;
      return {
        questionId: question.id,
        responseId: response.id,
        value: response.value,
      };
    });

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      await client.submit(Number(clientId), selected, submission);
      if (mounted.current) setSuccess(true);
    } catch (failure) {
      fail(failure);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="savings-application" aria-labelledby="survey-heading" aria-busy={busy || loading}>
      <h2 id="survey-heading" ref={heading} tabIndex={-1}>
        {t("Encuestas")}
      </h2>
      <p className="form-note">
        {t("Participa en las encuestas disponibles y comparte tus respuestas con tu institución.")}
      </p>

      {loading && <p role="status">{t("Consultando encuestas...")}</p>}

      {error && (
        <div role="alert">
          <h3 ref={outcome} tabIndex={-1}>{t(error)}</h3>
        </div>
      )}

      {!clients.length && (
        <p role="status">{t("No hay clientes autorizados para participar en encuestas.")}</p>
      )}

      {clients.length > 0 && !success && (
        <label>
          {t("Cliente autorizado")}
          <select
            value={clientId}
            disabled={busy}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">{t("Selecciona una opción")}</option>
            {clients.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      )}

      {success ? (
        <div className="savings-summary" role="status">
          <h3 ref={outcome} tabIndex={-1}>{t("¡Respuestas enviadas correctamente!")}</h3>
          <p>{t("Tu participación ha sido registrada por tu institución.")}</p>
          <button className="button button-primary" onClick={onClose}>
            {t("Volver al inicio")}
          </button>
        </div>
      ) : selected ? (
        <form className="form-stack" onSubmit={submit}>
          <div className="savings-summary">
            <h3>{t(selected.name)}</h3>
            {selected.description && <p>{t(selected.description)}</p>}
          </div>

          <fieldset disabled={busy}>
            <legend>{t("Tus respuestas")}</legend>
            {selected.questionDatas.map((question, index) => (
              <div className="form-stack" key={question.id}>
                <p>
                  <strong>{index + 1}. {t(question.text)}</strong>
                </p>
                {question.description && <p className="form-note">{t(question.description)}</p>}
                {question.responseDatas
                  .slice()
                  .sort((a, b) => a.sequenceNo - b.sequenceNo)
                  .map((response) => (
                    <label key={response.id}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={response.id}
                        checked={answers[question.id] === response.id}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: response.id }));
                          setError("");
                        }}
                      />
                      {t(response.text)}
                    </label>
                  ))}
              </div>
            ))}
          </fieldset>

          <button className="button button-primary" type="submit" disabled={busy || loading || !clientId}>
            {t(busy ? "Enviando respuestas..." : "Enviar respuestas")}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={busy}
            onClick={() => {
              setSelected(undefined);
              setAnswers({});
              setError("");
            }}
          >
            {t("Volver a las encuestas")}
          </button>
        </form>
      ) : (
        <div className="loan-list">
          {!loading && !surveys.length && !error && (
            <p role="status">{t("No hay encuestas disponibles en este momento.")}</p>
          )}
          {surveys.map((survey) => (
            <button
              key={survey.id}
              className="button button-outline"
              disabled={loading || busy || !clientId || client.isBlocked(survey.id)}
              onClick={() => choose(survey)}
            >
              {t(survey.name)}
            </button>
          ))}
        </div>
      )}

      <div className="loan-actions">
        <button className="button button-outline" disabled={busy} onClick={onClose}>
          {t("Volver al inicio")}
        </button>
      </div>
    </section>
  );
}
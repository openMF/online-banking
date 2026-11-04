import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, LoaderCircle, RefreshCw } from "lucide-react";
import { createReportsClient, type ReportParameter } from "../lib/reports/client";
import type { CustomerSession } from "../lib/authentication/client";

interface Props {
  session: CustomerSession;
  onExpired: () => void;
  onClose: () => void;
}

function parameterName(parameter: ReportParameter): string {
  return String(
    parameter.parameterName ??
    parameter.reportParameterName ??
    parameter.name ??
    "",
  );
}

function parameterLabel(parameter: ReportParameter): string {
  return String(
    parameter.parameterLabel ??
    parameter.displayName ??
    parameter.label ??
    parameterName(parameter),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PersonalReports({ session, onExpired, onClose }: Props) {
  const client = useMemo(() => createReportsClient(session), [session]);

  const [reports, setReports] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [parameters, setParameters] = useState<ReportParameter[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    client.list(controller.signal)
      .then(setReports)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load reports.");
        if ((err as { status?: number })?.status === 401) onExpired();
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [client, onExpired]);

  async function chooseReport(name: string) {
    setSelected(name);
    setParameters([]);
    setValues({});
    setResult(null);
    setError("");
    setLoading(true);

    try {
      const fields = await client.parameters(name);
      setParameters(fields);

      const initial: Record<string, string> = {};
      fields.forEach((field) => {
        const key = parameterName(field);
        if (key && field.defaultValue != null) {
          initial[key] = String(field.defaultValue);
        }
      });
      setValues(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load parameters.");
    } finally {
      setLoading(false);
    }
  }

  async function runReport() {
    if (!selected) return;

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const data = await client.run(selected, values);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run report.");
      if ((err as { status?: number })?.status === 401) onExpired();
    } finally {
      setRunning(false);
    }
  }

  async function exportReport(format: "CSV" | "PDF") {
    if (!selected) return;

    setRunning(true);
    setError("");

    try {
      const blob = await client.download(selected, values, format);
      const safeName = selected.replace(/[^a-z0-9_-]/gi, "_");
      downloadBlob(blob, `${safeName}.${format.toLowerCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
      if ((err as { status?: number })?.status === 401) onExpired();
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="personal-reports">
      <header className="personal-reports-header">
        <button type="button" onClick={onClose} className="personal-reports-back">
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h2>Personal Reports</h2>
          <p>Generate and download your statements and reports.</p>
        </div>
      </header>

      {error && <div className="personal-reports-error" role="alert">{error}</div>}

      {loading ? (
        <div className="personal-reports-loading">
          <LoaderCircle className="spin" size={22} /> Loading reports...
        </div>
      ) : !selected ? (
        <div className="personal-reports-list">
          {reports.length === 0 ? (
            <p>No reports are currently available for self-service.</p>
          ) : reports.map((report) => (
            <button
              type="button"
              className="personal-report-card"
              key={report}
              onClick={() => void chooseReport(report)}
            >
              <FileText size={22} />
              <span>{report}</span>
              <ArrowLeft className="personal-report-arrow" size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="personal-report-form">
          <button type="button" className="personal-reports-back" onClick={() => {
            setSelected("");
            setParameters([]);
            setValues({});
            setResult(null);
            setError("");
          }}>
            <ArrowLeft size={16} /> All reports
          </button>

          <h3>{selected}</h3>

          {parameters.map((parameter, index) => {
            const name = parameterName(parameter);
            if (!name) return null;

            const type = String(parameter.parameterType ?? parameter.type ?? "").toLowerCase();
            const isDate = type.includes("date") || /date/i.test(name);

            return (
              <label className="personal-report-field" key={`${name}-${index}`}>
                <span>{parameterLabel(parameter)}</span>
                <input
                  type={isDate ? "date" : "text"}
                  value={values[name] ?? ""}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    [name]: event.target.value,
                  }))}
                />
              </label>
            );
          })}

          <div className="personal-report-actions">
            <button type="button" onClick={() => void runReport()} disabled={running}>
              {running ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}
              Run report
            </button>
            <button type="button" onClick={() => void exportReport("PDF")} disabled={running}>
              <Download size={17} /> PDF
            </button>
            <button type="button" onClick={() => void exportReport("CSV")} disabled={running}>
              <Download size={17} /> CSV
            </button>
          </div>

          {result !== null && (
            <div className="personal-report-result">
              <h4>Report result</h4>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
import type { CustomerSession } from "../authentication/client";

export type PersonalReport = string;

export interface ReportParameter {
  parameterName?: string;
  parameterLabel?: string;
  reportParameterName?: string;
  label?: string;
  displayName?: string;
  parameterType?: string;
  type?: string;
  defaultValue?: string | number | boolean | null;
  [key: string]: unknown;
}

export class ReportsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ReportsError";
  }
}

function parseArray<T>(data: unknown, label: string): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).data)
  ) {
    return (data as { data: T[] }).data;
  }

  throw new ReportsError(`Invalid ${label} response.`);
}

export function createReportsClient(session: CustomerSession) {
  const base = "/runreports";

  async function get(
    resource: string,
    signal?: AbortSignal,
    query?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const response = await session.request(resource, {
        method: "GET",
        signal,
        query,
      });

      if (!response.ok) {
        throw new ReportsError(
          `Request failed (${response.status}).`,
          response.status,
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof ReportsError) throw error;
      throw new ReportsError(
        error instanceof Error ? error.message : "Unable to load reports.",
      );
    }
  }

  return {
    async list(signal?: AbortSignal): Promise<PersonalReport[]> {
      const data = await get(base, signal);

      const reports = parseArray<unknown>(data, "reports");

      return reports.filter(
        (report): report is string =>
          typeof report === "string" && report.trim().length > 0,
      );
    },

    async parameters(
      reportName: string,
      signal?: AbortSignal,
    ): Promise<ReportParameter[]> {
      const data = await get(
        `${base}/${encodeURIComponent(reportName)}/parameters`,
        signal,
      );

      return parseArray<ReportParameter>(data, "report parameters");
    },

    async run(
      reportName: string,
      parameters: Record<string, string>,
      signal?: AbortSignal,
    ): Promise<unknown> {
      return get(
        `${base}/${encodeURIComponent(reportName)}`,
        signal,
        parameters,
      );
    },

    async download(
      reportName: string,
      parameters: Record<string, string>,
      format: "CSV" | "PDF",
      signal?: AbortSignal,
    ): Promise<Blob> {
      const query = {
        ...parameters,
        ...(format === "CSV"
          ? { exportCSV: "true" }
          : { "output-type": "PDF" }),
      };

      if (!session.download) {
  throw new ReportsError("Report downloads are unavailable.");
}

const response = await session.download(
  `${base}/${encodeURIComponent(reportName)}`,
  { method: "GET", query, signal },
);

      if (!response.ok) {
        throw new ReportsError(
          `Report download failed (${response.status}).`,
          response.status,
        );
      }

      return response.blob;
    },
  };
}

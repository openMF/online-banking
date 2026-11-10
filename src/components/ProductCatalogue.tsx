import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { CustomerSession } from "../lib/authentication/client";
import {
  createSavingsClient,
  type SavingsTemplate,
} from "../lib/savings/client";
import {
  createLoanClient,
  type Template as LoanTemplate,
} from "../lib/loans/client";
import {
  createShareApplicationClient,
  type ShareTerms,
} from "../lib/shares/application";
import { formatMoney } from "../lib/shares/client";

type SavingsProduct = {
  clientId: number;
  productId: number;
  name: string;
  terms?: SavingsTemplate;
};

type LoanProduct = {
  clientId: number;
  productId: number;
  name: string;
  terms?: LoanTemplate;
};

type ShareProduct = {
  clientId: number;
  productId: number;
  name: string;
  terms?: ShareTerms;
};

const periods = ["Días", "Semanas", "Meses", "Años"];

function isExpired(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "expired"
  );
}

export function ProductCatalogue({
  session,
  onClose,
  onExpired,
}: {
  session: CustomerSession;
  onClose: () => void;
  onExpired: () => void;
}) {
  const { t, locale } = useI18n();

  const [savings, setSavings] = useState<SavingsProduct[]>([]);
  const [loans, setLoans] = useState<LoanProduct[]>([]);
  const [shares, setShares] = useState<ShareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(false);

      const savingsClient = createSavingsClient(session);
      const loanClient = createLoanClient(session);
      const shareClient = createShareApplicationClient(session);

      const savingsResults: SavingsProduct[] = [];
      const loanResults: LoanProduct[] = [];
      const shareResults: ShareProduct[] = [];

      let failed = false;
      let loanProductsLoaded = false;

      // Load loan products once before checking client eligibility.
      try {
        await loanClient.loadProducts(controller.signal);
        loanProductsLoaded = true;
      } catch (e) {
        if (isExpired(e)) {
          onExpired();
          return;
        }
        failed = true;
      }

      for (const clientId of session.identity.clients) {
        if (controller.signal.aborted) return;

        // Savings products
        try {
          const template = await savingsClient.loadTemplate(
            clientId,
            undefined,
            controller.signal,
          );

          for (const product of template.products) {
            if (controller.signal.aborted) return;

            let terms: SavingsTemplate | undefined;

            try {
              terms = await savingsClient.loadTemplate(
                clientId,
                product.id,
                controller.signal,
              );
            } catch (e) {
              if (isExpired(e)) throw e;
              failed = true;
            }

            savingsResults.push({
              clientId,
              productId: product.id,
              name: product.name,
              terms,
            });
          }
        } catch (e) {
          if (isExpired(e)) {
            onExpired();
            return;
          }
          failed = true;
        }

        // Loan products
        if (loanProductsLoaded) {
          try {
            const products = await loanClient.eligibleProducts(
              clientId,
              controller.signal,
            );

            for (const product of products) {
              if (controller.signal.aborted) return;

              let terms: LoanTemplate | undefined;

              try {
                terms = await loanClient.loadTemplate(
                  clientId,
                  product.id,
                  controller.signal,
                );
              } catch (e) {
                if (isExpired(e)) throw e;
                failed = true;
              }

              loanResults.push({
                clientId,
                productId: product.id,
                name: product.name,
                terms,
              });
            }
          } catch (e) {
            if (isExpired(e)) {
              onExpired();
              return;
            }
            failed = true;
          }
        }

        // Share products
        try {
          const products = await shareClient.loadProducts(
            clientId,
            controller.signal,
          );

          for (const product of products) {
            if (controller.signal.aborted) return;

            let terms: ShareTerms | undefined;

            try {
              terms = await shareClient.loadTerms(
                clientId,
                product.id,
                controller.signal,
              );
            } catch (e) {
              if (isExpired(e)) throw e;
              failed = true;
            }

            shareResults.push({
              clientId,
              productId: product.id,
              name: product.name,
              terms,
            });
          }
        } catch (e) {
          if (isExpired(e)) {
            onExpired();
            return;
          }
          failed = true;
        }
      }

      if (!mounted || controller.signal.aborted) return;

      setSavings(savingsResults);
      setLoans(loanResults);
      setShares(shareResults);
      setError(failed);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [session, onExpired]);

  function money(value: number, currency: string, decimals = 2) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function heading(title: string, count: number) {
    return (
      <h3>
        {t(title)} <span>({count})</span>
      </h3>
    );
  }

  return (
    <section
      className="savings-application"
      aria-labelledby="catalogue-heading"
    >
      <h2 id="catalogue-heading" tabIndex={-1} ref={headingRef}>
        {t("Productos disponibles")}
      </h2>

      <p className="form-note">
        {t(
          "Explora los productos de ahorro, préstamo y acciones que ofrece tu institución. La disponibilidad y las condiciones finales serán confirmadas por tu institución.",
        )}
      </p>

      {loading && (
        <p role="status">
          {t("Consultando productos y condiciones...")}
        </p>
      )}

      {error &&
        (savings.length > 0 || loans.length > 0 || shares.length > 0) && (
          <p role="status">
            {t(
              "No pudimos cargar parte de la información de los productos. Aquí se muestran los resultados disponibles.",
            )}
          </p>
        )}

      {error &&
        !loading &&
        !savings.length &&
        !loans.length &&
        !shares.length && (
          <p role="status">
            {t("La información de los productos no está disponible por ahora.")}
          </p>
        )}

      {!error &&
        !loading &&
        !savings.length &&
        !loans.length &&
        !shares.length && (
          <p role="status">
            {t("No hay productos disponibles para tus cuentas autorizadas.")}
          </p>
        )}

      {savings.length > 0 && (
        <div className="savings-summary">
          {heading("Productos de ahorro", savings.length)}

          {savings.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Cliente autorizado")}: {product.clientId}
              </p>

              {product.terms ? (
                <dl>
                  {product.terms.currency && (
                    <>
                      <dt>{t("Moneda")}</dt>
                      <dd>{product.terms.currency.code}</dd>
                    </>
                  )}

                  {product.terms.rate != null && (
                    <>
                      <dt>{t("Tasa de interés anual")}</dt>
                      <dd>{product.terms.rate}%</dd>
                    </>
                  )}

                  {product.terms.openingBalance != null &&
                    product.terms.currency && (
                      <>
                        <dt>{t("Depósito mínimo de apertura")}</dt>
                        <dd>
                          {money(
                            product.terms.openingBalance,
                            product.terms.currency.code,
                            product.terms.currency.decimalPlaces,
                          )}
                        </dd>
                      </>
                    )}

                  {product.terms.chargeTerms.length > 0 && (
                    <>
                      <dt>{t("Cargos del producto")}</dt>
                      <dd>
                        {product.terms.chargeTerms
                          .map(
                            (charge) =>
                              `${charge.name}: ${charge.amount}${charge.percent ? "%" : ""}`,
                          )
                          .join(" · ")}
                      </dd>
                    </>
                  )}
                </dl>
              ) : (
                <p>
                  {t(
                    "Las condiciones detalladas del producto no están disponibles.",
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {loans.length > 0 && (
        <div className="savings-summary">
          {heading("Productos de préstamo", loans.length)}

          {loans.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Cliente autorizado")}: {product.clientId}
              </p>

              {product.terms ? (
                <>
                  <dl>
                    <dt>{t("Moneda")}</dt>
                    <dd>{product.terms.currency}</dd>

                    {product.terms.fields
                      .filter((field) =>
                        ["principal", "loanTermFrequency"].includes(field.key),
                      )
                      .map((field) => (
                        <div key={field.key}>
                          <dt>{t(field.label)}</dt>
                          <dd>
                            {field.min != null &&
                              `${t("Mínimo")}: ${field.min}`}
                            {field.min != null &&
                              field.max != null &&
                              " · "}
                            {field.max != null &&
                              `${t("Máximo")}: ${field.max}`}
                            {field.hint && ` (${t(field.hint)})`}
                          </dd>
                        </div>
                      ))}
                  </dl>

                  {product.terms.charges.length > 0 && (
                    <div>
                      <strong>{t("Cargos del producto")}</strong>
                      {product.terms.charges.map((charge) => (
                        <p key={charge.chargeId}>
                          {charge.name}: {charge.amount} · {charge.basis}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p>
                  {t(
                    "Las condiciones detalladas del producto no están disponibles.",
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {shares.length > 0 && (
        <div className="savings-summary">
          {heading("Productos de acciones", shares.length)}

          {shares.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Cliente autorizado")}: {product.clientId}
              </p>

              {product.terms ? (
                <dl>
                  <dt>{t("Moneda")}</dt>
                  <dd>{product.terms.currency.code}</dd>

                  <dt>{t("Precio unitario")}</dt>
                  <dd>
                    {formatMoney(
                      product.terms.unitPrice,
                      product.terms.currency,
                      locale,
                    )}
                  </dd>

                  {product.terms.minimum != null && (
                    <>
                      <dt>{t("Mínimo de acciones")}</dt>
                      <dd>{product.terms.minimum}</dd>
                    </>
                  )}

                  {product.terms.nominal != null && (
                    <>
                      <dt>{t("Acciones nominales")}</dt>
                      <dd>{product.terms.nominal}</dd>
                    </>
                  )}

                  {product.terms.maximum != null && (
                    <>
                      <dt>{t("Máximo de acciones")}</dt>
                      <dd>{product.terms.maximum}</dd>
                    </>
                  )}

                  {product.terms.lockin && (
                    <>
                      <dt>{t("Periodo de bloqueo")}</dt>
                      <dd>
                        {product.terms.lockin.count} {t(periods[product.terms.lockin.unit])}
                      </dd>
                    </>
                  )}

                  {product.terms.charges.length > 0 && (
                    <>
                      <dt>{t("Cargos del producto")}</dt>
                      <dd>
                        {product.terms.charges
                          .map((charge) => `${charge.name}: ${charge.amount}`)
                          .join(" · ")}
                      </dd>
                    </>
                  )}
                </dl>
              ) : (
                <p>
                  {t(
                    "Las condiciones detalladas del producto no están disponibles.",
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="button button-outline"
        onClick={onClose}
      >
        {t("Volver al inicio")}
      </button>
    </section>
  );
}
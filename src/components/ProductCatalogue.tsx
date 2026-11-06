import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import type { CustomerSession } from "../lib/authentication/client";
import { createSavingsClient, type SavingsTemplate } from "../lib/savings/client";
import { createLoanClient, type Template as LoanTemplate } from "../lib/loans/client";
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
    <section className="savings-application" aria-labelledby="catalogue-heading">
      <h2 id="catalogue-heading" tabIndex={-1}>
        {t("Available Products")}
      </h2>

      <p className="form-note">
        {t(
          "Browse savings, loan and share products offered by your institution. Product availability and final terms are confirmed by your institution.",
        )}
      </p>

      {loading && (
        <p role="status">
          {t("Loading available products and conditions...")}
        </p>
      )}

      {error && (
        <p role="status">
          {t("Some product information could not be loaded. Available results are shown below.")}
        </p>
      )}

      {!loading && !savings.length && !loans.length && !shares.length && (
        <p role="status">
          {t("No products are currently available for your authorized accounts.")}
        </p>
      )}

      {savings.length > 0 && (
        <div className="savings-summary">
          {heading("Savings Products", savings.length)}

          {savings.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Authorized client")}: {product.clientId}
              </p>

              {product.terms ? (
                <dl>
                  {product.terms.currency && (
                    <>
                      <dt>{t("Currency")}</dt>
                      <dd>{product.terms.currency.code}</dd>
                    </>
                  )}

                  {product.terms.rate != null && (
                    <>
                      <dt>{t("Annual interest rate")}</dt>
                      <dd>{product.terms.rate}%</dd>
                    </>
                  )}

                  {product.terms.openingBalance != null &&
                    product.terms.currency && (
                      <>
                        <dt>{t("Minimum opening balance")}</dt>
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
                      <dt>{t("Product charges")}</dt>
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
                <p>{t("Detailed product conditions are unavailable.")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {loans.length > 0 && (
        <div className="savings-summary">
          {heading("Loan Products", loans.length)}

          {loans.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Authorized client")}: {product.clientId}
              </p>

              {product.terms ? (
                <>
                  <dl>
                    <dt>{t("Currency")}</dt>
                    <dd>{product.terms.currency}</dd>

                    {product.terms.fields
                      .filter((field) =>
                        ["principal", "loanTermFrequency"].includes(field.key),
                      )
                      .map((field) => (
                        <div key={field.key}>
                          <dt>{t(field.label)}</dt>
                          <dd>
                            {field.min != null && `${t("Minimum")}: ${field.min}`}
                            {field.min != null && field.max != null && " · "}
                            {field.max != null && `${t("Maximum")}: ${field.max}`}
                            {field.hint && ` (${t(field.hint)})`}
                          </dd>
                        </div>
                      ))}
                  </dl>

                  {product.terms.charges.length > 0 && (
                    <div>
                      <strong>{t("Product charges")}</strong>
                      {product.terms.charges.map((charge) => (
                        <p key={charge.chargeId}>
                          {charge.name}: {charge.amount} · {charge.basis}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p>{t("Detailed product conditions are unavailable.")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {shares.length > 0 && (
        <div className="savings-summary">
          {heading("Share Products", shares.length)}

          {shares.map((product) => (
            <div key={`${product.clientId}-${product.productId}`}>
              <h4>{product.name}</h4>
              <p className="form-note">
                {t("Authorized client")}: {product.clientId}
              </p>

              {product.terms ? (
                <dl>
                  <dt>{t("Currency")}</dt>
                  <dd>{product.terms.currency.code}</dd>

                  <dt>{t("Unit price")}</dt>
                  <dd>
                    {formatMoney(
                      product.terms.unitPrice,
                      product.terms.currency,
                      locale,
                    )}
                  </dd>

                  {product.terms.minimum != null && (
                    <>
                      <dt>{t("Minimum shares")}</dt>
                      <dd>{product.terms.minimum}</dd>
                    </>
                  )}

                  {product.terms.nominal != null && (
                    <>
                      <dt>{t("Nominal shares")}</dt>
                      <dd>{product.terms.nominal}</dd>
                    </>
                  )}

                  {product.terms.maximum != null && (
                    <>
                      <dt>{t("Maximum shares")}</dt>
                      <dd>{product.terms.maximum}</dd>
                    </>
                  )}

                  {product.terms.lockin && (
                    <>
                      <dt>{t("Lock-in period")}</dt>
                      <dd>
                        {product.terms.lockin.count} ({product.terms.lockin.unit})
                      </dd>
                    </>
                  )}

                  {product.terms.charges.length > 0 && (
                    <>
                      <dt>{t("Product charges")}</dt>
                      <dd>
                        {product.terms.charges
                          .map((charge) => `${charge.name}: ${charge.amount}`)
                          .join(" · ")}
                      </dd>
                    </>
                  )}
                </dl>
              ) : (
                <p>{t("Detailed product conditions are unavailable.")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="button button-outline" onClick={onClose}>
        {t("Back to dashboard")}
      </button>
    </section>
  );
}
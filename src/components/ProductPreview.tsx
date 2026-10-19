import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  House,
  Landmark,
  ListFilter,
  LockKeyhole,
  Send,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { money, type BankView, type Product, type Segment } from "../lib/demo";
import { LocalizedTree } from "../i18n";

export default function ProductPreview({
  product,
  segment,
  onDemo,
  onContact,
}: {
  product: Product;
  segment: Segment;
  onDemo: (view?: BankView) => void;
  onContact: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [previewTab, setPreviewTab] = useState<"overview" | "activity">(
    "overview",
  );
  const [investment, setInvestment] = useState(50000);
  const [days, setDays] = useState(180);
  const [credit, setCredit] = useState(100000);
  const [months, setMonths] = useState(24);
  const monthlyPayment = (credit * 0.02) / (1 - Math.pow(1.02, -months));

  return (
    <LocalizedTree>
      <div className="product-browser">
        <div className="browser-top">
          <span className="browser-dots">
            <i />
            <i />
            <i />
          </span>
          <span>
            <LockKeyhole size={10} />
            MIFOS · Vista previa
          </span>
          <span className="browser-demo-label">DEMO</span>
        </div>
        <div className="browser-inner">
          <nav className="mini-sidebar" aria-label="Vista previa de la banca">
            <span className="mini-brand-mark">A</span>
            <button
              className={previewTab === "overview" ? "selected" : ""}
              aria-label="Ver resumen de la vista previa"
              onClick={() =>
                product === "cuenta"
                  ? setPreviewTab("overview")
                  : onDemo("overview")
              }
            >
              <House size={17} />
            </button>
            <button
              aria-label="Probar una transferencia"
              onClick={() => onDemo("transfer")}
            >
              <ArrowUpRight size={18} />
            </button>
            <button
              className={previewTab === "activity" ? "selected" : ""}
              aria-label="Ver movimientos de la vista previa"
              onClick={() =>
                product === "cuenta"
                  ? setPreviewTab("activity")
                  : onDemo("activity")
              }
            >
              <ListFilter size={17} />
            </button>
            <button
              aria-label="Explorar beneficiarios"
              onClick={() => onDemo("beneficiaries")}
            >
              <Users size={17} />
            </button>
            <button
              className="mini-settings"
              aria-label="Explorar mi cuenta demo"
              onClick={() => onDemo()}
            >
              <Settings2 size={17} />
            </button>
          </nav>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={product}
              className="mini-main"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {product === "cuenta" ? (
                <>
                  <div className="mini-greeting">
                    <div>
                      <p>QUÉ BUENO TENERTE AQUÍ</p>
                      <h4>
                        Hola,{" "}
                        {segment === "empresas" ? "Estudio Norte" : "Mariana"}.
                      </h4>
                    </div>
                    <span className="mini-avatar">
                      {segment === "empresas" ? "EN" : "ML"}
                    </span>
                  </div>
                  {previewTab === "overview" && (
                    <>
                      <div className="mini-balance">
                        <p>
                          Tu saldo total
                          <button
                            aria-label={
                              hidden
                                ? "Mostrar saldo de vista previa"
                                : "Ocultar saldo de vista previa"
                            }
                            className="icon-button"
                            onClick={() => setHidden(!hidden)}
                          >
                            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </p>
                        <div>
                          <strong>
                            {hidden
                              ? "••••••••"
                              : money(
                                  segment === "empresas" ? 71280000 : 21568050,
                                )}
                          </strong>
                          <span>MXN</span>
                        </div>
                        <span className="mini-balance-note">
                          <span />
                          Tu dinero. Todo en un solo lugar.
                        </span>
                      </div>
                      <div className="mini-accounts">
                        <button onClick={() => onDemo()}>
                          <span>
                            <Wallet size={13} />
                            Cuenta MIFOS
                            <ChevronRight size={12} />
                          </span>
                          <strong>
                            {hidden
                              ? "••••••"
                              : money(
                                  segment === "empresas" ? 53280000 : 12845000,
                                )}
                          </strong>
                          <small>Disponible para tus planes</small>
                        </button>
                        <button onClick={() => onDemo()}>
                          <span>
                            <Landmark size={13} />
                            Mi ahorro
                            <ChevronRight size={12} />
                          </span>
                          <strong>
                            {hidden
                              ? "••••••"
                              : money(
                                  segment === "empresas" ? 18000000 : 8723050,
                                )}
                          </strong>
                          <small>Un paso más hacia tu meta</small>
                        </button>
                      </div>
                    </>
                  )}
                  <div className="mini-activity-title">
                    <h5>
                      {previewTab === "overview"
                        ? "Últimos movimientos"
                        : "Tus movimientos"}
                    </h5>
                    <button
                      className="mini-transfer"
                      onClick={() => onDemo("transfer")}
                    >
                      <Send size={12} />
                      Transferir
                    </button>
                  </div>
                  <div className="mini-transactions">
                    {[
                      {
                        name:
                          segment === "empresas"
                            ? "Pago de cliente"
                            : "Depósito de nómina",
                        date: "Hoy",
                        amount: segment === "empresas" ? 8500000 : 2850000,
                      },
                      {
                        name: "Café de la mañana",
                        date: "Ayer",
                        amount: -14500,
                      },
                      ...(previewTab === "activity"
                        ? [
                            {
                              name: "Transferencia a Sofía",
                              date: "Ayer",
                              amount: -250000,
                            },
                            {
                              name: "Aportación a mi ahorro",
                              date: "Esta semana",
                              amount: -500000,
                            },
                          ]
                        : []),
                    ].map((item) => (
                      <div key={item.name}>
                        <span className={item.amount > 0 ? "is-positive" : ""}>
                          {item.amount > 0 ? (
                            <ArrowDownLeft size={15} />
                          ) : (
                            <ArrowUpRight size={15} />
                          )}
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.date}</small>
                        </span>
                        <b className={item.amount > 0 ? "positive" : ""}>
                          {hidden
                            ? "••••"
                            : `${item.amount > 0 ? "+" : "-"}${money(Math.abs(item.amount))}`}
                        </b>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mini-view-all"
                    onClick={() => onDemo("activity")}
                  >
                    Ver todos mis movimientos
                    <ArrowRight size={12} />
                  </button>
                </>
              ) : (
                <div className="preview-calculator">
                  <p className="calculator-eyebrow">SIMULADOR ILUSTRATIVO</p>
                  <h4>
                    {product === "inversion"
                      ? "Tu próximo logro empieza hoy."
                      : "Dale forma a ese gran proyecto."}
                  </h4>
                  <label className="range-label" htmlFor="preview-amount">
                    {product === "inversion"
                      ? "¿Cuánto te gustaría invertir?"
                      : "¿Cuánto necesita tu proyecto?"}
                    <strong>
                      {money(
                        (product === "inversion" ? investment : credit) * 100,
                      )}
                      <small>MXN</small>
                    </strong>
                  </label>
                  <input
                    id="preview-amount"
                    type="range"
                    min={product === "inversion" ? 1000 : 5000}
                    max="500000"
                    step={product === "inversion" ? 1000 : 5000}
                    value={product === "inversion" ? investment : credit}
                    onChange={(event) =>
                      product === "inversion"
                        ? setInvestment(Number(event.target.value))
                        : setCredit(Number(event.target.value))
                    }
                  />
                  <div className="range-extents">
                    <span>{product === "inversion" ? "$1,000" : "$5,000"}</span>
                    <span>$500,000</span>
                  </div>
                  <label className="term-label">Elige un plazo de prueba</label>
                  <div className="calculator-terms">
                    {(product === "inversion"
                      ? [90, 180, 365]
                      : [12, 24, 36]
                    ).map((value) => (
                      <button
                        key={value}
                        className={
                          (product === "inversion" ? days : months) === value
                            ? "selected"
                            : ""
                        }
                        aria-pressed={
                          (product === "inversion" ? days : months) === value
                        }
                        onClick={() =>
                          product === "inversion"
                            ? setDays(value)
                            : setMonths(value)
                        }
                      >
                        {value} {product === "inversion" ? "días" : "meses"}
                      </button>
                    ))}
                  </div>
                  <div className="calculator-result" aria-live="polite">
                    <span>
                      {product === "inversion"
                        ? "Monto final ilustrativo, antes de impuestos"
                        : "Pago mensual ilustrativo, sin cargos adicionales"}
                    </span>
                    <strong>
                      {money(
                        Math.round(
                          (product === "inversion"
                            ? investment * (1 + (0.08 * days) / 365)
                            : monthlyPayment) * 100,
                        ),
                      )}
                      <small>MXN</small>
                    </strong>
                  </div>
                  <p className="calculator-disclaimer">
                    {product === "inversion"
                      ? "Ejemplo con tasa fija hipotética del 8% anual, interés simple, base 365 días. No es una tasa ofrecida ni incluye impuestos."
                      : "Ejemplo a tasa hipotética fija del 24% anual. Excluye IVA, comisiones y seguros. No es una cotización ni un CAT."}
                  </p>
                  <button
                    className="button button-primary button-small"
                    onClick={onContact}
                  >
                    Consultar condiciones reales
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LocalizedTree>
  );
}

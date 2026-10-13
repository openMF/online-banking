import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { otpAt, otpValid } from "@/lib/banca/model";
import { Button, Modal } from "@/components/banca/ui";

type Ask = (onSuccess: () => void) => void;

const OtpContext = createContext<Ask | null>(null);

export function useAskOtp() {
  const ask = useContext(OtpContext);
  if (!ask) throw new Error("Clave dinámica no disponible");
  return ask;
}

export function OtpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef<(() => void) | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [open]);

  const code = otpAt(0, now);
  const remain = 30 - (Math.floor(now / 1000) % 30);

  function ask(onSuccess: () => void) {
    pending.current = onSuccess;
    setDigits(Array(6).fill(""));
    setError("");
    setNow(Date.now());
    setOpen(true);
  }

  function close() {
    pending.current = null;
    setOpen(false);
  }

  function accept(next = digits) {
    const value = next.join("");
    if (!otpValid(value)) {
      setError("La clave dinámica no es válida o acaba de expirar. Use la clave vigente del token.");
      return;
    }
    const fn = pending.current;
    pending.current = null;
    setOpen(false);
    fn?.();
  }

  function fillDemo() {
    const next = code.split("");
    setDigits(next);
    setError("");
  }

  return (
    <OtpContext.Provider value={ask}>
      {children}
      {open ? (
        <Modal
          title="Clave dinámica"
          onClose={close}
          footer={
            <>
              <Button variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button onClick={() => accept()}>Aceptar</Button>
            </>
          }
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-paper text-ink">
              <Smartphone className="size-5" />
            </div>
            <p className="text-sm text-muted">
              Esta operación requiere un segundo factor de autenticación categoría 3, distinto del que usó para
              entrar. En producción la clave se genera en su banca móvil y no aparece en este canal.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-paper p-3">
            <p className="text-xs font-medium tracking-wide text-muted">Token de demostración</p>
            <p className="num mt-1 text-3xl font-semibold tracking-widest text-ink">{code}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-brand" style={{ width: `${(remain / 30) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>Cambia en {remain}s</span>
              <button type="button" className="font-semibold text-brand" onClick={fillDemo}>
                Usar esta clave
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Dígito ${index + 1} de la clave dinámica`}
                maxLength={1}
                value={digit}
                className="num size-11 rounded-md border border-line text-center text-lg font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "").slice(-1);
                  const next = digits.slice();
                  next[index] = value;
                  setDigits(next);
                  if (value && index < 5) inputs.current[index + 1]?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                  if (event.key === "Enter") accept();
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (!pasted) return;
                  event.preventDefault();
                  const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
                  setDigits(next);
                  inputs.current[Math.min(pasted.length, 5)]?.focus();
                }}
              />
            ))}
          </div>
          {error ? <p className="mt-3 text-center text-xs text-brand">{error}</p> : null}
        </Modal>
      ) : null}
    </OtpContext.Provider>
  );
}

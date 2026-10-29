import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { LocaleToggle, LocalizedTree } from "../i18n";
import { NetworkStatus } from "./NetworkStatus";

export function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <LocalizedTree>
      <span
        className={`brand ${light ? "brand-light" : ""} ${compact ? "brand-compact" : ""}`}
        aria-label="MIFOS"
      >
        <svg
          className="brand-mark"
          viewBox="0 0 35 38"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 34 15.2 3H22L8.2 34H1Z" fill="currentColor" />
          <path
            d="m21.2 8.5 13 25.5h-8.1l-8.9-17.7 4-7.8Z"
            fill="currentColor"
          />
          <path d="M12.7 26h13.2l3.2 6.2H10L12.7 26Z" fill="currentColor" />
        </svg>
        <span className="brand-name">
          MIFOS
          <span className="brand-descriptor">CRÉDITO · AHORRO · INVERSIÓN</span>
        </span>
      </span>
    </LocalizedTree>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p className={`eyebrow ${light ? "eyebrow-light" : ""}`}>
      <span />
      {children}
    </p>
  );
}

export function TextLink({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button className={`text-link ${className}`} onClick={onClick}>
      {children}
      <ArrowUpRight size={17} />
    </button>
  );
}

export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <LocalizedTree>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className={`app-dialog ${wide ? "app-dialog-wide" : ""}`}
        onCancel={(event) => {
          event.preventDefault();
          closeRef.current();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeRef.current();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          // Keep focus cycling inside the dialog rather than the browser chrome.
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (element) =>
              element.getClientRects().length &&
              getComputedStyle(element).visibility !== "hidden",
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        {/* A modal dialog is in the top layer and makes the rest of the page inert, so the indicator
            of the page cannot be seen or heard while it is open: this one is its own. */}
        <NetworkStatus inDialog />
        <motion.div
          className="dialog-content"
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
          <div className="dialog-locale">
            <LocaleToggle compact />
          </div>
          <button
            className="dialog-close icon-button"
            aria-label="Cerrar ventana"
            onClick={onClose}
            title="Cerrar"
          >
            <X size={21} />
          </button>
          {children}
        </motion.div>
      </dialog>
    </LocalizedTree>
  );
}

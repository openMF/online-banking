import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-4 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand hover:bg-brand-deep",
        ink: "bg-ink text-on-ink hover:bg-ink-soft",
        ghost: "border border-line bg-card text-ink hover:bg-paper",
        quiet: "bg-transparent text-ink hover:bg-paper",
      },
      size: {
        md: "h-11 text-sm",
        sm: "h-10 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-brand">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink outline-none transition-shadow placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" className="fill-brand" />
      <circle cx="32" cy="32" r="28.5" fill="none" className="stroke-on-brand" strokeWidth="1.25" />
      <path className="fill-on-brand" d="M16.5 50.5 32 12.5 47.5 50.5h-7.2L32 29.8 23.7 50.5z" />
      <path className="fill-brand" d="M28.2 40.2h7.6L32 30.6z" />
    </svg>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[92vh] w-full overflow-auto rounded-lg bg-card shadow-2xl",
          wide ? "max-w-lg" : "max-w-md",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-on-ink">
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-on-ink hover:bg-ink-soft"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 px-5 pb-5">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-card", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

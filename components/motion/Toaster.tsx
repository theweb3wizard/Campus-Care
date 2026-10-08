"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { tokens } from "./tokens";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
};

type ToastInput = {
  kind?: ToastKind;
  title: string;
  body?: string;
};

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const barColors = {
  success: "bg-[var(--primary)]",
  error: "bg-[var(--emergency)]",
  info: "bg-[var(--secondary)]",
} as const;

/** Global toast host. Calm fade/slide, auto-dismiss 4s, reduced-motion safe. */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = idRef.current++;
      const kind = input.kind ?? "success";
      setToasts((prev) => [...prev.slice(-2), { id, kind, title: input.title, body: input.body }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.kind];
            return (
              <motion.div
                key={t.id}
                role={t.kind === "error" ? "alert" : "status"}
                initial={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: tokens.notice.duration, ease: tokens.notice.ease }}
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg"
              >
                <span aria-hidden className={`mt-0.5 size-2.5 shrink-0 rounded-full ${barColors[t.kind]}`} />
                <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">{t.title}</p>
                  {t.body ? (
                    <p className="mt-0.5 text-sm leading-snug text-[var(--muted-foreground)]">{t.body}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px] hover:bg-[var(--background)]"
                >
                  <X size={18} aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

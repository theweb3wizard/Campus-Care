"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { tokens } from "./tokens";

/** Success confirmation popup: calm modal, one primary action. */
export function SuccessDialog({
  open,
  onOpenChange,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel = "Close",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={reduce ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: tokens.overlay.duration }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
              <Dialog.Content asChild>
                <motion.div
                  className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center"
                  initial={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: tokens.modal.duration, ease: tokens.modal.ease }}
                >
                  <span
                    aria-hidden
                    className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-fg)]"
                  >
                    <CheckCircle2 size={26} />
                  </span>
                  <Dialog.Title className="font-display mt-3 text-xl font-bold">{title}</Dialog.Title>
                  <Dialog.Description className="mx-auto mt-2 max-w-sm text-base text-[var(--muted-foreground)]">
                    {body}
                  </Dialog.Description>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border border-[var(--border)] px-6 font-semibold"
                      >
                        {secondaryLabel}
                      </button>
                    </Dialog.Close>
                    {actionHref ? (
                      <Link
                        href={actionHref}
                        onClick={() => onOpenChange(false)}
                        className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)]"
                      >
                        {actionLabel ?? "Continue"}
                      </Link>
                    ) : actionLabel ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAction?.();
                          onOpenChange(false);
                        }}
                        className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)]"
                      >
                        {actionLabel}
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { tokens } from "./tokens";

/** Destructive confirm: focus-trapped dialog, calm enter, default-safe action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel = "Keep visit",
  busyLabel = "Working…",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
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
                  className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
                  initial={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: tokens.modal.duration, ease: tokens.modal.ease }}
                >
                  <Dialog.Title className="font-display text-xl font-bold">{title}</Dialog.Title>
                  <Dialog.Description className="mt-2 text-base text-[var(--muted-foreground)]">
                    {body}
                  </Dialog.Description>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        disabled={busy}
                        autoFocus
                        className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
                      >
                        {cancelLabel}
                      </button>
                    </Dialog.Close>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onConfirm}
                      className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[#991b1b] px-6 font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? busyLabel : confirmLabel}
                    </button>
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

/** Convenience hook for a confirm dialog. */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

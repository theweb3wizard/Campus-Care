/** Motion tokens — cubic easings only, transforms/opacity only. See docs/DESIGN.md. */
export const tokens = {
  tap: { duration: 0.12, ease: [0.2, 0, 0, 1] as const },
  reveal: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  modal: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  overlay: { duration: 0.18, ease: "easeOut" as const },
  notice: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  spinner: { duration: 0.7, ease: "linear" as const },
} as const;

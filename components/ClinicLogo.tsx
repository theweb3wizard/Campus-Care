type ClinicLogoProps = {
  size?: number;
  variant?: "solid" | "mono";
  className?: string;
};

/**
 * Campus Care logo — Cross-Book mark.
 * White cross + open book on solid rounded square.
 * Single SVG, no gradients, photocopy-safe.
 */
export function ClinicLogo({ size = 32, variant = "solid", className }: ClinicLogoProps) {
  const bg = variant === "mono" ? "currentColor" : "#0f766e";
  const fg = variant === "mono" ? "#ffffff" : "#ffffff";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Campus Care logo"
      className={className}
    >
      <rect x="1" y="1" width="30" height="30" rx="7" fill={bg} />
      {/* vertical bar of cross */}
      <rect x="13" y="6" width="6" height="20" rx="1.5" fill={fg} />
      {/* horizontal bar shaped as open book */}
      <path
        d="M6 12.5h20v6H6z"
        fill={fg}
      />
      {/* book notch */}
      <path
        d="M16 12.5c-1.2 1-2.8 1.4-4.5 1.2v3.6c1.7.2 3.3-.2 4.5-1.2 1.2 1 2.8 1.4 4.5 1.2v-3.6c-1.7.2-3.3-.2-4.5-1.2z"
        fill={bg}
      />
    </svg>
  );
}

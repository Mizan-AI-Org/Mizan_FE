import React from "react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
  /** Show wordmark beside the mark */
  withWordmark?: boolean;
  wordmarkClassName?: string;
};

const sizeMap = {
  sm: { mark: 24, wordmark: "text-[0.95rem]", gap: "gap-2" },
  md: { mark: 28, wordmark: "text-[1.0625rem]", gap: "gap-2" },
  lg: { mark: 36, wordmark: "text-[1.375rem]", gap: "gap-2.5" },
};

/**
 * Canonical Mizan mark: green annulus with a concentric green core.
 * The ring colour is a fixed brand value, so it stays correct on any surface.
 */
export function MizanMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-[hsl(var(--brand-mark))]", className)}
      aria-hidden
    >
      <circle
        cx="16"
        cy="16"
        r="14.1"
        stroke="currentColor"
        strokeWidth="3.8"
        fill="none"
      />
      <circle cx="16" cy="16" r="5.6" fill="currentColor" />
    </svg>
  );
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "sm",
  className,
  ariaLabel,
  withWordmark = false,
  wordmarkClassName,
}) => {
  const s = sizeMap[size];
  return (
    <span
      className={cn("inline-flex items-center select-none", s.gap, className)}
      aria-label={ariaLabel || "Mizan AI"}
    >
      <MizanMark size={s.mark} />
      {withWordmark ? (
        <span
          className={cn(
            "font-bold tracking-[-0.02em] text-foreground",
            s.wordmark,
            wordmarkClassName,
          )}
        >
          Mizan AI
        </span>
      ) : null}
    </span>
  );
};

export default BrandLogo;

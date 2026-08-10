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

/** Mark size in px for each named size. Everything else scales off this. */
const MARK_PX = { sm: 24, md: 28, lg: 36 } as const;

/**
 * Proportions measured off the master artwork (public/mizan-logo.png), where
 * the mark is 78px square. Deriving the lockup from these keeps the rendered
 * logo dimensionally identical to the supplied asset at any size.
 */
const WORDMARK_HEIGHT_RATIO = 52 / 78;
const WORDMARK_ASPECT = 248 / 52;
const GAP_RATIO = 15 / 78;

/**
 * Canonical Mizan mark: green annulus with a concentric green core.
 * Geometry is traced from the master artwork - outer radius 39, 15.5 stroke,
 * 12 core - so this is a true vector copy rather than an approximation.
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
      viewBox="0 0 78 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-[hsl(var(--brand-mark))]", className)}
      aria-hidden
    >
      <circle
        cx="39"
        cy="39"
        r="31.25"
        stroke="currentColor"
        strokeWidth="15.5"
        fill="none"
      />
      <circle cx="39" cy="39" r="12" fill="currentColor" />
    </svg>
  );
}

/**
 * The real wordmark letterforms, applied as an alpha mask and filled with
 * currentColor. Using the artwork rather than a font keeps the shapes exact,
 * and masking keeps it legible on light and dark surfaces alike.
 */
function MizanWordmark({
  markPx,
  className,
}: {
  markPx: number;
  className?: string;
}) {
  const height = markPx * WORDMARK_HEIGHT_RATIO;
  const maskUrl = "url(/mizan-wordmark.png)";

  return (
    <span
      aria-hidden
      className={cn("block shrink-0 bg-current", className)}
      style={{
        height,
        width: height * WORDMARK_ASPECT,
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "sm",
  className,
  ariaLabel,
  withWordmark = false,
  wordmarkClassName,
}) => {
  const markPx = MARK_PX[size];
  return (
    <span
      className={cn("inline-flex items-center select-none", className)}
      style={withWordmark ? { gap: markPx * GAP_RATIO } : undefined}
      aria-label={ariaLabel || "Mizan AI"}
      role="img"
    >
      <MizanMark size={markPx} />
      {withWordmark ? (
        <MizanWordmark
          markPx={markPx}
          className={cn("text-foreground", wordmarkClassName)}
        />
      ) : null}
    </span>
  );
};

export default BrandLogo;

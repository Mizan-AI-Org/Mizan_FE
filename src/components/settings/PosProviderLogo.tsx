import { cn } from "@/lib/utils";

export type PosLogoKey = "square" | "clover" | "lightspeed" | "toast" | "custom";

const LOGO_LABEL: Record<PosLogoKey, string> = {
  square: "Square",
  clover: "Clover",
  lightspeed: "Lightspeed",
  toast: "Toast",
  custom: "Custom API",
};

type PosProviderLogoProps = {
  provider: PosLogoKey;
  className?: string;
  size?: "sm" | "md";
};

/** Brand mark for POS integration cards (assets in /public/integrations/pos/). */
export function PosProviderLogo({ provider, className, size = "md" }: PosProviderLogoProps) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const img = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm dark:bg-slate-950",
        dim,
        className,
      )}
    >
      <img
        src={`/integrations/pos/${provider}.svg`}
        alt=""
        width={32}
        height={32}
        className={cn(img, "object-contain")}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <span className="sr-only">{LOGO_LABEL[provider]}</span>
    </div>
  );
}
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/lib/api";

function resolveAvatarUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("http")) return raw;
  const base = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function initialsFor(first: string, last: string): string {
  const f = (first || "").trim();
  const l = (last || "").trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  return (f[0] || "?").toUpperCase();
}

type Props = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onUploadClick?: () => void;
  uploadLabel?: string;
};

const sizeClass = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-base",
  xl: "h-24 w-24 text-lg",
};

export function StaffMemberAvatar({
  firstName = "",
  lastName = "",
  avatarUrl,
  size = "md",
  className,
  onUploadClick,
  uploadLabel = "Change photo",
}: Props) {
  const src = resolveAvatarUrl(avatarUrl);
  const initials = initialsFor(firstName, lastName);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <Avatar
        className={cn(
          sizeClass[size],
          "ring-2 ring-background shadow-md border border-border/60 bg-muted",
        )}
      >
        {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
        <AvatarFallback className="font-semibold bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-900 dark:from-emerald-950 dark:to-slate-900 dark:text-emerald-100">
          {initials}
        </AvatarFallback>
      </Avatar>
      {onUploadClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUploadClick();
          }}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors"
          title={uploadLabel}
          aria-label={uploadLabel}
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

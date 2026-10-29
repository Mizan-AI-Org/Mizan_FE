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
  xl: "h-[7.25rem] w-[7.25rem] text-xl",
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
          "ring-[3px] ring-background shadow-lg border border-border/50 bg-muted",
        )}
      >
        {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
        <AvatarFallback className="font-semibold bg-gradient-to-br from-[hsl(var(--primary-muted))] via-card to-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] dark:text-[hsl(var(--primary-hover))]">
          {initials}
        </AvatarFallback>
      </Avatar>
      {onUploadClick ? (
        // Not a <button>: the avatar often sits inside a clickable staff card that is a <button> itself, and a button
        // can't contain another one (React validateDOMNesting warning, broken click target).
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onUploadClick();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onUploadClick();
            }
          }}
          className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md hover:brightness-110 transition-[filter,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={uploadLabel}
          aria-label={uploadLabel}
        >
          <Camera className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
}

import React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

type UserAvatarMenuProps = {
  /** "icon" = avatar circle only (top nav style). "row" = avatar + name/email row (side-pane style). */
  variant?: "icon" | "row";
  /** When variant="row", show only the avatar (used while pane is collapsed). */
  compact?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

const isUuid = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({
  variant = "icon",
  compact = false,
  align = "end",
  side,
  className,
}) => {
  const { user, logout } = useAuth() as AuthContextType;
  const { t } = useLanguage();

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`
      : "U";

  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : t("common.welcome");

  const restaurantLabel: string = (() => {
    const dataName = user?.restaurant_data?.name;
    if (typeof dataName === "string" && dataName.length > 0) return dataName;
    const restaurantRaw = user?.restaurant as unknown;
    if (typeof restaurantRaw === "string" && restaurantRaw.length > 0) return restaurantRaw;
    if (typeof restaurantRaw === "object" && restaurantRaw !== null) {
      const name = (restaurantRaw as { name?: unknown }).name;
      if (typeof name === "string" && name.length > 0) return name;
    }
    return "";
  })();

  const roleLabel = user?.role
    ? user.role.toLowerCase().replace(/_/g, " ")
    : "";

  const trigger =
    variant === "icon" || compact ? (
      <Button
        variant="ghost"
        className={cn("h-10 w-10 rounded-full p-0", className)}
        aria-label="User profile menu"
      >
        <Avatar className="h-10 w-10 ring-2 ring-white/40 dark:ring-slate-800">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Button>
    ) : (
      <Button
        variant="ghost"
        className={cn(
          "h-auto w-full justify-start gap-3 rounded-xl p-2 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors",
          className,
        )}
        aria-label="User profile menu"
      >
        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/40 dark:ring-slate-800/60">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold text-[12px]">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-left leading-tight">
          <div className="text-[12.5px] font-semibold text-slate-900 dark:text-white truncate">
            {fullName}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 capitalize truncate">
            {roleLabel || user?.email || ""}
          </div>
        </div>
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-56">
        <div className="px-4 py-2">
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
          {roleLabel && (
            <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
          )}
          {restaurantLabel && !isUuid(restaurantLabel) && (
            <p className="text-xs text-muted-foreground">{restaurantLabel}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="text-destructive"
          aria-label={t("common.sign_out")}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("common.sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatarMenu;

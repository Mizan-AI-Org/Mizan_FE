import { Check, Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type AppTheme,
  type ThemePreference,
  applyThemePreference,
  getStoredThemePreference,
  persistThemePreference,
  resolveEffectiveTheme,
} from "@/lib/theme";

export type { AppTheme, ThemePreference };
export {
  applyAppTheme,
  applyThemePreference,
  getStoredThemePreference,
  persistThemePreference,
  resolveAppTheme,
  resolveEffectiveTheme,
} from "@/lib/theme";

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window !== "undefined" ? getStoredThemePreference() : "light",
  );
  const effective = resolveEffectiveTheme(preference);

  useEffect(() => {
    const initial = getStoredThemePreference();
    setPreference(initial);
    applyThemePreference(initial);
  }, []);

  const setTheme = (next: ThemePreference) => {
    setPreference(next);
    persistThemePreference(next);
    applyThemePreference(next);
  };

  const TriggerIcon =
    preference === "system" ? Laptop : effective === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-foreground hover:bg-muted hover:text-foreground shrink-0"
          aria-label={t("common.theme_aria", "Change theme")}
        >
          <TriggerIcon className="h-5 w-5 text-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {(
          [
            { value: "light" as const, label: t("common.theme_light", "Light"), icon: Sun },
            { value: "dark" as const, label: t("common.theme_dark", "Dark"), icon: Moon },
            {
              value: "system" as const,
              label: t("common.theme_system", "System"),
              icon: Laptop,
            },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Icon className="h-4 w-4 opacity-70" aria-hidden />
            <span className="flex-1">{label}</span>
            {preference === value ? <Check className="h-4 w-4 text-emerald-600" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

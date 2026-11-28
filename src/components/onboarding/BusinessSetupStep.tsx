import React, { useEffect, useState } from "react";
import { ArrowRight, Building2, Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { API_BASE, authFetch } from "@/lib/api";
import { CURRENCY_CODES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE, TIMEZONES, withCurrent } from "@/lib/regional";
import WorkZonePicker, { type WorkZone } from "@/components/onboarding/WorkZonePicker";
import type { OnboardingStepActionsProps } from "@/components/onboarding/OnboardingStepActions";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Hours = Record<string, { open: string; close: string; isClosed: boolean }>;

export const defaultHours = (): Hours =>
  Object.fromEntries(DAYS.map((d) => [d, { open: "09:00", close: "23:00", isClosed: false }]));

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

type ShellProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  optional?: boolean;
};

/** Onboarding "Your business" step: address, time zone, currency, opening hours, and the clock-in work zone.
 * Without a work zone, clock-ins pass from anywhere (clock_proof.zone_flags "no_zone"). */
export default function BusinessSetupStep({
  Shell,
  Actions,
  onSaved,
  onSkip,
}: {
  Shell: React.ComponentType<ShellProps>;
  Actions: React.ComponentType<OnboardingStepActionsProps>;
  onSaved: () => Promise<void> | void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [zone, setZone] = useState<WorkZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(`${API_BASE}/settings/unified/`);
        if (!res.ok || cancelled) return;
        const d = await res.json();
        setAddress(d.address || "");
        setTimezone(d.timezone || DEFAULT_TIMEZONE);
        setCurrency(d.currency || DEFAULT_CURRENCY);
        if (d.operating_hours && Object.keys(d.operating_hours).length) setHours({ ...defaultHours(), ...d.operating_hours });
        if (Number(d.latitude) && Number(d.longitude)) {
          setZone({ lat: Number(d.latitude), lng: Number(d.longitude), radius: Number(d.radius) || 100 });
        }
      } catch {
        /* the form still works with defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t("onboarding.business.locate_failed"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setZone({ lat: pos.coords.latitude, lng: pos.coords.longitude, radius: zone?.radius ?? 100 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t("onboarding.business.locate_failed"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const put = await authFetch(`${API_BASE}/settings/unified/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          timezone,
          currency,
          operating_hours: hours,
        }),
      });
      if (!put.ok) {
        const body = (await put.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail || t("onboarding.err.step"));
      }
      if (zone) {
        const geo = await authFetch(`${API_BASE}/settings/geolocation/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: zone.lat, longitude: zone.lng, radius: zone.radius, geofence_enabled: true }),
        });
        if (!geo.ok) throw new Error(t("onboarding.business.err_zone"));
      }
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("onboarding.err.step"));
    } finally {
      setSaving(false);
    }
  };

  const setDay = (day: string, patch: Partial<Hours[string]>) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));

  return (
    <Shell
      icon={<Building2 className="h-6 w-6" />}
      title={t("onboarding.business.title")}
      subtitle={t("onboarding.business.subtitle")}
      optional
    >
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ob-address">{t("onboarding.business.address")}</Label>
            <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div className="grid gap-1.5">
              <Label htmlFor="ob-tz">{t("settings.general.timezone")}</Label>
              <select id="ob-tz" className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {withCurrent(TIMEZONES, timezone).map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ob-cur">{t("settings.general.currency")}</Label>
              <select id="ob-cur" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {withCurrent(CURRENCY_CODES, currency).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:border-s md:border-slate-200 md:ps-8 dark:md:border-slate-700">
          <Label>{t("onboarding.business.hours")}</Label>
          <div className="grid gap-2">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
                <span className="w-20 shrink-0 font-medium sm:w-24">
                  {t(`process.schedule.day_${day.slice(0, 3).toLowerCase()}`, day)}
                </span>
                <Switch
                  checked={!hours[day].isClosed}
                  onCheckedChange={(open) => setDay(day, { isClosed: !open })}
                  aria-label={day}
                />
                {hours[day].isClosed ? (
                  <span className="text-muted-foreground">{t("onboarding.business.closed")}</span>
                ) : (
                  <>
                    <Input
                      type="time"
                      className="h-9 w-[5.5rem] px-2"
                      value={hours[day].open}
                      onChange={(e) => setDay(day, { open: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-9 w-[5.5rem] px-2"
                      value={hours[day].close}
                      onChange={(e) => setDay(day, { close: e.target.value })}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label>{t("onboarding.business.zone")}</Label>
            <p className="text-xs text-muted-foreground">{t("onboarding.business.zone_hint")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
            {t("onboarding.business.use_location")}
          </Button>
        </div>
        <WorkZonePicker zone={zone} onChange={setZone} />
        {zone ? (
          <div className="flex items-center gap-3 text-sm">
            <Label htmlFor="ob-radius" className="shrink-0">{t("onboarding.business.radius", { meters: zone.radius })}</Label>
            <input
              id="ob-radius"
              type="range"
              min={30}
              max={500}
              step={10}
              value={zone.radius}
              onChange={(e) => setZone({ ...zone, radius: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("onboarding.business.zone_missing")}</p>
        )}
      </div>

      <Actions onSkip={onSkip} skipDisabled={saving}>
        <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {t("onboarding.continue", "Continue")}
        </Button>
      </Actions>
    </Shell>
  );
}

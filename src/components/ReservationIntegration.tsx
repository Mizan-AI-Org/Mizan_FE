import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Globe2, Link as LinkIcon, Loader2, Plug } from "lucide-react";

type ReservationProvider =
  | "NONE"
  | "EATAPP"
  | "OPENTABLE"
  | "THEFORK"
  | "SEVENROOMS"
  | "CUSTOM";

interface ReservationConfig {
  provider: ReservationProvider;
  widgetUrl: string;
  displayName: string;
}

const STORAGE_KEY = "mizan_reservation_integration";

const DEFAULT_CONFIG: ReservationConfig = {
  provider: "NONE",
  widgetUrl: "",
  displayName: "",
};

export default function ReservationIntegration() {
  const [config, setConfig] = useState<ReservationConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReservationConfig;
        setConfig({
          provider: parsed.provider || "NONE",
          widgetUrl: parsed.widgetUrl || "",
          displayName: parsed.displayName || "",
        });
      }
    } catch {
      // Ignore malformed data and fall back to defaults
    }
  }, []);

  const handleChange = <K extends keyof ReservationConfig>(key: K, value: ReservationConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLink = () => {
    if (!config.widgetUrl) return;
    try {
      const url = new URL(config.widgetUrl);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch {
      window.open(config.widgetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const hasConfiguration =
    config.provider !== "NONE" && config.widgetUrl.trim().length > 0;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-emerald-500" />
          Reservation Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reservation-provider" className="text-sm font-medium">
            Reservation provider
          </Label>
          <select
            id="reservation-provider"
            value={config.provider}
            onChange={(e) =>
              handleChange("provider", e.target.value as ReservationProvider)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-md text-sm"
          >
            <option value="NONE">Not configured</option>
            <option value="EATAPP">Eat App (Eat Now)</option>
            <option value="OPENTABLE">OpenTable</option>
            <option value="THEFORK">TheFork / LaFourchette</option>
            <option value="SEVENROOMS">SevenRooms</option>
            <option value="CUSTOM">Custom booking widget</option>
          </select>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="reservation-display-name" className="text-sm font-medium">
                Display name
              </Label>
              <Input
                id="reservation-display-name"
                placeholder="e.g. Book a table"
                value={config.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shown on buttons or links where you promote reservations.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reservation-widget-url" className="text-sm font-medium">
                Booking widget URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="reservation-widget-url"
                  placeholder="https://..."
                  value={config.widgetUrl}
                  onChange={(e) => handleChange("widgetUrl", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Connection status</span>
              </div>
              <Badge variant="outline" className={hasConfiguration ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" : ""}>
                {hasConfiguration ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Use the booking link in your website, QR codes, or digital menu
              to send guests directly to your reservation experience.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Globe2 className="w-4 h-4 mr-2" />
                    Save configuration
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!config.widgetUrl}
                onClick={handleTestLink}
                className="flex-1"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Open booking link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


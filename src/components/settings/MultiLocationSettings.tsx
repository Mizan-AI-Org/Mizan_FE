import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  Plus,
  Star,
  Trash2,
  Loader2,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import GeolocationMapSettings from "@/components/settings/GeolocationMapSettings";
import { useLanguage } from "@/hooks/use-language";
import type { AxiosError, AxiosInstance } from "axios";

export interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  geofence_enabled: boolean;
  geofence_polygon: Array<[number, number]>;
  timezone: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MultiLocationSettingsProps {
  /** Authenticated axios instance from the parent Settings page — already
   *  has Authorization + Accept-Language headers configured, so we don't
   *  re-implement that here. */
  apiClient: AxiosInstance;
  /** Fired when any mutation succeeds so the parent can refresh legacy
   *  single-location state (Restaurant.latitude etc. stay in sync on the
   *  server but the `Settings` page reads them eagerly on load). */
  onMutated?: () => void;
}

type ApiError = AxiosError<{ detail?: string; message?: string }>;

function describeError(error: unknown, fallback: string): string {
  const err = error as ApiError;
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}

export default function MultiLocationSettings({
  apiClient,
  onMutated,
}: MultiLocationSettingsProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  // Any successful mutation on a branch should also refresh the caches the
  // rest of the app reads from (picker dropdowns, the multi-location
  // portfolio overview, etc.) so the UI updates without a full page reload.
  const invalidateTenantLocationCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["business-locations"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
  }, [queryClient]);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [primarySwitchingId, setPrimarySwitchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await apiClient.get<BusinessLocation[] | { results: BusinessLocation[] }>(
        "/locations/"
      );
      const rows = Array.isArray(resp.data)
        ? resp.data
        : resp.data?.results ?? [];
      // Sort primary first, then by name — mirrors the Meta.ordering so the
      // UI and DB agree on visual order regardless of DRF pagination config.
      rows.sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setLocations(rows);
      if (!expandedId && rows.length > 0) {
        setExpandedId(rows[0].id);
      }
    } catch (error) {
      toast.error(describeError(error, t("settings.locations.load_error")));
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, t, expandedId]);

  useEffect(() => {
    fetchLocations();
    // we intentionally only run once on mount; `fetchLocations` depends on
    // `expandedId` only for the initial "auto-open first location" UX, we
    // don't want to refetch every time the user opens a different accordion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primaryLocation = useMemo(
    () => locations.find((l) => l.is_primary) ?? null,
    [locations]
  );

  const handleSaveCoords = useCallback(
    async (loc: BusinessLocation, lat: number, lng: number, radius: number) => {
      setSavingId(loc.id);
      try {
        const resp = await apiClient.patch<BusinessLocation>(
          `/locations/${loc.id}/`,
          {
            latitude: lat,
            longitude: lng,
            radius,
            geofence_enabled: loc.geofence_enabled,
            geofence_polygon: loc.geofence_polygon,
          }
        );
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? resp.data : l))
        );
        toast.success(t("settings.locations.save_success"));
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.save_error")));
      } finally {
        setSavingId(null);
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handleToggleGeofence = useCallback(
    async (loc: BusinessLocation, enabled: boolean) => {
      try {
        const resp = await apiClient.patch<BusinessLocation>(
          `/locations/${loc.id}/`,
          { geofence_enabled: enabled }
        );
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? resp.data : l))
        );
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.save_error")));
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handlePolygonChange = useCallback(
    async (loc: BusinessLocation, polygon: Array<[number, number]>) => {
      // Polygon edits are emitted on every click so we debounce with a
      // shallow "unchanged" check rather than a timer — avoids 50
      // requests while the user draws.
      if (
        polygon.length === loc.geofence_polygon.length &&
        polygon.every(
          (p, i) =>
            p[0] === loc.geofence_polygon[i]?.[0] &&
            p[1] === loc.geofence_polygon[i]?.[1]
        )
      ) {
        return;
      }
      try {
        const resp = await apiClient.patch<BusinessLocation>(
          `/locations/${loc.id}/`,
          { geofence_polygon: polygon }
        );
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? resp.data : l))
        );
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.save_error")));
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handleRename = useCallback(
    async (loc: BusinessLocation, name: string, address: string) => {
      try {
        const resp = await apiClient.patch<BusinessLocation>(
          `/locations/${loc.id}/`,
          { name, address }
        );
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? resp.data : l))
        );
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.save_error")));
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handleSetPrimary = useCallback(
    async (loc: BusinessLocation) => {
      setPrimarySwitchingId(loc.id);
      try {
        const resp = await apiClient.post<BusinessLocation>(
          `/locations/${loc.id}/set-primary/`
        );
        setLocations((prev) =>
          prev.map((l) =>
            l.id === resp.data.id
              ? resp.data
              : { ...l, is_primary: false }
          )
        );
        toast.success(t("settings.locations.primary_set"));
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.primary_error")));
      } finally {
        setPrimarySwitchingId(null);
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handleDelete = useCallback(
    async (loc: BusinessLocation) => {
      setDeletingId(loc.id);
      try {
        await apiClient.delete(`/locations/${loc.id}/`);
        setLocations((prev) => prev.filter((l) => l.id !== loc.id));
        toast.success(t("settings.locations.delete_success"));
        invalidateTenantLocationCaches();
        onMutated?.();
      } catch (error) {
        toast.error(describeError(error, t("settings.locations.delete_error")));
      } finally {
        setDeletingId(null);
      }
    },
    [apiClient, t, onMutated, invalidateTenantLocationCaches]
  );

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      toast.error(t("settings.locations.name_required"));
      return;
    }
    setCreating(true);
    try {
      // New branches start with sensible defaults — 100m radius, geofence
      // on, no coords yet. The manager then centers the map and saves.
      const resp = await apiClient.post<BusinessLocation>("/locations/", {
        name,
        address: newAddress.trim(),
        latitude: null,
        longitude: null,
        radius: 100,
        geofence_enabled: true,
        geofence_polygon: [],
        is_active: true,
      });
      setLocations((prev) => {
        const next = [...prev, resp.data];
        next.sort((a, b) => {
          if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return next;
      });
      setExpandedId(resp.data.id);
      setNewName("");
      setNewAddress("");
      setAddOpen(false);
      toast.success(t("settings.locations.add_success"));
      invalidateTenantLocationCaches();
      onMutated?.();
    } catch (error) {
      toast.error(describeError(error, t("settings.locations.add_error")));
    } finally {
      setCreating(false);
    }
  }, [apiClient, newName, newAddress, t, onMutated, invalidateTenantLocationCaches]);

  return (
    <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("settings.locations.title")}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {t("settings.locations.description")}
              </CardDescription>
            </div>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.locations.add_button")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("settings.locations.add_title")}</DialogTitle>
                <DialogDescription>
                  {t("settings.locations.add_description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-loc-name">
                    {t("settings.locations.name_label")}
                  </Label>
                  <Input
                    id="new-loc-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("settings.locations.name_placeholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-loc-address">
                    {t("settings.locations.address_label")}
                  </Label>
                  <Input
                    id="new-loc-address"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder={t("settings.locations.address_placeholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={creating}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {t("settings.locations.add_confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <MapPin className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("settings.locations.empty_title")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {t("settings.locations.empty_description")}
            </p>
          </div>
        ) : (
          <>
            {primaryLocation && locations.length > 1 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>
                  {t("settings.locations.primary_hint", {
                    name: primaryLocation.name,
                    count: String(locations.length),
                  })}
                </span>
              </div>
            )}

            <Accordion
              type="single"
              collapsible
              value={expandedId}
              onValueChange={(v) => setExpandedId(v || undefined)}
              className="space-y-3"
            >
              {locations.map((loc) => (
                <LocationRow
                  key={loc.id}
                  location={loc}
                  isSaving={savingId === loc.id}
                  isSwitching={primarySwitchingId === loc.id}
                  isDeleting={deletingId === loc.id}
                  canDelete={
                    !loc.is_primary || locations.length > 1
                  }
                  onSaveCoords={(lat, lng, rad) => handleSaveCoords(loc, lat, lng, rad)}
                  onToggleGeofence={(enabled) => handleToggleGeofence(loc, enabled)}
                  onPolygonChange={(poly) => handlePolygonChange(loc, poly)}
                  onRename={(name, address) => handleRename(loc, name, address)}
                  onSetPrimary={() => handleSetPrimary(loc)}
                  onDelete={() => handleDelete(loc)}
                />
              ))}
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface LocationRowProps {
  location: BusinessLocation;
  isSaving: boolean;
  isSwitching: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onSaveCoords: (lat: number, lng: number, radius: number) => void;
  onToggleGeofence: (enabled: boolean) => void;
  onPolygonChange: (polygon: Array<[number, number]>) => void;
  onRename: (name: string, address: string) => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}

function LocationRow({
  location,
  isSaving,
  isSwitching,
  isDeleting,
  canDelete,
  onSaveCoords,
  onToggleGeofence,
  onPolygonChange,
  onRename,
  onSetPrimary,
  onDelete,
}: LocationRowProps) {
  const { t } = useLanguage();
  const [nameDraft, setNameDraft] = useState(location.name);
  const [addressDraft, setAddressDraft] = useState(location.address);

  // Keep local drafts in sync when the server returns a renamed row (e.g.
  // after a set-primary which refreshes the whole object).
  useEffect(() => {
    setNameDraft(location.name);
    setAddressDraft(location.address);
  }, [location.name, location.address]);

  const hasCoords =
    location.latitude !== null && location.longitude !== null;
  const nameOrAddressDirty =
    nameDraft.trim() !== location.name || addressDraft.trim() !== location.address;

  return (
    <AccordionItem
      value={location.id}
      className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden data-[state=open]:shadow-sm bg-white dark:bg-slate-800/30"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/60 [&[data-state=open]>div>svg.chevron]:rotate-90">
        <div className="flex items-center gap-3 flex-1 text-left">
          <ChevronRight className="chevron w-4 h-4 text-slate-400 transition-transform" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {location.name}
              </span>
              {location.is_primary && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 border-0 gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {t("settings.locations.primary_badge")}
                </Badge>
              )}
              {!hasCoords && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-300">
                  {t("settings.locations.no_coords")}
                </Badge>
              )}
              {!location.geofence_enabled && (
                <Badge variant="outline" className="text-xs">
                  {t("settings.locations.geofence_off")}
                </Badge>
              )}
            </div>
            {location.address && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {location.address}
              </p>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-5 pt-2">
        <div className="space-y-5">
          {/* Name + address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${location.id}`}>
                {t("settings.locations.name_label")}
              </Label>
              <Input
                id={`name-${location.id}`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`address-${location.id}`}>
                {t("settings.locations.address_label")}
              </Label>
              <Input
                id={`address-${location.id}`}
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
              />
            </div>
          </div>
          {nameOrAddressDirty && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNameDraft(location.name);
                  setAddressDraft(location.address);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => onRename(nameDraft.trim(), addressDraft.trim())}
                disabled={!nameDraft.trim()}
              >
                {t("settings.locations.save_name")}
              </Button>
            </div>
          )}

          {/* Coordinates + geofence editor — reuse the existing single-location map */}
          <GeolocationMapSettings
            latitude={location.latitude ?? 0}
            longitude={location.longitude ?? 0}
            radius={location.radius}
            geofenceEnabled={location.geofence_enabled}
            geofencePolygon={location.geofence_polygon}
            onToggleGeofence={onToggleGeofence}
            onPolygonChange={onPolygonChange}
            onSave={onSaveCoords}
            isSaving={isSaving}
          />

          {/* Danger / admin actions */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {!location.is_primary && hasCoords && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSetPrimary}
                disabled={isSwitching}
              >
                {isSwitching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                {t("settings.locations.make_primary")}
              </Button>
            )}

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {t("settings.locations.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("settings.locations.delete_title", { name: location.name })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {location.is_primary
                        ? t("settings.locations.delete_primary_warning")
                        : t("settings.locations.delete_warning")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                      {t("settings.locations.delete_confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

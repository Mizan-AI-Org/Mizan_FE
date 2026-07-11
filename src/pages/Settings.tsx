import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  MapPin,
  Plug,
  CreditCard as CreditCardIcon,
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Unplug,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Languages,
  Route,
} from "lucide-react";
import { FormSectionSkeleton } from "@/components/skeletons";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";
import ReservationIntegration from "@/components/ReservationIntegration";
// Lazy-load heavy settings sections for better mobile performance
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const ProfileSettings = lazy(() => import("./ProfileSettings"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const MultiLocationSettings = lazy(() => import("@/components/settings/MultiLocationSettings"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const BillingSettings = lazy(() => import("@/components/settings/BillingSettings"));
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { Language } from "@/contexts/LanguageContext.types";
import { supportedLanguages } from "@/i18n";
import axios from "axios";
import type { AxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StaffInvitation } from "@/lib/types";
import { User } from "@/contexts/AuthContext.types";
import { translateApiError } from "@/i18n/messages";
import {
  SettingsSection,
  SettingsStickyActions,
  settingsFieldClassName,
  settingsSelectClassName,
} from "@/components/settings/SettingsSection";
import { SettingsNav, type SettingsNavItem } from "@/components/settings/SettingsNav";
import { PAGE_SHELL } from "@/lib/page-shell";
import { cn } from "@/lib/utils";

import { API_BASE, api } from "@/lib/api";
import {
  ALL_BUSINESS_VERTICALS,
  parseBusinessVertical,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";

type PosConnectionStatus = "idle" | "connected" | "error";

interface GeolocationSettings {
  latitude: number;
  longitude: number;
  radius: number;
  geofence_enabled: boolean;
  geofence_polygon: Array<[number, number]>;
}

interface POSSettings {
  pos_provider: string;
  pos_merchant_id: string;
  pos_location_id?: string;
  pos_is_connected: boolean;
  pos_custom_api_url?: string;
  pos_custom_api_key?: string;
  /** Lightspeed product line: Restaurant K-Series vs Retail X-Series */
  lightspeed_line?: "RESTAURANT_K" | "RETAIL_X";
  lightspeed_domain_prefix?: string;
}

interface AISettings {
  enabled: boolean;
  ai_provider: string;
  features_enabled: Record<string, boolean>;
}

/** Keys align with `SafetyConcernReport.incident_type` defaults used in reporting. */
const INCIDENT_CATEGORY_KEYS = [
  "Safety",
  "Maintenance",
  "HR",
  "Food Safety",
  "Customer Issue",
  "General",
] as const;

/** Matches `StaffSerializer` (GET /api/staff/): flat CustomUser fields. */
interface StaffListRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** `/api/staff/` returns flat users; some callers may still use nested `{ user: {...} }`. */
function normalizeStaffListRows(data: unknown): StaffListRow[] {
  const arr: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "results" in (data as object)
      ? ((data as { results?: unknown[] }).results ?? [])
      : [];
  const out: StaffListRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const nested = r.user as Record<string, unknown> | undefined;
    if (nested && typeof nested.id === "string") {
      out.push({
        id: nested.id,
        email: String(nested.email ?? ""),
        first_name: String(nested.first_name ?? ""),
        last_name: String(nested.last_name ?? ""),
      });
      continue;
    }
    if (typeof r.id === "string") {
      out.push({
        id: r.id,
        email: String(r.email ?? ""),
        first_name: String(r.first_name ?? ""),
        last_name: String(r.last_name ?? ""),
      });
    }
  }
  return out;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { language, setLanguage: setAppLanguage, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [radius, setRadius] = useState<number>(0);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [geofencePolygon, setGeofencePolygon] = useState<
    Array<[number, number]>
  >([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  const [operatingHours, setOperatingHours] = useState<{
    [key: string]: { open: string; close: string; isClosed: boolean };
  }>({
    Monday: { open: "09:00", close: "17:00", isClosed: false },
    Tuesday: { open: "09:00", close: "17:00", isClosed: false },
    Wednesday: { open: "09:00", close: "17:00", isClosed: false },
    Thursday: { open: "09:00", close: "17:00", isClosed: false },
    Friday: { open: "09:00", close: "17:00", isClosed: false },
    Saturday: { open: "10:00", close: "14:00", isClosed: true },
    Sunday: { open: "10:00", close: "14:00", isClosed: true },
  });
  const [automaticClockOut, setAutomaticClockOut] = useState(false);
  /** Maps incident category (e.g. Safety) → CustomUser id for default routing */
  const [incidentCategoryAssignees, setIncidentCategoryAssignees] = useState<
    Record<string, string>
  >({});
  const [staffForSelectors, setStaffForSelectors] = useState<StaffListRow[]>([]);
  const [businessVertical, setBusinessVertical] = useState<BusinessVertical>("RESTAURANT");
  const [customStaffRoles, setCustomStaffRoles] = useState<{ id: string; name: string }[]>([]);
  const [breakDuration, setBreakDuration] = useState(30);
  const [emailNotifications, setEmailNotifications] = useState({
    lowInventory: true,
    scheduling: true,
    revenue: false,
    aiInsights: true,
  });
  const [pushNotifications, setPushNotifications] = useState({
    lowInventory: true,
    scheduling: true,
    revenue: false,
    aiInsights: true,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSendWhatsApp, setInviteSendWhatsApp] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<
    StaffInvitation[]
  >([]);
  const [user, setUser] = useState<User | null>(null);
  // Quick Settings States
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [savingGeolocation, setSavingGeolocation] = useState(false);
  const [posSettings, setPosSettings] = useState<POSSettings>({
    pos_provider: "NONE",
    pos_merchant_id: "",
    pos_location_id: "",
    pos_is_connected: false,
    lightspeed_line: "RESTAURANT_K",
    lightspeed_domain_prefix: "",
  });
  const [posAPIKey, setPosAPIKey] = useState("");
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [savingPos, setSavingPos] = useState(false);
  const [posTestingConnection, setPosTestingConnection] = useState(false);
  const [posConnectionStatus, setPosConnectionStatus] =
    useState<PosConnectionStatus>("idle");
  // Tracks backend settings schema/version for optimistic concurrency
  const [settingsSchemaVersion, setSettingsSchemaVersion] = useState<number | null>(null);
  const [posDisconnectOpen, setPosDisconnectOpen] = useState(false);
  const [posDisconnecting, setPosDisconnecting] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    ai_provider: "GROQ",
    features_enabled: {
      insights: true,
      recommendations: true,
      reports: true,
    },
  });
  const [savingAi, setSavingAi] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEmail, setGcalEmail] = useState("");
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
  const [gcalDisconnectOpen, setGcalDisconnectOpen] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  // Controlled tabs — synced with ?tab= for deep links / OAuth returns
  const SETTINGS_TABS = useMemo(
    () => ["profile", "location", "general", "integrations", "billing"] as const,
    [],
  );
  const initialTab = (() => {
    const fromUrl = (searchParams.get("tab") || "").toLowerCase();
    return (SETTINGS_TABS as readonly string[]).includes(fromUrl) ? fromUrl : "profile";
  })();
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const onSettingsTabChange = (next: string) => {
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", next);
        return n;
      },
      { replace: true },
    );
  };

  const apiClient = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    []
  );

  // Handle POS OAuth callback results (redirect back to /dashboard/settings).
  // We handle both the legacy ?square=connected|error convention and the
  // unified ?pos_connected=true&provider=<name> convention used by the
  // pos-app OAuth flows (Clover today; Square via the pos/ route; Toast
  // never redirects because it uses partner-credentials without browser
  // navigation).
  useEffect(() => {
    const url = new URL(window.location.href);
    const square = url.searchParams.get("square");
    const message = url.searchParams.get("message");
    const posConnected = url.searchParams.get("pos_connected");
    const posError = url.searchParams.get("pos_error");
    const provider = (url.searchParams.get("provider") || "").toLowerCase();

    const role = (JSON.parse(localStorage.getItem("user") || "{}")?.role || "").toUpperCase();
    const clean = (...keys: string[]) => {
      keys.forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    };

    if (square === "connected") {
      toast.success(t("settings.square_connected"));
      if (role !== "STAFF") fetchUnifiedSettings();
      clean("square", "message");
    } else if (square === "error") {
      toast.error(message ? `Square connect failed: ${message}` : "Square connect failed");
      clean("square", "message");
    } else if (posConnected === "true") {
      const label =
        provider === "clover"
          ? t("pos.clover.connected") || "Clover connected."
          : t("pos.connection.success") || "POS connected.";
      toast.success(label);
      if (role !== "STAFF") fetchUnifiedSettings();
      clean("pos_connected", "provider");
    } else if (posError) {
      toast.error(
        t("pos.connection.failed") ||
          `POS connect failed (${posError}). Please try again.`,
      );
      clean("pos_error", "provider");
    }

    const gcal = url.searchParams.get("gcal");
    if (gcal === "connected") {
      toast.success(t("dashboard.meetings_reminders.connected_toast") || "Google Calendar connected!");
      if (role !== "STAFF") fetchUnifiedSettings();
      clean("gcal", "gcal_detail");
      setActiveTab("integrations");
    } else if (gcal === "error") {
      const detail = url.searchParams.get("gcal_detail") || "";
      toast.error(
        detail
          ? `${t("dashboard.meetings_reminders.connect_failed") || "Google Calendar connect failed"} (${detail})`
          : t("dashboard.meetings_reminders.connect_failed") || "Google Calendar connect failed",
      );
      clean("gcal", "gcal_detail");
      setActiveTab("integrations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      apiClient.defaults.headers.common["Accept-Language"] = language;
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      const role = (parsedUser?.role || "").toUpperCase();
      if (role !== "STAFF") {
        // Only admins/managers should load sensitive unified settings
        fetchUnifiedSettings();
      } else {
        // Staff: load only non-sensitive basics if needed
        // Currently, staff sees Profile tab only; skip unified call entirely
      }
    } else {
      navigate("/auth");
    }
  }, [navigate, apiClient, language]);

  // Restrict non-profile settings for staff users: only admins/managers can see other tabs
  const roleUpper = (user?.role || "").toUpperCase();
  const isStaff = !(roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || roleUpper === "MANAGER");
  const canEditPermissions =
    roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || roleUpper === "OWNER";

  const settingsNavItems = useMemo((): SettingsNavItem[] => {
    const items: SettingsNavItem[] = [
      {
        id: "profile",
        label: t("settings.tabs.profile"),
        description: t("settings.nav.profile_desc"),
        icon: Users,
      },
    ];
    if (!isStaff) {
      items.push(
        {
          id: "general",
          label: t("settings.tabs.general"),
          description: t("settings.nav.general_desc"),
          icon: Building2,
        },
        {
          id: "location",
          label: t("settings.tabs.geolocation"),
          description: t("settings.nav.location_desc"),
          icon: MapPin,
        },
        {
          id: "integrations",
          label: t("settings.tabs.integrations"),
          description: t("settings.nav.integrations_desc"),
          icon: Plug,
        },
        {
          id: "billing",
          label: t("settings.tabs.billing"),
          description: t("settings.nav.billing_desc"),
          icon: CreditCardIcon,
        },
      );
    }
    return items;
  }, [isStaff, t]);

  const loadCoreSettings = async () => {
    try {
      const response = await apiClient.get("/timeclock/restaurant-location/");
      const data = response.data?.restaurant || response.data || {};
      setLatitude(data.latitude || 0);
      setLongitude(data.longitude || 0);
      setRadius(data.geofence_radius ?? data.radius ?? 0);
      setRestaurantName(data.name || "");
      setRestaurantAddress(data.address || "");
      setRestaurantPhone(data.phone || "");
      setRestaurantEmail(data.email || "");
      setTimezone(data.timezone || "America/New_York");
      setCurrency(data.currency || "USD");
      setAppLanguage(
        typeof data.language === "string" && (supportedLanguages as readonly string[]).includes(data.language)
          ? (data.language as Language)
          : "en"
      );
      setOperatingHours(data.operating_hours || operatingHours);
      setAutomaticClockOut(data.automatic_clock_out || false);
      setBreakDuration(data.break_duration || 30);
      setEmailNotifications(data.email_notifications || emailNotifications);
      setPushNotifications(data.push_notifications || pushNotifications);
    } catch (error) {
      console.error("Failed to fetch restaurant settings:", error);
      toast.error("Failed to load restaurant settings.");
    }

    try {
      const response = await apiClient.get(
        "/accounts/staff/invitations/"
      );
      setPendingInvitations(response.data);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      toast.error(t("settings.failed_load_invitations"));
    }
  };

  const fetchUnifiedSettings = async () => {
    try {
      const response = await apiClient.get("/settings/unified/");
      const data = response.data || {};

      // Geolocation
      setLatitude(data.latitude ?? data.restaurant?.latitude ?? 0);
      setLongitude(data.longitude ?? data.restaurant?.longitude ?? 0);
      setRadius(data.radius ?? data.restaurant?.radius ?? 0);
      setGeofenceEnabled(data.geofence_enabled ?? true);
      setGeofencePolygon(data.geofence_polygon ?? []);

      // General
      setRestaurantName(data.name || "");
      setRestaurantAddress(data.address || "");
      setRestaurantPhone(data.phone || data.phone_restaurant || "");
      setRestaurantEmail(data.email || "");
      setTimezone(data.timezone || "America/New_York");
      setCurrency(data.currency || "USD");
      setAppLanguage(
        typeof data.language === "string" && (supportedLanguages as readonly string[]).includes(data.language)
          ? (data.language as Language)
          : "en"
      );
      setOperatingHours(data.operating_hours || operatingHours);
      setAutomaticClockOut(data.automatic_clock_out || false);
      setBreakDuration(data.break_duration || 30);
      setEmailNotifications(data.email_notifications || emailNotifications);
      setPushNotifications(data.push_notifications || pushNotifications);

      // POS
      setPosSettings({
        pos_provider: data.pos_provider || "NONE",
        pos_merchant_id: data.pos_merchant_id || "",
        pos_location_id: data.pos_location_id || "",
        pos_is_connected: data.pos_is_connected || false,
        pos_custom_api_url: data.pos_custom_api_url || "",
        pos_custom_api_key: data.pos_custom_api_key_set ? "••••••••" : "",
        lightspeed_line: (data.lightspeed_line as POSSettings["lightspeed_line"]) || "RESTAURANT_K",
        lightspeed_domain_prefix: data.lightspeed_domain_prefix || "",
      });
      setPosConnectionStatus(data.pos_is_connected ? "connected" : "idle");

      // AI
      const ai = data.ai_config || {};
      setAiSettings({
        enabled: ai.enabled ?? true,
        ai_provider: ai.ai_provider || "GROQ",
        features_enabled: {
          insights: ai.features_enabled?.insights ?? true,
          recommendations: ai.features_enabled?.recommendations ?? true,
          reports: ai.features_enabled?.reports ?? true,
        },
      });
      // Version for optimistic locking
      setSettingsSchemaVersion(
        typeof data.settings_schema_version === "number"
          ? data.settings_schema_version
          : (typeof data.settingsVersion === "number" ? data.settingsVersion : 0)
      );

      const rawAssignees = data.incident_category_assignees;
      if (rawAssignees && typeof rawAssignees === "object" && !Array.isArray(rawAssignees)) {
        setIncidentCategoryAssignees(rawAssignees as Record<string, string>);
      } else {
        setIncidentCategoryAssignees({});
      }

      setGcalConnected(data.google_calendar_connected || false);
      setGcalEmail(data.google_calendar_email || "");

      setBusinessVertical(parseBusinessVertical(data.business_vertical));
      const csr = data.custom_staff_roles;
      if (Array.isArray(csr)) {
        setCustomStaffRoles(
          csr
            .filter((x: unknown) => x && typeof x === "object")
            .map((x: { id?: string; name?: string }) => ({
              id: String(x.id || ""),
              name: String(x.name || ""),
            }))
            .filter((x: { id: string }) => x.id)
        );
      } else {
        setCustomStaffRoles([]);
      }

      try {
        const staffRes = await apiClient.get("/staff/");
        setStaffForSelectors(normalizeStaffListRows(staffRes.data));
      } catch {
        setStaffForSelectors([]);
      }
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string }>;
      console.error("Failed to load unified settings:", axiosErr);
      const message = translateApiError(axiosErr);
      toast.error(message);
      if (axiosErr.response?.status === 401) {
        navigate("/auth");
      }
    }
  };

  const posFullyConnected = useMemo(
    () => posSettings.pos_provider !== "NONE" && posSettings.pos_is_connected,
    [posSettings.pos_provider, posSettings.pos_is_connected]
  );

  const saveLocationSettings = async (
    lat: number,
    lng: number,
    rad: number
  ) => {
    setLatitude(lat);
    setLongitude(lng);
    setRadius(rad);
    setSavingGeolocation(true);
    try {
      await apiClient.post("/settings/geolocation/", {
        latitude: lat,
        longitude: lng,
        radius: rad,
        geofence_enabled: geofenceEnabled,
        geofence_polygon: geofencePolygon,
      });
      toast.success(t("settings.location.save_success"));
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string }>;
      const errData = axiosErr.response?.data;
      console.error("Error saving location settings:", errData ?? error);
      toast.error(
        `${t("settings.location.save_error")}${errData?.detail ? ": " + errData.detail : ""
        }`
      );
    } finally {
      setSavingGeolocation(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      // Basic client-side validation
      if (!restaurantName || restaurantName.trim().length < 2) {
        toast.error(t("settings.general.name_minlen"));
        return;
      }
      if (restaurantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(restaurantEmail)) {
        toast.error(t("validation.email"));
        return;
      }

      setSavingGeneral(true);
      const response = await apiClient.put("/settings/unified/", {
        name: restaurantName,
        address: restaurantAddress,
        phone_restaurant: restaurantPhone,
        email: restaurantEmail,
        timezone,
        currency,
        language,
        operating_hours: operatingHours,
        automatic_clock_out: automaticClockOut,
        break_duration: breakDuration,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        incident_category_assignees: incidentCategoryAssignees,
        business_vertical: businessVertical,
        custom_staff_roles: customStaffRoles
          .map((r) => ({ id: r.id, name: r.name.trim() }))
          .filter((r) => r.name.length > 0),
        // Include the version for optimistic locking
        settings_schema_version: settingsSchemaVersion,
      });
      if (response.status === 200) {
        const ver =
          typeof response.data?.settings_schema_version === "number"
            ? response.data.settings_schema_version
            : typeof response.data?.settingsVersion === "number"
              ? response.data.settingsVersion
              : null;
        if (typeof ver === "number") {
          setSettingsSchemaVersion(ver);
        }
        toast.success(t("settings.general.save_success"));
        void queryClient.invalidateQueries({ queryKey: ["settings", "business_vertical"] });
        fetchUnifiedSettings();
      } else {
        const errorData = response.data;
        toast.error(
          `${t("settings.general.save_error")}: ${errorData.detail || errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string }>;
      const status = axiosErr.response?.status;
      const detail = axiosErr.response?.data?.detail || axiosErr.message;
      console.error("Error saving general settings:", axiosErr);
      if (status === 409) {
        toast.error(t("settings.general.conflict"));
        await fetchUnifiedSettings();
      } else if (status === 401) {
        toast.error(t("settings.general.unauthorized"));
        navigate("/auth");
      } else {
        toast.error(`${t("settings.general.save_error")}${detail ? ": " + detail : ""}`);
      }
    } finally {
      setSavingGeneral(false);
    }
  };

  const persistLanguagePreference = async (lng: Language) => {
    // Apply immediately in-app, then persist to workspace (restaurant) without requiring full Save.
    setAppLanguage(lng);
    apiClient.defaults.headers.common["Accept-Language"] = lng;
    try {
      const response = await apiClient.put("/settings/unified/", {
        language: lng,
        settings_schema_version: settingsSchemaVersion,
      });
      // Refresh version so subsequent saves don't conflict
      const version =
        typeof response.data?.settings_schema_version === "number"
          ? response.data.settings_schema_version
          : (typeof response.data?.settingsVersion === "number" ? response.data.settingsVersion : settingsSchemaVersion);
      if (typeof version === "number") setSettingsSchemaVersion(version);
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string }>;
      console.error("Failed to persist language:", axiosErr);
      toast.error(translateApiError(axiosErr));
    }
  };

  const handleOperatingHoursChange = (
    day: string,
    field: string,
    value: string | boolean
  ) => {
    setOperatingHours((prevHours) => ({
      ...prevHours,
      [day]: { ...prevHours[day], [field]: value },
    }));
  };

  const handleNotificationChange = (
    type: "email" | "push",
    field: string,
    value: boolean
  ) => {
    if (type === "email") {
      setEmailNotifications((prev) => ({ ...prev, [field]: value }));
    } else {
      setPushNotifications((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteFirstName || !inviteLastName || !inviteRole) {
      toast.error(t("invitations.fill_required"));
      return;
    }
    if (!inviteSendWhatsApp && !inviteEmail) {
      toast.error(t("validation.email"));
      return;
    }
    if (inviteSendWhatsApp && !invitePhone) {
      toast.error(t("settings.phone_required_whatsapp"));
      return;
    }

    try {
      // Align with backend: /api/staff/invite/
      const payload: Record<string, any> = {
        first_name: inviteFirstName,
        last_name: inviteLastName,
        role: inviteRole,
        send_whatsapp: inviteSendWhatsApp,
      };
      if (inviteEmail) payload.email = inviteEmail;
      if (invitePhone) payload.phone_number = invitePhone;
      const response = await apiClient.post("/staff/invite/", payload);

      if (response.status === 201) {
        toast.success(t("invitations.sent_success"));
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInviteRole("STAFF");
        setInvitePhone("");
        setInviteSendWhatsApp(false);
        const updatedInvitationsResponse = await apiClient.get(
          "/invitations/?is_accepted=false&show_expired=false"
        );
        setPendingInvitations(updatedInvitationsResponse.data);
      } else {
        const errorData = response.data;
        toast.error(
          `Failed to send invitation: ${errorData.detail || errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error inviting staff:", error);
      toast.error(t("settings.failed_send_invitation"));
    }
  };

  const testPosConnection = async () => {
    if (posSettings.pos_provider === "NONE") {
      toast.error(t("pos.select_provider_first"));
      return;
    }
    setPosTestingConnection(true);
    try {
      const response = await apiClient.post("/settings/test_pos_connection/", {
        pos_provider: posSettings.pos_provider,
        pos_merchant_id: posSettings.pos_merchant_id,
        // For Square OAuth we validate server-side stored token; avoid sending secrets from UI.
        pos_api_key: posSettings.pos_provider === "SQUARE" ? "" : posAPIKey,
      });
      const data = response.data;
      if (data.connected) {
        setPosConnectionStatus("connected");
        setPosSettings((prev) => ({ ...prev, pos_is_connected: true }));
        toast.success(t("pos.connection.success"));
      } else {
        setPosConnectionStatus("error");
        setPosSettings((prev) => ({ ...prev, pos_is_connected: false }));
        toast.error(
          `${t("pos.connection.failed")}${data.message ? `: ${data.message}` : ""}`
        );
      }
    } catch (error) {
      setPosConnectionStatus("error");
      setPosSettings((prev) => ({ ...prev, pos_is_connected: false }));
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = translateApiError(axiosError);
      toast.error(message);
    } finally {
      setPosTestingConnection(false);
    }
  };

  const updatePosSettings = async () => {
    if (posSettings.pos_provider === "NONE") {
      toast.error(t("pos.select_provider_first"));
      return;
    }
    setSavingPos(true);
    try {
      if (posSettings.pos_provider === "SQUARE") {
        await testPosConnection();
        await fetchUnifiedSettings();
      } else if (posSettings.pos_provider === "CUSTOM") {
        await saveCustomApi();
      } else if (posSettings.pos_provider === "LIGHTSPEED") {
        await saveLightSpeed();
      } else if (posSettings.pos_provider === "TOAST") {
        await connectToast();
      } else if (posSettings.pos_provider === "CLOVER") {
        await connectClover();
      } else {
        toast.error(t("common.coming_soon") || "Coming soon");
      }
    } catch (error) {
      console.error("Failed to update POS settings:", error);
      toast.error(t("settings.failed_update_pos"));
    } finally {
      setSavingPos(false);
    }
  };

  const connectSquare = async () => {
    try {
      const resp = await apiClient.get("/settings/square/oauth/authorize/");
      const url = resp.data?.authorization_url as string | undefined;
      if (!url) {
        toast.error(t("settings.square_oauth_unavailable"));
        return;
      }
      window.location.href = url;
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      toast.error(translateApiError(axiosErr));
    }
  };

  // Toast uses partner-credentials auth — the tenant only needs to
  // provide their restaurantGuid, which the backend verifies against
  // Toast before persisting. No browser redirect.
  const [toastGuidInput, setToastGuidInput] = useState("");
  const [toastConnecting, setToastConnecting] = useState(false);
  const connectToast = async () => {
    const guid = toastGuidInput.trim();
    if (!guid) {
      toast.error(t("pos.toast.guid_required") || "Toast restaurant GUID is required.");
      return;
    }
    setToastConnecting(true);
    try {
      await apiClient.post("/pos/toast/connect/", { restaurant_guid: guid });
      toast.success(t("pos.toast.connected") || "Toast connected.");
      setToastGuidInput("");
      await fetchUnifiedSettings();
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      const status = axiosErr.response?.status;
      if (status === 501) {
        // Server returns a sanitized `detail` string for this case; prefer
        // the localized UI copy so translations stay consistent.
        toast.error(
          t("pos.toast.not_configured") ||
            "Toast is not available right now. Contact your administrator.",
        );
      } else {
        toast.error(translateApiError(axiosErr));
      }
    } finally {
      setToastConnecting(false);
    }
  };

  // Clover uses standard OAuth 2.0 — we ask the backend for the
  // authorize URL (signed state bound to this tenant) and navigate.
  const connectClover = async () => {
    try {
      const resp = await apiClient.get("/pos/clover/authorize/");
      const url = resp.data?.authorization_url as string | undefined;
      if (!url) {
        toast.error(
          t("pos.clover.not_configured") ||
            "Clover is not available right now. Contact your administrator.",
        );
        return;
      }
      window.location.href = url;
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      const status = axiosErr.response?.status;
      if (status === 501) {
        toast.error(
          t("pos.clover.not_configured") ||
            "Clover is not available right now. Contact your administrator.",
        );
      } else {
        toast.error(translateApiError(axiosErr));
      }
    }
  };

  const disconnectToastOrClover = async (provider: "TOAST" | "CLOVER") => {
    setPosDisconnecting(true);
    try {
      const path = provider === "TOAST" ? "/pos/toast/disconnect/" : "/pos/clover/disconnect/";
      await apiClient.post(path);
      toast.success(t("pos.disconnect_success"));
      await fetchUnifiedSettings();
      setPosDisconnectOpen(false);
    } catch (error) {
      toast.error(translateApiError(error as AxiosError<{ detail?: string; error?: string }>));
    } finally {
      setPosDisconnecting(false);
    }
  };

  const saveLightSpeed = async () => {
    const line = posSettings.lightspeed_line || "RESTAURANT_K";
    if (!posAPIKey) {
      toast.error("Access token is required.");
      return;
    }
    if (line === "RESTAURANT_K" && !posSettings.pos_merchant_id) {
      toast.error("Business Location ID is required for Restaurant (K-Series).");
      return;
    }
    if (line === "RETAIL_X" && !posSettings.lightspeed_domain_prefix?.trim()) {
      toast.error("Domain prefix is required for Retail (X-Series), e.g. mystore from mystore.retail.lightspeed.app.");
      return;
    }
    setSavingPos(true);
    try {
      await apiClient.put("/settings/unified/", {
        pos_provider: "LIGHTSPEED",
        pos_api_key: posAPIKey,
        pos_merchant_id: posSettings.pos_merchant_id,
        pos_location_id: posSettings.pos_location_id || "",
        lightspeed_line: line,
        lightspeed_domain_prefix: posSettings.lightspeed_domain_prefix,
      });
      toast.success("Lightspeed saved. Testing connection...");
      await testPosConnection();
      await fetchUnifiedSettings();
    } catch (error) {
      console.error("Failed to save Lightspeed:", error);
      toast.error(t("settings.failed_update_pos"));
    } finally {
      setSavingPos(false);
    }
  };

  const saveCustomApi = async () => {
    if (!posSettings.pos_custom_api_url) {
      toast.error("Please enter your API base URL.");
      return;
    }
    setSavingPos(true);
    try {
      await apiClient.put("/settings/unified/", {
        pos_provider: "CUSTOM",
        pos_custom_api_url: posSettings.pos_custom_api_url,
        pos_custom_api_key: posSettings.pos_custom_api_key || "",
      });
      toast.success("Custom API saved. Testing connection...");
      await testPosConnection();
      await fetchUnifiedSettings();
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      toast.error(translateApiError(axiosErr));
    } finally {
      setSavingPos(false);
    }
  };

  /** Clears all POS credentials (Square OAuth, Custom API, Lightspeed) via unified settings. */
  const disconnectPosPlatform = async () => {
    if (settingsSchemaVersion === null) {
      toast.error(t("pos.disconnect_version_error"));
      return;
    }
    setPosDisconnecting(true);
    try {
      const response = await apiClient.put("/settings/unified/", {
        settings_schema_version: settingsSchemaVersion,
        pos_disconnect: true,
      });
      toast.success(t("pos.disconnect_success"));
      setPosDisconnectOpen(false);
      setPosAPIKey("");
      const v = response.data?.settings_schema_version ?? response.data?.settingsVersion;
      if (typeof v === "number") {
        setSettingsSchemaVersion(v);
      }
      await fetchUnifiedSettings();
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      if (axiosErr.response?.status === 409) {
        toast.error(t("pos.disconnect_conflict"));
        await fetchUnifiedSettings();
      } else {
        toast.error(translateApiError(axiosErr) || t("pos.disconnect_error"));
      }
    } finally {
      setPosDisconnecting(false);
    }
  };

  const saveAiSettings = async () => {
    setSavingAi(true);
    try {
      await apiClient.put("/settings/unified/", {
        ai_enabled: !!aiSettings.enabled,
        ai_provider: aiSettings.ai_provider,
        ai_features_enabled: aiSettings.features_enabled,
        settings_schema_version: settingsSchemaVersion,
      });
      toast.success(t("settings.ai_updated"));
      await fetchUnifiedSettings();
    } catch (error) {
      console.error("Failed to update AI settings:", error);
      toast.error(t("settings.failed_update_ai"));
    } finally {
      setSavingAi(false);
    }
  };

  return (
    <div className={`${PAGE_SHELL} pb-24 lg:pb-8`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-5 lg:items-start">
          {/* Title sits above the content column so it shares the cards' left edge */}
          <header className="order-1 min-w-0 lg:col-span-2">
            <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white">
              {t("settings.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("settings.subtitle")}
            </p>
          </header>

          <aside className="order-2 lg:col-start-1 lg:row-start-2 lg:sticky lg:top-20 self-start">
            <SettingsNav
              items={settingsNavItems}
              activeId={activeTab}
              onSelect={setActiveTab}
              {...(canEditPermissions
                ? {
                    permissionsHref: "/dashboard/settings/permissions",
                    permissionsLabel: t("rbac.title"),
                    permissionsDescription: t("rbac.subtitle"),
                    PermissionsIcon: ShieldCheck,
                  }
                : {})}
            />
          </aside>

          <div className="order-3 min-w-0 space-y-4 lg:col-start-2 lg:row-start-2">
        <TabsContent value="profile" className="mt-0 space-y-4 focus-visible:outline-none">
          <Suspense fallback={<FormSectionSkeleton fields={5} />}>
            <ProfileSettings />
          </Suspense>
        </TabsContent>

        {!isStaff && (
          <TabsContent value="location" className="mt-0 space-y-4 focus-visible:outline-none">
            <SectionErrorBoundary label="Business Locations">
              <Suspense fallback={<FormSectionSkeleton fields={4} />}>
                <MultiLocationSettings
                  apiClient={apiClient}
                  onMutated={() => {
                    fetchUnifiedSettings();
                  }}
                />
              </Suspense>
            </SectionErrorBoundary>
          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="general" className="mt-0 space-y-4 focus-visible:outline-none">
            <SettingsSection
              icon={<Building2 className="h-5 w-5" />}
              iconClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              title={t("settings.general.restaurant_info.title")}
              description={t("settings.general.restaurant_info.description")}
            >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name">{t("settings.general.fields.name")}</Label>
                    <Input
                      id="restaurant-name"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className={settingsFieldClassName}
                      placeholder={t("settings.general.fields.name_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t("settings.general.fields.address")}</Label>
                    <Input
                      id="address"
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      className={settingsFieldClassName}
                      placeholder={t("settings.general.fields.address_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("settings.general.fields.phone")}</Label>
                    <Input
                      id="phone"
                      value={restaurantPhone}
                      onChange={(e) => setRestaurantPhone(e.target.value)}
                      className={settingsFieldClassName}
                      placeholder={t("settings.general.fields.phone_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("settings.general.fields.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={restaurantEmail}
                      onChange={(e) => setRestaurantEmail(e.target.value)}
                      className={settingsFieldClassName}
                      placeholder={t("settings.general.fields.email_placeholder")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">
                  <div className="space-y-2">
                    <Label htmlFor="business-vertical">
                      {t("settings.general.business_vertical")}
                    </Label>
                    <select
                      id="business-vertical"
                      value={businessVertical}
                      onChange={(e) => setBusinessVertical(e.target.value as BusinessVertical)}
                      className={settingsSelectClassName}
                    >
                      {ALL_BUSINESS_VERTICALS.map((v) => (
                        <option key={v} value={v}>
                          {t(`settings.general.business_vertical_${v.toLowerCase()}`)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t("settings.general.business_vertical_hint")}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 p-4">
                    <div>
                      <Label className="text-sm font-medium">
                        {t("settings.general.custom_staff_roles_title")}
                      </Label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {t("settings.general.custom_staff_roles_desc")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {customStaffRoles.map((row, idx) => (
                        <div key={row.id} className="flex gap-2 items-center">
                          <Input
                            value={row.name}
                            onChange={(e) => {
                              const next = [...customStaffRoles];
                              next[idx] = { ...row, name: e.target.value };
                              setCustomStaffRoles(next);
                            }}
                            placeholder={t("settings.general.custom_staff_roles_placeholder")}
                            className={cn(settingsFieldClassName, "h-10")}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              setCustomStaffRoles(customStaffRoles.filter((_, i) => i !== idx))
                            }
                          >
                            {t("settings.general.custom_staff_roles_remove")}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setCustomStaffRoles((prev) => [
                          ...prev,
                          { id: crypto.randomUUID(), name: "" },
                        ])
                      }
                    >
                      {t("settings.general.custom_staff_roles_add")}
                    </Button>
                  </div>
                </div>
            </SettingsSection>

            <SettingsSection
              icon={<Languages className="h-5 w-5" />}
              iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              title={t("settings.general.language_prefs_title")}
              description={t("settings.general.language_prefs_desc")}
            >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
                  <div className="space-y-2">
                    <Label htmlFor="language">{t("settings.general.language")}</Label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => persistLanguagePreference(e.target.value as Language)}
                      className={settingsSelectClassName}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t("settings.general.language_hint")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <Label htmlFor="automatic-clock-out" className="cursor-pointer">
                        {t("settings.general.automatic_clock_out")}
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("settings.general.automatic_clock_out_desc")}
                      </p>
                    </div>
                    <Switch
                      id="automatic-clock-out"
                      checked={automaticClockOut}
                      onCheckedChange={setAutomaticClockOut}
                      className="data-[state=checked]:bg-emerald-600 shrink-0"
                    />
                  </div>
                </div>
            </SettingsSection>

            <SettingsSection
              icon={<Route className="h-5 w-5" />}
              iconClassName="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              title={t("settings.general.incident_routing.title")}
              description={t("settings.general.incident_routing.description")}
            >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {INCIDENT_CATEGORY_KEYS.map((cat) => {
                      const i18nKey = `settings.general.incident_categories.${cat.toLowerCase().replace(/\s+/g, "_")}`;
                      return (
                        <div key={cat} className="space-y-1.5">
                          <Label htmlFor={`incident-assign-${cat}`}>
                            {t(i18nKey)}
                          </Label>
                          <select
                            id={`incident-assign-${cat}`}
                            value={incidentCategoryAssignees[cat] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setIncidentCategoryAssignees((prev) => {
                                const next = { ...prev };
                                if (!v) delete next[cat];
                                else next[cat] = v;
                                return next;
                              });
                            }}
                            className={settingsSelectClassName}
                          >
                            <option value="">{t("settings.general.incident_routing.unassigned")}</option>
                            {staffForSelectors.map((row) => (
                              <option key={row.id} value={row.id}>
                                {[row.first_name, row.last_name].filter(Boolean).join(" ") || row.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
            </SettingsSection>

            <SettingsStickyActions hint={t("settings.save_hint")}>
              <Button
                onClick={saveGeneralSettings}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {t("settings.general.save_general")}
              </Button>
            </SettingsStickyActions>
          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="integrations" className="mt-0 space-y-4 focus-visible:outline-none">
            <SettingsSection
              icon={<Plug className="h-5 w-5" />}
              iconClassName="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              title={t("pos.title")}
              description={t("pos.description")}
              actions={
                  <Badge
                    variant="outline"
                    className={
                      posSettings.pos_provider === "NONE"
                        ? "shrink-0 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                        : posFullyConnected
                          ? "shrink-0 border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "shrink-0 border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
                    }
                  >
                    {posSettings.pos_provider === "NONE"
                      ? t("integrations.status.pos_not_configured")
                      : posFullyConnected
                        ? t("integrations.status.fully_connected")
                        : t("integrations.status.setup_incomplete")}
                  </Badge>
              }
            >
                <div className="space-y-2">
                  <Label htmlFor="pos-provider" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("pos.provider")}</Label>
                  <select
                    id="pos-provider"
                    value={posSettings.pos_provider}
                    onChange={(e) =>
                      setPosSettings({
                        ...posSettings,
                        pos_provider: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-md"
                  >
                    <option value="NONE">{t("pos.not_configured")}</option>
                    <option value="SQUARE">Square</option>
                    <option value="TOAST">Toast</option>
                    <option value="LIGHTSPEED">Lightspeed</option>
                    <option value="CLOVER">Clover</option>
                    <option value="STRIPE" disabled={posSettings.pos_provider !== "STRIPE"}>Stripe (Coming soon…)</option>
                    <option value="CUSTOM">{t("pos.custom_api") || "Custom API"}</option>
                  </select>
                </div>

                <div>
                  {posSettings.pos_provider === "SQUARE" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.square_account") || "Square account"}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Connect via OAuth so no API keys are stored in the browser.
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            posFullyConnected
                              ? "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
                              : "border-amber-500 text-amber-900 dark:border-amber-600 dark:text-amber-200"
                          }
                        >
                          {posFullyConnected
                            ? t("integrations.status.fully_connected")
                            : t("integrations.status.setup_incomplete")}
                        </Badge>
                      </div>

                      {!posSettings.pos_is_connected ? (
                        <Button onClick={connectSquare} className="w-full">
                          <Plug className="mr-2 h-4 w-4" />
                          Connect with Square
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={testPosConnection} variant="outline" className="flex-1">
                              <Plug className="mr-2 h-4 w-4" />
                              {t("pos.test_connection")}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => setPosDisconnectOpen(true)}
                            >
                              <Unplug className="mr-2 h-4 w-4" />
                              {t("pos.disconnect")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "CUSTOM" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom API</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Connect your own POS or sales API. Mizan will pull sales, menu, and order data.
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            posFullyConnected
                              ? "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
                              : "border-amber-500 text-amber-900 dark:border-amber-600 dark:text-amber-200"
                          }
                        >
                          {posFullyConnected
                            ? t("integrations.status.fully_connected")
                            : t("integrations.status.setup_incomplete")}
                        </Badge>
                      </div>

                      <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="space-y-1">
                          <Label htmlFor="custom-api-url" className="text-sm font-medium text-slate-700 dark:text-slate-300">API Base URL *</Label>
                          <Input
                            id="custom-api-url"
                            type="url"
                            placeholder="https://your-pos-api.com/v1"
                            value={posSettings.pos_custom_api_url || ''}
                            onChange={(e) => setPosSettings({ ...posSettings, pos_custom_api_url: e.target.value })}
                          />
                          <p className="text-xs text-slate-400">
                            Your API should expose <code>/menu</code> and <code>/orders</code> endpoints.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="custom-api-key" className="text-sm font-medium text-slate-700 dark:text-slate-300">API Key / Token</Label>
                          <Input
                            id="custom-api-key"
                            type="password"
                            placeholder="Bearer token or API key (optional)"
                            value={posSettings.pos_custom_api_key || ''}
                            onChange={(e) => setPosSettings({ ...posSettings, pos_custom_api_key: e.target.value })}
                          />
                          <p className="text-xs text-slate-400">
                            Sent as <code>Authorization: Bearer &lt;key&gt;</code> header.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={saveCustomApi} disabled={savingPos || !posSettings.pos_custom_api_url} className="flex-1">
                          {savingPos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {t("pos.save_connect")}
                        </Button>
                        <Button onClick={testPosConnection} variant="outline" disabled={posTestingConnection || !posSettings.pos_custom_api_url} className="flex-1">
                          {posTestingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                          {t("pos.test_connection_short")}
                        </Button>
                      </div>
                      {posSettings.pos_is_connected && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setPosDisconnectOpen(true)}
                        >
                          <Unplug className="mr-2 h-4 w-4" />
                          {t("pos.disconnect")}
                        </Button>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "LIGHTSPEED" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Lightspeed POS</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Restaurant (K-Series) or Retail (X-Series). See{" "}
                            <a href="https://www.lightspeedhq.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                              lightspeedhq.com
                            </a>{" "}
                            for product docs.
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            posFullyConnected
                              ? "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
                              : "border-amber-500 text-amber-900 dark:border-amber-600 dark:text-amber-200"
                          }
                        >
                          {posFullyConnected
                            ? t("integrations.status.fully_connected")
                            : t("integrations.status.setup_incomplete")}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lightspeed-line" className="text-sm font-medium text-slate-700 dark:text-slate-300">Product line</Label>
                        <select
                          id="lightspeed-line"
                          value={posSettings.lightspeed_line || "RESTAURANT_K"}
                          onChange={(e) =>
                            setPosSettings({
                              ...posSettings,
                              lightspeed_line: e.target.value as POSSettings["lightspeed_line"],
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 rounded-md"
                        >
                          <option value="RESTAURANT_K">Restaurant — K-Series API</option>
                          <option value="RETAIL_X">Retail — X-Series API</option>
                        </select>
                      </div>
                      <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="space-y-1">
                          <Label htmlFor="lightspeed-api-key" className="text-sm font-medium text-slate-700 dark:text-slate-300">Access token *</Label>
                          <Input
                            id="lightspeed-api-key"
                            type={showAPIKey ? "text" : "password"}
                            placeholder="Token from Lightspeed Developer Portal"
                            value={posAPIKey}
                            onChange={(e) => setPosAPIKey(e.target.value)}
                          />
                          <p className="text-xs text-slate-400">
                            {posSettings.lightspeed_line === "RETAIL_X"
                              ? "Bearer token with sales:read (Retail X-Series)."
                              : "Bearer token with access to your location sales (Restaurant K-Series)."}
                          </p>
                        </div>
                        {posSettings.lightspeed_line === "RETAIL_X" ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="lightspeed-domain" className="text-sm font-medium text-slate-700 dark:text-slate-300">Domain prefix *</Label>
                              <Input
                                id="lightspeed-domain"
                                type="text"
                                placeholder="e.g. mystore (from mystore.retail.lightspeed.app)"
                                value={posSettings.lightspeed_domain_prefix || ""}
                                onChange={(e) => setPosSettings({ ...posSettings, lightspeed_domain_prefix: e.target.value })}
                              />
                              <p className="text-xs text-slate-400">Subdomain only, before .retail.lightspeed.app</p>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="lightspeed-outlet" className="text-sm font-medium text-slate-700 dark:text-slate-300">Outlet ID (optional)</Label>
                              <Input
                                id="lightspeed-outlet"
                                type="text"
                                placeholder="Limit search to one outlet"
                                value={posSettings.pos_location_id || ""}
                                onChange={(e) => setPosSettings({ ...posSettings, pos_location_id: e.target.value })}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <Label htmlFor="lightspeed-location-id" className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Location ID *</Label>
                            <Input
                              id="lightspeed-location-id"
                              type="text"
                              placeholder="e.g. from K-Series admin / API"
                              value={posSettings.pos_merchant_id || ""}
                              onChange={(e) => setPosSettings({ ...posSettings, pos_merchant_id: e.target.value })}
                            />
                            <p className="text-xs text-slate-400">Used in K-Series /f/v2/business-location/&#123;id&#125;/sales</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={saveLightSpeed}
                          disabled={
                            savingPos ||
                            !posAPIKey ||
                            (posSettings.lightspeed_line === "RESTAURANT_K" && !posSettings.pos_merchant_id) ||
                            (posSettings.lightspeed_line === "RETAIL_X" && !posSettings.lightspeed_domain_prefix?.trim())
                          }
                          className="flex-1"
                        >
                          {savingPos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {t("pos.save_connect")}
                        </Button>
                        <Button
                          onClick={testPosConnection}
                          variant="outline"
                          className="flex-1"
                          disabled={
                            posTestingConnection ||
                            (!posAPIKey && !posSettings.pos_is_connected) ||
                            (posSettings.lightspeed_line === "RESTAURANT_K" && !posSettings.pos_merchant_id) ||
                            (posSettings.lightspeed_line === "RETAIL_X" && !posSettings.lightspeed_domain_prefix?.trim())
                          }
                        >
                          {posTestingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                          {t("pos.test_connection_short")}
                        </Button>
                      </div>
                      {posSettings.pos_is_connected && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setPosDisconnectOpen(true)}
                        >
                          <Unplug className="mr-2 h-4 w-4" />
                          {t("pos.disconnect")}
                        </Button>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "TOAST" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Toast POS</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {t("pos.toast.subtitle") ||
                              "Provide your Toast restaurantGuid. Mizan uses its partner credentials to pull your orders — no API keys stored in your browser."}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            posFullyConnected
                              ? "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
                              : "border-amber-500 text-amber-900 dark:border-amber-600 dark:text-amber-200"
                          }
                        >
                          {posFullyConnected
                            ? t("integrations.status.fully_connected")
                            : t("integrations.status.setup_incomplete")}
                        </Badge>
                      </div>

                      {!posSettings.pos_is_connected ? (
                        <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                          <div className="space-y-1">
                            <Label htmlFor="toast-guid" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {t("pos.toast.guid_label") || "Toast restaurant GUID *"}
                            </Label>
                            <Input
                              id="toast-guid"
                              type="text"
                              placeholder="e.g. 9f8b5a7c-1234-4a56-9bcd-ef0123456789"
                              value={toastGuidInput}
                              onChange={(e) => setToastGuidInput(e.target.value)}
                            />
                            <p className="text-xs text-slate-400">
                              {t("pos.toast.guid_hint") ||
                                "Find this in Toast Web — Restaurant Admin → API access. Format: UUID."}
                            </p>
                          </div>
                          <Button
                            onClick={connectToast}
                            disabled={toastConnecting || !toastGuidInput.trim()}
                            className="w-full"
                          >
                            {toastConnecting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plug className="mr-2 h-4 w-4" />
                            )}
                            {t("pos.toast.connect") || "Connect Toast"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
                            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                              {t("pos.toast.connected_title") || "Toast is connected"}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-400 break-all">
                              {t("pos.toast.guid_label_short") || "Restaurant GUID"}:{" "}
                              <code>{posSettings.pos_merchant_id}</code>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={testPosConnection} variant="outline" className="flex-1">
                              <Plug className="mr-2 h-4 w-4" />
                              {t("pos.test_connection")}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => setPosDisconnectOpen(true)}
                            >
                              <Unplug className="mr-2 h-4 w-4" />
                              {t("pos.disconnect")}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "CLOVER" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Clover POS</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {t("pos.clover.subtitle") ||
                              "Connect via Clover App Market OAuth so tokens stay out of your browser."}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            posFullyConnected
                              ? "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300"
                              : "border-amber-500 text-amber-900 dark:border-amber-600 dark:text-amber-200"
                          }
                        >
                          {posFullyConnected
                            ? t("integrations.status.fully_connected")
                            : t("integrations.status.setup_incomplete")}
                        </Badge>
                      </div>

                      {!posSettings.pos_is_connected ? (
                        <Button onClick={connectClover} className="w-full">
                          <Plug className="mr-2 h-4 w-4" />
                          {t("pos.clover.connect") || "Connect with Clover"}
                        </Button>
                      ) : (
                        <>
                          <div className="space-y-1 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
                            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                              {t("pos.clover.connected_title") || "Clover is connected"}
                            </div>
                            {posSettings.pos_merchant_id ? (
                              <div className="text-xs text-emerald-700 dark:text-emerald-400 break-all">
                                {t("pos.clover.merchant_label") || "Merchant ID"}:{" "}
                                <code>{posSettings.pos_merchant_id}</code>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={testPosConnection} variant="outline" className="flex-1">
                              <Plug className="mr-2 h-4 w-4" />
                              {t("pos.test_connection")}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => setPosDisconnectOpen(true)}
                            >
                              <Unplug className="mr-2 h-4 w-4" />
                              {t("pos.disconnect")}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "NONE" ? null : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {posSettings.pos_provider} integration
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Coming soon. Square, Toast, Clover, Lightspeed, and Custom API are available now.
                          </div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                          Coming soon
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {posConnectionStatus !== "idle" && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${posConnectionStatus === "connected"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}
                  >
                    {posConnectionStatus === "connected" ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 dark:text-green-300">
                          POS connection successful
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800 dark:text-red-300">
                          POS connection failed
                        </span>
                      </>
                    )}
                  </div>
                )}
            </SettingsSection>

            <AlertDialog open={posDisconnectOpen} onOpenChange={setPosDisconnectOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("pos.disconnect_confirm_title")}</AlertDialogTitle>
                  <AlertDialogDescription className="text-left">
                    {t("pos.disconnect_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={posDisconnecting}>{t("settings.reservation.disconnect_cancel")}</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={posDisconnecting}
                    onClick={() => {
                      // Toast and Clover need provider-specific disconnect
                      // endpoints (the unified /settings/unified/ endpoint
                      // only understands Square/Lightspeed/Custom today).
                      if (posSettings.pos_provider === "TOAST") {
                        void disconnectToastOrClover("TOAST");
                      } else if (posSettings.pos_provider === "CLOVER") {
                        void disconnectToastOrClover("CLOVER");
                      } else {
                        void disconnectPosPlatform();
                      }
                    }}
                  >
                    {posDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                    {t("pos.disconnect")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <ReservationIntegration onIntegrationChange={() => void fetchUnifiedSettings()} />

            <SettingsSection
              icon={<Calendar className="h-5 w-5" />}
              iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              title={t("settings.gcal.title") || "Google Calendar"}
              description={t("settings.gcal.description") || "Connect Google Calendar to let Miya create meetings, reminders, and see upcoming events."}
              actions={
                  <Badge
                    variant="outline"
                    className={
                      gcalConnected
                        ? "shrink-0 border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "shrink-0 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                    }
                  >
                    {gcalConnected
                      ? t("settings.gcal.connected") || "Connected"
                      : t("settings.gcal.not_connected") || "Not connected"}
                  </Badge>
              }
            >
                {gcalConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          {t("settings.gcal.connected_title") || "Google Calendar is connected"}
                        </span>
                      </div>
                      {gcalEmail && (
                        <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                          {gcalEmail}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setGcalDisconnectOpen(true)}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      {t("settings.gcal.disconnect") || "Disconnect Google Calendar"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t("settings.gcal.connect_hint") || "Connecting Google Calendar enables Miya to schedule meetings, set reminders, and show upcoming events on your Meetings & Reminders widget."}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      disabled={gcalConnecting}
                      onClick={async () => {
                        setGcalConnecting(true);
                        try {
                          const returnTo = typeof window !== "undefined"
                            ? window.location.pathname + window.location.search
                            : "/dashboard/settings";
                          const res = await api.startGoogleCalendarConnect(returnTo);
                          if (!res.configured) {
                            toast.error(
                              t("settings.gcal.not_available") ||
                              "Google Calendar isn't available on this server yet. Please contact your administrator.",
                            );
                            return;
                          }
                          if (res.redirect_url) {
                            window.location.href = res.redirect_url;
                          }
                        } catch (err) {
                          toast.error(
                            (err instanceof Error ? err.message : null) ||
                            t("settings.gcal.connect_error") ||
                            "Failed to start Google Calendar connection.",
                          );
                        } finally {
                          setGcalConnecting(false);
                        }
                      }}
                    >
                      {gcalConnecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      {t("settings.gcal.connect") || "Connect Google Calendar"}
                    </Button>
                  </div>
                )}
            </SettingsSection>

            <AlertDialog open={gcalDisconnectOpen} onOpenChange={setGcalDisconnectOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.gcal.disconnect_title") || "Disconnect Google Calendar?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left">
                    {t("settings.gcal.disconnect_desc") || "Miya will no longer be able to create meetings or reminders, and the Meetings & Reminders widget will show a reconnect prompt. You can reconnect at any time."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={gcalDisconnecting}>
                    {t("settings.reservation.disconnect_cancel") || "Cancel"}
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={gcalDisconnecting}
                    onClick={async () => {
                      setGcalDisconnecting(true);
                      try {
                        await api.disconnectGoogleCalendar();
                        toast.success(
                          t("settings.gcal.disconnected") || "Google Calendar disconnected.",
                        );
                        setGcalConnected(false);
                        setGcalEmail("");
                        setGcalDisconnectOpen(false);
                        queryClient.invalidateQueries({ queryKey: ["dashboard", "meetings-reminders", 5] });
                        await fetchUnifiedSettings();
                      } catch (err) {
                        toast.error(
                          (err instanceof Error ? err.message : null) ||
                          t("settings.gcal.disconnect_error") || "Failed to disconnect.",
                        );
                      } finally {
                        setGcalDisconnecting(false);
                      }
                    }}
                  >
                    {gcalDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                    {t("settings.gcal.disconnect") || "Disconnect"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="billing" className="mt-0 space-y-4 focus-visible:outline-none">
            <Suspense fallback={<FormSectionSkeleton />}>
              <BillingSettings />
            </Suspense>

            <SettingsSection
              icon={<AlertCircle className="h-5 w-5" />}
              iconClassName="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              title={t("settings.danger_zone")}
              description={t("settings.danger_zone_desc")}
              className="border-red-200/80 dark:border-red-900/50"
            >
              <Button variant="destructive" className="w-full sm:w-auto h-11 rounded-xl font-semibold">
                {t("settings.delete_account")}
              </Button>
            </SettingsSection>
          </TabsContent>
        )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

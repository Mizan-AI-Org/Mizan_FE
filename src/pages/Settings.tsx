import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Users,
  MapPin,
  Plug,
  Bell,
  Shield,
  Sparkles,
  CreditCard as CreditCardIcon,
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import MenuScanner from "@/components/MenuScanner";
// Lazy-load heavy settings sections for better mobile performance
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const ProfileSettings = lazy(() => import("./ProfileSettings"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const GeolocationMapSettings = lazy(() => import("@/components/settings/GeolocationMapSettings"));
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { Language } from "@/contexts/LanguageContext.types";
import { supportedLanguages } from "@/i18n";
import axios from "axios";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { StaffInvitation } from "@/lib/types";
import { User } from "@/contexts/AuthContext.types";
import { translateApiError } from "@/i18n/messages";

import { API_BASE } from "@/lib/api";

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
  pos_is_connected: boolean;
}

interface AISettings {
  enabled: boolean;
  ai_provider: string;
  features_enabled: Record<string, boolean>;
}

export default function Settings() {
  const { language, setLanguage: setAppLanguage, t } = useLanguage();
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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  // Quick Settings States
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [savingGeolocation, setSavingGeolocation] = useState(false);
  const [posSettings, setPosSettings] = useState<POSSettings>({
    pos_provider: "NONE",
    pos_merchant_id: "",
    pos_is_connected: false,
  });
  const [posAPIKey, setPosAPIKey] = useState("");
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [savingPos, setSavingPos] = useState(false);
  const [posTestingConnection, setPosTestingConnection] = useState(false);
  const [posConnectionStatus, setPosConnectionStatus] =
    useState<PosConnectionStatus>("idle");
  // Tracks backend settings schema/version for optimistic concurrency
  const [settingsSchemaVersion, setSettingsSchemaVersion] = useState<number | null>(null);
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
  // Controlled tabs for better state management on mobile
  const [activeTab, setActiveTab] = useState<string>("profile");

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

  // Handle Square OAuth callback result (redirect back to settings)
  useEffect(() => {
    const url = new URL(window.location.href);
    const square = url.searchParams.get("square");
    const message = url.searchParams.get("message");
    if (square === "connected") {
      toast.success("Square connected");
      // Refresh settings to show connected status
      const role = (JSON.parse(localStorage.getItem("user") || "{}")?.role || "").toUpperCase();
      if (role !== "STAFF") {
        fetchUnifiedSettings();
      }
      url.searchParams.delete("square");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    } else if (square === "error") {
      toast.error(message ? `Square connect failed: ${message}` : "Square connect failed");
      url.searchParams.delete("square");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
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
      toast.error("Failed to load pending invitations.");
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
        pos_is_connected: data.pos_is_connected || false,
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
        // Include the version for optimistic locking
        settings_schema_version: settingsSchemaVersion,
      });
      if (response.status === 200) {
        toast.success(t("settings.general.save_success"));
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
      toast.error("Phone number is required when sending via WhatsApp.");
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
      toast.error("Failed to send staff invitation.");
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
        // Square uses OAuth connect flow; nothing to persist client-side.
        await testPosConnection();
        await fetchUnifiedSettings();
      } else {
        toast.error("Coming soon");
      }
    } catch (error) {
      console.error("Failed to update POS settings:", error);
      toast.error("Failed to update POS settings.");
    } finally {
      setSavingPos(false);
    }
  };

  const connectSquare = async () => {
    try {
      const resp = await apiClient.get("/settings/square/oauth/authorize/");
      const url = resp.data?.authorization_url as string | undefined;
      if (!url) {
        toast.error("Square OAuth not available");
        return;
      }
      window.location.href = url;
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      toast.error(translateApiError(axiosErr));
    }
  };

  const disconnectSquare = async () => {
    try {
      await apiClient.post("/settings/square/oauth/disconnect/", {});
      toast.success("Square disconnected");
      await fetchUnifiedSettings();
    } catch (error) {
      const axiosErr = error as AxiosError<{ detail?: string; error?: string }>;
      toast.error(translateApiError(axiosErr));
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
      toast.success("AI settings updated");
      await fetchUnifiedSettings();
    } catch (error) {
      console.error("Failed to update AI settings:", error);
      toast.error("Failed to update AI settings.");
    } finally {
      setSavingAi(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{t("settings.title")}</h1>
        {user && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {user.email}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          className="mb-4 flex w-full gap-3 overflow-x-auto whitespace-nowrap scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] p-2 bg-slate-100/80 backdrop-blur-sm rounded-2xl sm:grid sm:grid-cols-3 lg:grid-cols-5"
          aria-label="Settings sections"
        >
          <TabsTrigger
            value="profile"
            aria-label="Profile settings"
            className="flex min-w-[140px] snap-start items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/60 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 sm:justify-start"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 data-[state=active]:bg-emerald-100 transition-colors">
              <Users className="w-4 h-4 text-blue-600" aria-hidden="true" />
            </div>
            {t("settings.tabs.profile")}
          </TabsTrigger>
          {!isStaff && (
            <>
              <TabsTrigger
                value="location"
                aria-label="Geolocation settings"
                className="flex min-w-[160px] snap-start items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/60 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 sm:justify-start"
              >
                <div className="p-1.5 rounded-lg bg-rose-100 transition-colors">
                  <MapPin className="w-4 h-4 text-rose-600" aria-hidden="true" />
                </div>
                {t("settings.tabs.geolocation")}
              </TabsTrigger>
              <TabsTrigger
                value="general"
                aria-label="General settings"
                className="flex min-w-[140px] snap-start items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/60 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 sm:justify-start"
              >
                <div className="p-1.5 rounded-lg bg-indigo-100 transition-colors">
                  <Building2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                </div>
                {t("settings.tabs.general")}
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                aria-label="Integrations"
                className="flex min-w-[160px] snap-start items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/60 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 sm:justify-start"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 transition-colors">
                  <Plug className="w-4 h-4 text-purple-600" aria-hidden="true" />
                </div>
                {t("settings.tabs.integrations")}
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                aria-label="Billing"
                className="flex min-w-[130px] snap-start items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/60 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/10 sm:justify-start"
              >
                <div className="p-1.5 rounded-lg bg-amber-100 transition-colors">
                  <CreditCardIcon className="w-4 h-4 text-amber-600" aria-hidden="true" />
                </div>
                {t("settings.tabs.billing")}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("settings.profile.title")}</CardTitle>
              <CardDescription>{t("settings.profile.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("loading") || "Loading"}…</span>
                  </div>
                }
              >
                <ProfileSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {!isStaff && (
          <TabsContent value="location" className="space-y-6">
            <Suspense
              fallback={
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("loading") || "Loading"}…</span>
                </div>
              }
            >
              <GeolocationMapSettings
                latitude={latitude}
                longitude={longitude}
                radius={radius}
                geofenceEnabled={geofenceEnabled}
                geofencePolygon={geofencePolygon}
                onToggleGeofence={setGeofenceEnabled}
                onPolygonChange={setGeofencePolygon}
                onSave={saveLocationSettings}
                isSaving={savingGeolocation}
              />
            </Suspense>
          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="general" className="space-y-6">
            <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{t("settings.general.restaurant_info.title")}</CardTitle>
                    <CardDescription className="text-slate-500">{t("settings.general.restaurant_info.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name" className="text-sm font-medium text-slate-700">{t("settings.general.fields.name")}</Label>
                    <Input
                      id="restaurant-name"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                      placeholder={t("settings.general.fields.name_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-slate-700">{t("settings.general.fields.address")}</Label>
                    <Input
                      id="address"
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                      placeholder={t("settings.general.fields.address_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700">{t("settings.general.fields.phone")}</Label>
                    <Input
                      id="phone"
                      value={restaurantPhone}
                      onChange={(e) => setRestaurantPhone(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                      placeholder={t("settings.general.fields.phone_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">{t("settings.general.fields.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={restaurantEmail}
                      onChange={(e) => setRestaurantEmail(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                      placeholder={t("settings.general.fields.email_placeholder")}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium text-slate-700">
                      {t("settings.general.language")}
                    </Label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => persistLanguagePreference(e.target.value as Language)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      {t("settings.general.language_hint")}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <Button onClick={saveGeneralSettings} className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40">
                    <Save className="w-4 h-4 mr-2" />
                    {t("settings.general.save_general")}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="integrations" className="space-y-6">
            <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                    <Plug className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{t("pos.title")}</CardTitle>
                    <CardDescription className="text-slate-500">{t("pos.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pos-provider" className="text-sm font-medium text-slate-700">{t("pos.provider")}</Label>
                  <select
                    id="pos-provider"
                    value={posSettings.pos_provider}
                    onChange={(e) =>
                      setPosSettings({
                        ...posSettings,
                        pos_provider: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="NONE">{t("pos.not_configured")}</option>
                    <option value="SQUARE">Square</option>
                    <option value="TOAST" disabled={posSettings.pos_provider !== "TOAST"}>Toast (Coming soon…)</option>
                    <option value="LIGHTSPEED" disabled={posSettings.pos_provider !== "LIGHTSPEED"}>Lightspeed (Coming soon…)</option>
                    <option value="CLOVER" disabled={posSettings.pos_provider !== "CLOVER"}>Clover (Coming soon…)</option>
                    <option value="STRIPE" disabled={posSettings.pos_provider !== "STRIPE"}>Stripe (Coming soon…)</option>
                    <option value="CUSTOM" disabled={posSettings.pos_provider !== "CUSTOM"}>{t("pos.custom_api")} (Coming soon…)</option>
                  </select>
                </div>

                <div>
                  {posSettings.pos_provider === "SQUARE" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-700">Square account</div>
                          <div className="text-xs text-slate-500">
                            Connect via OAuth so no API keys are stored in the browser.
                          </div>
                        </div>
                        <Badge variant="outline" className={posSettings.pos_is_connected ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-600"}>
                          {posSettings.pos_is_connected ? "Connected" : "Not connected"}
                        </Badge>
                      </div>

                      {!posSettings.pos_is_connected ? (
                        <Button onClick={connectSquare} className="w-full">
                          <Plug className="mr-2 h-4 w-4" />
                          Connect with Square
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={testPosConnection} variant="outline" className="flex-1">
                            <Plug className="mr-2 h-4 w-4" />
                            Test Connection
                          </Button>
                          <Button onClick={disconnectSquare} variant="destructive" className="flex-1">
                            Disconnect
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : posSettings.pos_provider === "NONE" ? null : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-800">
                            {posSettings.pos_provider} integration
                          </div>
                          <div className="text-xs text-slate-500">
                            Coming soon… Square is the only supported POS integration at launch.
                          </div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 text-slate-600">
                          Coming soon…
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={updatePosSettings}
                    disabled={savingPos || posSettings.pos_provider === "NONE" || posSettings.pos_provider !== "SQUARE"}
                    className="flex-1"
                  >
                    {savingPos ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    onClick={testPosConnection}
                    variant="outline"
                    disabled={
                      posTestingConnection || posSettings.pos_provider === "NONE" || posSettings.pos_provider !== "SQUARE"
                    }
                  >
                    {posTestingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plug className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>

                {posConnectionStatus !== "idle" && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${posConnectionStatus === "connected"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                      }`}
                  >
                    {posConnectionStatus === "connected" ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800">
                          POS connection successful
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800">
                          POS connection failed
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Menu Scanner</CardTitle>
                <CardDescription>
                  Scan physical menus to digitize them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MenuScanner />
              </CardContent>
            </Card>


          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="billing" className="space-y-6">
            <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                    <CreditCardIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Billing Information</CardTitle>
                    <CardDescription className="text-slate-500">Manage your subscription and payment methods</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan - Open Access */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 rounded-full bg-emerald-100">
                      <Sparkles className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h4 className="text-xl font-bold text-slate-900">Free Access</h4>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                      </div>
                      <p className="text-sm text-slate-600 max-w-md">
                        You currently have full access to all Mizan AI features. No subscription or payment is required at this time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Notice */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-200">
                      <CreditCardIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Subscription Plans Coming Soon</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        We're working on flexible subscription options for teams of all sizes. You'll be notified when billing options become available.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-red-100 bg-gradient-to-br from-red-50 to-rose-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-red-700">Danger Zone</CardTitle>
                    <CardDescription className="text-red-600/80">
                      Permanently delete your account and all data. This cannot be undone.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-red-500/25">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}

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
import MenuScanner from "@/components/MenuScanner";
import GeolocationMapSettings from "@/components/settings/GeolocationMapSettings";
import ProfileSettings from "./ProfileSettings";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Language } from "@/contexts/LanguageContext.types";
import { supportedLanguages } from "@/i18n";
import axios from "axios";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { StaffInvitation } from "@/lib/types";
import { User } from "@/contexts/AuthContext.types";
import { translateApiError } from "@/i18n/messages";

const API_BASE =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

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
        `${t("settings.location.save_error")}${
          errData?.detail ? ": " + errData.detail : ""
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
          `${t("settings.general.save_error")}: ${
            errorData.detail || errorData.error || "Unknown error"
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
    if (!inviteEmail || !inviteFirstName || !inviteLastName || !inviteRole) {
      toast.error(t("invitations.fill_required"));
      return;
    }

    try {
      // Align with backend: /api/staff/invite/
      const response = await apiClient.post("/staff/invite/", {
        email: inviteEmail,
        first_name: inviteFirstName,
        last_name: inviteLastName,
        role: inviteRole,
      });

      if (response.status === 201) {
        toast.success(t("invitations.sent_success"));
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInviteRole("STAFF");
        const updatedInvitationsResponse = await apiClient.get(
          "/invitations/?is_accepted=false&show_expired=false"
        );
        setPendingInvitations(updatedInvitationsResponse.data);
      } else {
        const errorData = response.data;
        toast.error(
          `Failed to send invitation: ${
            errorData.detail || errorData.error || "Unknown error"
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
        pos_api_key: posAPIKey,
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
      await apiClient.put("/settings/unified/", {
        pos_provider: posSettings.pos_provider,
        pos_merchant_id: posSettings.pos_merchant_id,
        pos_api_key: posAPIKey,
        settings_schema_version: settingsSchemaVersion,
      });
      toast.success("POS settings updated");
      await testPosConnection();
      await fetchUnifiedSettings();
    } catch (error) {
      console.error("Failed to update POS settings:", error);
      toast.error("Failed to update POS settings.");
    } finally {
      setSavingPos(false);
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 mb-4">
          <TabsTrigger
            value="profile"
            className="flex items-center justify-center gap-2 text-xs sm:justify-start sm:text-sm px-3 py-2"
          >
            <Users className="w-4 h-4" />
            {t("settings.tabs.profile")}
          </TabsTrigger>
          {!isStaff && (
            <>
              <TabsTrigger
                value="location"
                className="flex items-center justify-center gap-2 text-xs sm:justify-start sm:text-sm px-3 py-2"
              >
                <MapPin className="w-4 h-4" />
                {t("settings.tabs.geolocation")}
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="flex items-center justify-center gap-2 text-xs sm:justify-start sm:text-sm px-3 py-2"
              >
                <Building2 className="w-4 h-4" />
                {t("settings.tabs.general")}
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="flex items-center justify-center gap-2 text-xs sm:justify-start sm:text-sm px-3 py-2"
              >
                <Plug className="w-4 h-4" />
                {t("settings.tabs.integrations")}
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="flex items-center justify-center gap-2 text-xs sm:justify-start sm:text-sm"
              >
                <CreditCardIcon className="w-4 h-4" />
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
              <ProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>

        {!isStaff && (
          <TabsContent value="location" className="space-y-6">
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
          </TabsContent>
        )}

        {!isStaff && (
        <TabsContent value="general" className="space-y-6">
          {/* Quick Settings - concise, responsive controls */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Settings</CardTitle>
              <CardDescription>Common controls at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
                <div className="divide-y rounded-lg border">
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive email updates about your account
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications.aiInsights}
                      onCheckedChange={(checked) =>
                        handleNotificationChange("email", "aiInsights", checked)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive push notifications on your device
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications.aiInsights}
                      onCheckedChange={(checked) =>
                        handleNotificationChange("push", "aiInsights", checked)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">SMS Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive text message alerts
                      </p>
                    </div>
                    <Switch
                      checked={smsNotificationsEnabled}
                      onCheckedChange={setSmsNotificationsEnabled}
                    />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </div>
                <div className="divide-y rounded-lg border">
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={setTwoFactorEnabled}
                    />
                  </div>
                </div>
              </div>

              {/* AI Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Features</span>
                </div>
                <div className="divide-y rounded-lg border">
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        AI-Powered Suggestions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Get intelligent recommendations and insights
                      </p>
                    </div>
                    <Switch
                      checked={!!aiSettings.features_enabled.insights}
                      onCheckedChange={(checked) =>
                        setAiSettings((prev) => ({
                          ...prev,
                          features_enabled: {
                            ...prev.features_enabled,
                            insights: checked,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Smart Scheduling</p>
                      <p className="text-xs text-muted-foreground">
                        Let AI optimize staff schedules automatically
                      </p>
                    </div>
                    <Switch
                      checked={!!aiSettings.features_enabled.recommendations}
                      onCheckedChange={(checked) =>
                        setAiSettings((prev) => ({
                          ...prev,
                          features_enabled: {
                            ...prev.features_enabled,
                            recommendations: checked,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Predictive Analytics
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enable AI-driven forecasting and predictions
                      </p>
                    </div>
                    <Switch
                      checked={!!aiSettings.features_enabled.reports}
                      onCheckedChange={(checked) =>
                        setAiSettings((prev) => ({
                          ...prev,
                          features_enabled: {
                            ...prev.features_enabled,
                            reports: checked,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>
                Manage your restaurant's basic details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label htmlFor="restaurant-name">Restaurant Name</Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={restaurantAddress}
                    onChange={(e) => setRestaurantAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantEmail}
                    onChange={(e) => setRestaurantEmail(e.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Time & Language</h4>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      aria-label="Timezone"
                    >
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Denver">America/Denver</option>
                      <option value="America/Los_Angeles">
                        America/Los_Angeles
                      </option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      aria-label="Currency"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">{t("common.language")}</Label>
                    <select
                      id="language"
                      className="w-full p-2 border rounded-lg mt-1"
                      value={language}
                      onChange={(e) => setAppLanguage(e.target.value as Language)}
                      aria-label={t("common.language")}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ma">الدارجة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">{t("settings.general.ai_prefs")}</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("settings.general.ai_auto_purchase")}</Label>
                        <p className="text-xs text-muted-foreground">{t("settings.general.ai_auto_purchase_desc")}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("settings.general.ai_smart_scheduling")}</Label>
                        <p className="text-xs text-muted-foreground">{t("settings.general.ai_smart_scheduling_desc")}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={saveGeneralSettings} className="w-full">
                {t("settings.general.save_general")}
              </Button>
            </CardContent>
          </Card>

        </TabsContent>
        )}

        {!isStaff && (
        <TabsContent value="integrations" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{t("pos.title")}</CardTitle>
              <CardDescription>
                {t("pos.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="pos-provider">{t("pos.provider")}</Label>
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
                  <option value="STRIPE">Stripe</option>
                  <option value="SQUARE">Square</option>
                  <option value="CLOVER">Clover</option>
                  <option value="CUSTOM">{t("pos.custom_api")}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="pos-merchant">{t("pos.merchant_id")}</Label>
                <Input
                  id="pos-merchant"
                  value={posSettings.pos_merchant_id}
                  onChange={(e) =>
                    setPosSettings({
                      ...posSettings,
                      pos_merchant_id: e.target.value,
                    })
                  }
                  placeholder={t("pos.merchant_id_placeholder")}
                />
              </div>

              <div>
                <Label htmlFor="pos-api-key">{t("pos.api_key")}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="pos-api-key"
                      type={showAPIKey ? "text" : "password"}
                      value={posAPIKey}
                      onChange={(e) => setPosAPIKey(e.target.value)}
                      placeholder={t("pos.api_key_placeholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAPIKey(!showAPIKey)}
                      className="absolute right-3 top-2.5 text-gray-600"
                    >
                      {showAPIKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={updatePosSettings}
                  disabled={savingPos || posSettings.pos_provider === "NONE"}
                  className="flex-1"
                >
                  {savingPos ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save & Test
                </Button>
                <Button
                  onClick={testPosConnection}
                  variant="outline"
                  disabled={
                    posTestingConnection || posSettings.pos_provider === "NONE"
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
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    posConnectionStatus === "connected"
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

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Payment Gateway Settings</CardTitle>
              <CardDescription>{t("settings.integrations.payment_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="w-full">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Stripe
                </Button>
                <Button variant="outline" className="w-full">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  PayPal
                </Button>
                <Button variant="outline" className="w-full">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Square
                </Button>
                <Button variant="outline" className="w-full">
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  Authorize.net
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveAiSettings} disabled={savingAi} variant="default">
                  {savingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("settings.integrations.save_ai_settings")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {!isStaff && (
        <TabsContent value="billing">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold">Current Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    Pro Plan - $29/month
                  </p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  Change Plan
                </Button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Next billing date: <strong>November 22, 2025</strong>
                </p>
                <p>
                  Amount: <strong>$29.00</strong>
                </p>
                <p>Payment method: Visa ending in 4242</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Payment Method</h4>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCardIcon className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm">Visa ending in 4242</p>
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
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

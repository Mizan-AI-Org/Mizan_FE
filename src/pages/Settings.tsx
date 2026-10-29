import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileWarning,
  Shield,
} from "lucide-react";
import { FormSectionSkeleton } from "@/components/skeletons";
import { useState, useEffect, useMemo, lazy, Suspense, memo } from "react";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";
import ReservationIntegration from "@/components/ReservationIntegration";
import PosIntegrations from "@/components/settings/PosIntegrations";
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
const ModulesSettings = lazy(() => import("@/components/settings/ModulesSettings"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const ComplianceDocumentsSettings = lazy(
  () => import("@/components/settings/ComplianceDocumentsSettings"),
);
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic import types resolved at runtime
const ApprovalRulesSettings = lazy(() => import("@/components/settings/ApprovalRulesSettings"));
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { Language } from "@/contexts/LanguageContext.types";
import { supportedLanguages } from "@/i18n";
import axios from "axios";
import type { AxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@/contexts/AuthContext.types";
import { translateApiError } from "@/i18n/messages";
import {
  SettingsSection,
  SettingsStickyActions,
  settingsFieldClassName,
  settingsSelectClassName,
} from "@/components/settings/SettingsSection";
import { SettingsNav, type SettingsNavItem } from "@/components/settings/SettingsNav";
import { SETTINGS_PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { HUB_TABS_TRIGGER } from "@/lib/mizan-ui";
import { cn } from "@/lib/utils";

import { API_BASE, api } from "@/lib/api";
import { CATEGORY_OWNER_GROUPS, mergeLegacyIncidentAssignees } from "@/lib/categoryOwners";
import { CategoryOwnerPicker } from "@/components/settings/CategoryOwnerPicker";
import type { StaffPickerRow } from "@/lib/staffPicker";
import {
  ALL_BUSINESS_VERTICALS,
  parseBusinessVertical,
  type BusinessVertical,
} from "@/config/staffInviteRolesByVertical";


interface GeolocationSettings {
  latitude: number;
  longitude: number;
  radius: number;
  geofence_enabled: boolean;
  geofence_polygon: Array<[number, number]>;
}

interface AISettings {
  enabled: boolean;
  ai_provider: string;
  features_enabled: Record<string, boolean>;
}

type GeneralSettingsSection = "profile" | "general" | "location" | "modules";
type IntegrationSection = "pos" | "reservations" | "calendar";
type ComplianceApprovalsSection = "compliance" | "approvals";

function normalizeSettingsTab(raw: string): string {
  const tab = (raw || "").toLowerCase();
  if (tab === "approvals" || tab === "payguard" || tab === "compliance") {
    return "compliance-approvals";
  }
  if (tab === "profile" || tab === "general" || tab === "location" || tab === "modules") {
    return "general-settings";
  }
  return tab;
}

function resolveComplianceApprovalsSection(params: URLSearchParams): ComplianceApprovalsSection {
  const section = (params.get("section") || "").toLowerCase();
  if (section === "compliance" || section === "approvals") return section;
  const legacyTab = (params.get("tab") || "").toLowerCase();
  if (legacyTab === "compliance") return "compliance";
  if (legacyTab === "approvals" || legacyTab === "payguard") return "approvals";
  return "compliance";
}

function resolveGeneralSettingsSection(params: URLSearchParams): GeneralSettingsSection {
  const section = (params.get("section") || "").toLowerCase();
  if (
    section === "profile" ||
    section === "general" ||
    section === "location" ||
    section === "modules"
  ) {
    return section;
  }
  const legacyTab = (params.get("tab") || "").toLowerCase();
  if (
    legacyTab === "profile" ||
    legacyTab === "general" ||
    legacyTab === "location" ||
    legacyTab === "modules"
  ) {
    return legacyTab;
  }
  return "profile";
}

function resolveIntegrationSection(params: URLSearchParams): IntegrationSection {
  const section = (params.get("section") || "").toLowerCase();
  if (section === "pos" || section === "reservations" || section === "calendar") {
    return section;
  }
  if (params.get("focus") === "reservations") return "reservations";
  const hash = typeof window !== "undefined" ? (window.location.hash || "").replace("#", "") : "";
  if (hash === "pos-integration") return "pos";
  return "pos";
}

function Settings() {
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
  const [allowChecklistWithoutClockIn, setAllowChecklistWithoutClockIn] = useState(false);
  const [categoryOwners, setCategoryOwners] = useState<Record<string, string[]>>({});
  const [categoryOwnerDirectory, setCategoryOwnerDirectory] = useState<
    Record<string, StaffPickerRow>
  >({});
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
  const [user, setUser] = useState<User | null>(null);
  // Quick Settings States
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [savingGeolocation, setSavingGeolocation] = useState(false);
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
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEmail, setGcalEmail] = useState("");
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
  const [gcalDisconnectOpen, setGcalDisconnectOpen] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const SETTINGS_TABS = useMemo(
    () =>
      [
        "general-settings",
        "integrations",
        "billing",
        "compliance-approvals",
      ] as const,
    [],
  );
  const initialTab = (() => {
    const fromUrl = normalizeSettingsTab(searchParams.get("tab") || "");
    return (SETTINGS_TABS as readonly string[]).includes(fromUrl) ? fromUrl : "general-settings";
  })();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [generalSection, setGeneralSection] = useState<GeneralSettingsSection>(() =>
    resolveGeneralSettingsSection(searchParams),
  );
  const [integrationSection, setIntegrationSection] = useState<IntegrationSection>(() =>
    resolveIntegrationSection(searchParams),
  );
  const [complianceApprovalsSection, setComplianceApprovalsSection] =
    useState<ComplianceApprovalsSection>(() => resolveComplianceApprovalsSection(searchParams));

  // Deep links from other screens can change ?tab= while this page stays mounted.
  useEffect(() => {
    const fromUrl = normalizeSettingsTab(searchParams.get("tab") || "");
    if (!fromUrl || !(SETTINGS_TABS as readonly string[]).includes(fromUrl)) return;
    setActiveTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams, SETTINGS_TABS]);

  useEffect(() => {
    const legacyTab = (searchParams.get("tab") || "").toLowerCase();
    if (
      legacyTab !== "profile" &&
      legacyTab !== "general" &&
      legacyTab !== "location" &&
      legacyTab !== "modules"
    ) {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", legacyTab);
        next.set("tab", "general-settings");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const legacyTab = (searchParams.get("tab") || "").toLowerCase();
    if (legacyTab !== "compliance" && legacyTab !== "approvals" && legacyTab !== "payguard") return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "compliance-approvals");
        next.set(
          "section",
          legacyTab === "compliance" ? "compliance" : "approvals",
        );
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab !== "general-settings") return;
    const section = resolveGeneralSettingsSection(searchParams);
    setGeneralSection((current) => (current === section ? current : section));
  }, [searchParams, activeTab]);

  const onGeneralSectionChange = (next: string) => {
    const section = next as GeneralSettingsSection;
    setGeneralSection(section);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", "general-settings");
        n.set("section", section);
        return n;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (activeTab !== "integrations") return;
    const section = resolveIntegrationSection(searchParams);
    setIntegrationSection((current) => (current === section ? current : section));
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (activeTab !== "integrations" || integrationSection !== "pos") return;
    const hash = (window.location.hash || "").replace("#", "");
    if (hash !== "pos-integration") return;
    const scrollToPos = () => {
      document.getElementById("pos-integration")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = window.setTimeout(scrollToPos, 120);
    return () => window.clearTimeout(t);
  }, [activeTab, integrationSection]);

  // Bookings page → Settings → Integrations → reservation (Eat Now) setup.
  useEffect(() => {
    if (searchParams.get("focus") !== "reservations") return;
    setActiveTab("integrations");
    setIntegrationSection("reservations");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "integrations");
        next.set("section", "reservations");
        next.delete("focus");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const onIntegrationSectionChange = (next: string) => {
    const section = next as IntegrationSection;
    setIntegrationSection(section);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", "integrations");
        n.set("section", section);
        return n;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (activeTab !== "compliance-approvals") return;
    const section = resolveComplianceApprovalsSection(searchParams);
    setComplianceApprovalsSection((current) => (current === section ? current : section));
  }, [searchParams, activeTab]);

  const onComplianceApprovalsSectionChange = (next: string) => {
    const section = next as ComplianceApprovalsSection;
    setComplianceApprovalsSection(section);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", "compliance-approvals");
        n.set("section", section);
        return n;
      },
      { replace: true },
    );
  };

  const onSettingsTabChange = (next: string) => {
    setActiveTab(next);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("tab", next);
        if (next === "integrations" && !n.get("section")) {
          n.set("section", "pos");
        }
        if (next === "compliance-approvals") {
          const sec = (n.get("section") || "").toLowerCase();
          if (sec !== "compliance" && sec !== "approvals") {
            n.set("section", "compliance");
          }
        }
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

  // Back from Google Calendar's sign-in page (POS sign-ins are handled by PosIntegrations).
  useEffect(() => {
    const url = new URL(window.location.href);
    const role = (JSON.parse(localStorage.getItem("user") || "{}")?.role || "").toUpperCase();
    const clean = (...keys: string[]) => {
      keys.forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    };

    const gcal = url.searchParams.get("gcal");
    if (gcal === "connected") {
      toast.success(t("dashboard.meetings_reminders.connected_toast") || "Google Calendar connected!");
      if (role !== "STAFF") fetchUnifiedSettings();
      clean("gcal", "gcal_detail");
      setActiveTab("integrations");
      setIntegrationSection("calendar");
    } else if (gcal === "error") {
      const detail = url.searchParams.get("gcal_detail") || "";
      toast.error(
        detail
          ? `${t("dashboard.meetings_reminders.connect_failed") || "Google Calendar connect failed"} (${detail})`
          : t("dashboard.meetings_reminders.connect_failed") || "Google Calendar connect failed",
      );
      clean("gcal", "gcal_detail");
      setActiveTab("integrations");
      setIntegrationSection("calendar");
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

  // Restrict non-profile settings for staff users: only admins/managers/owners see other tabs
  const roleUpper = (user?.role || "").toUpperCase();
  const isStaff = !(
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    roleUpper === "OWNER" ||
    roleUpper === "MANAGER"
  );
  const canEditPermissions =
    roleUpper === "SUPER_ADMIN" || roleUpper === "ADMIN" || roleUpper === "OWNER";

  useEffect(() => {
    // Wait for the signed-in user: before it loads the role is empty and everyone looked like staff,
    // which bounced deep links (?section=modules) back to Profile.
    if (!user?.role || !isStaff || activeTab !== "general-settings") return;
    if (generalSection === "profile") return;
    onGeneralSectionChange("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- staff may only open Profile
  }, [isStaff, activeTab, generalSection]);

  const settingsNavItems = useMemo((): SettingsNavItem[] => {
    const items: SettingsNavItem[] = [
      {
        id: "general-settings",
        label: t("settings.tabs.general_settings"),
        description: t("settings.nav.general_settings_desc"),
        icon: Building2,
      },
    ];
    if (!isStaff) {
      items.push(
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
        {
          id: "compliance-approvals",
          label: t("settings.tabs.compliance_approvals"),
          description: t("settings.nav.compliance_approvals_desc"),
          icon: Shield,
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
      setAutomaticClockOut(data.automatic_clock_out === true);
      setAllowChecklistWithoutClockIn(data.allow_checklist_without_clock_in === true);
      setBreakDuration(data.break_duration || 30);
      setEmailNotifications(data.email_notifications || emailNotifications);
      setPushNotifications(data.push_notifications || pushNotifications);
    } catch (error) {
      console.error("Failed to fetch restaurant settings:", error);
      toast.error(t("generic.toast.failed_to_load_restaurant_settings"));
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
      setAutomaticClockOut(data.automatic_clock_out === true);
      setAllowChecklistWithoutClockIn(data.allow_checklist_without_clock_in === true);
      setBreakDuration(data.break_duration || 30);
      setEmailNotifications(data.email_notifications || emailNotifications);
      setPushNotifications(data.push_notifications || pushNotifications);

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
      const legacyAssignees =
        rawAssignees && typeof rawAssignees === "object" && !Array.isArray(rawAssignees)
          ? (rawAssignees as Record<string, string>)
          : {};

      try {
        const ownersRes = await api.getCategoryOwners();
        const raw = ownersRes?.owners || {};
        const normalized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(raw)) {
          normalized[k] = Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
        }
        setCategoryOwners(mergeLegacyIncidentAssignees(normalized, legacyAssignees));
        const directory: Record<string, StaffPickerRow> = {};
        for (const [id, row] of Object.entries(ownersRes?.staff_directory || {})) {
          if (!row || typeof row !== "object") continue;
          directory[id] = {
            id: String(row.id || id),
            first_name: String(row.first_name || ""),
            last_name: String(row.last_name || ""),
            email: String(row.email || ""),
            role: row.role ? String(row.role) : undefined,
          };
        }
        setCategoryOwnerDirectory(directory);
      } catch {
        setCategoryOwners(mergeLegacyIncidentAssignees({}, legacyAssignees));
        setCategoryOwnerDirectory({});
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
        allow_checklist_without_clock_in: allowChecklistWithoutClockIn,
        break_duration: breakDuration,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        business_vertical: businessVertical,
        custom_staff_roles: customStaffRoles
          .map((r) => ({ id: r.id, name: r.name.trim() }))
          .filter((r) => r.name.length > 0),
        // Include the version for optimistic locking
        settings_schema_version: settingsSchemaVersion,
      });
      await api.saveCategoryOwners(categoryOwners);
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
    <div className={SETTINGS_PAGE_SHELL_PADDED}>
      <Tabs value={activeTab} onValueChange={onSettingsTabChange} className="space-y-0">
        <div className="flex w-full max-w-5xl flex-col gap-5">
          {/* Desktop navigation lives in the Intent rail; this is the small-screen fallback. */}
          <aside className="lg:hidden">
            <SettingsNav
              items={settingsNavItems}
              activeId={activeTab}
              onSelect={onSettingsTabChange}
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

          <div className="min-w-0 space-y-4">
        <TabsContent value="general-settings" className="mt-0 space-y-4 focus-visible:outline-none">
          {activeTab === "general-settings" ? (
          <Tabs value={generalSection} onValueChange={onGeneralSectionChange} className="space-y-4">
            <TabsList
              className={cn(
                "grid h-auto w-full gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5",
                isStaff ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4",
              )}
            >
              <TabsTrigger
                value="profile"
                className={cn(HUB_TABS_TRIGGER, "w-full py-3 text-sm font-semibold sm:text-[15px]")}
              >
                {t("settings.tabs.profile")}
              </TabsTrigger>
              {!isStaff ? (
                <>
                  <TabsTrigger
                    value="general"
                    className={cn(HUB_TABS_TRIGGER, "w-full py-3 text-sm font-semibold sm:text-[15px]")}
                  >
                    {t("settings.tabs.general")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="location"
                    className={cn(HUB_TABS_TRIGGER, "w-full py-3 text-sm font-semibold sm:text-[15px]")}
                  >
                    {t("nav.business.locations")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="modules"
                    className={cn(HUB_TABS_TRIGGER, "w-full py-3 text-sm font-semibold sm:text-[15px]")}
                  >
                    {t("settings.tabs.modules")}
                  </TabsTrigger>
                </>
              ) : null}
            </TabsList>

            <TabsContent value="profile" className="mt-0 space-y-4 focus-visible:outline-none">
              <Suspense fallback={<FormSectionSkeleton fields={5} />}>
                <ProfileSettings />
              </Suspense>
            </TabsContent>

            {!isStaff ? (
              <TabsContent value="modules" className="mt-0 space-y-4 focus-visible:outline-none">
                <Suspense fallback={<FormSectionSkeleton />}>
                  <ModulesSettings />
                </Suspense>
              </TabsContent>
            ) : null}

            {!isStaff ? (
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
            ) : null}

            {!isStaff ? (
              <TabsContent value="general" className="mt-0 space-y-4 focus-visible:outline-none">
            <SettingsSection
              icon={<Building2 className="h-5 w-5" />}
              iconClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              title={t("settings.general.restaurant_info.title")}
              description={t("settings.general.restaurant_info.description")}
              collapsible
              defaultOpen={false}
            >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
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

                  <div className="space-y-3 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                    <div>
                      <Label className="text-sm font-medium">
                        {t("settings.general.custom_staff_roles_title")}
                      </Label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {t("settings.general.custom_staff_roles_desc")}
                      </p>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
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
              collapsible
              defaultOpen
            >
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
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
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4 h-full min-h-[5.5rem]">
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
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-4 h-full min-h-[5.5rem]">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <Label htmlFor="allow-checklist-without-clock-in" className="cursor-pointer">
                        {t("settings.general.allow_checklist_without_clock_in")}
                      </Label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("settings.general.allow_checklist_without_clock_in_desc")}
                      </p>
                    </div>
                    <Switch
                      id="allow-checklist-without-clock-in"
                      checked={allowChecklistWithoutClockIn}
                      onCheckedChange={setAllowChecklistWithoutClockIn}
                      className="data-[state=checked]:bg-emerald-600 shrink-0"
                    />
                  </div>
                </div>
            </SettingsSection>

            <SettingsSection
              icon={<Route className="h-5 w-5" />}
              iconClassName="bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
              title={t("onboarding.owners.title", "Who owns what?")}
              description={t(
                "onboarding.owners.subtitle",
                "Pick one or more people for each category - incidents, requests, and tasks are routed to them automatically.",
              )}
            >
              <div className="space-y-6">
                {CATEGORY_OWNER_GROUPS.map((group) => (
                  <div key={group.groupKey} className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(group.groupKey)}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {group.items.map((cat) => (
                        <div key={cat.key} className="space-y-2 rounded-xl border border-border/50 bg-muted/10 px-3.5 py-3 min-w-0">
                          <Label className="text-sm font-medium">{t(cat.labelKey)}</Label>
                          <CategoryOwnerPicker
                            selectedIds={categoryOwners[cat.key] || []}
                            staffDirectory={categoryOwnerDirectory}
                            onChange={(ids) => {
                              setCategoryOwners((prev) => {
                                if (ids.length === 0) {
                                  const { [cat.key]: _, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [cat.key]: ids };
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
            ) : null}
          </Tabs>
          ) : null}
        </TabsContent>

        {!isStaff && (
          <TabsContent value="integrations" className="mt-0 space-y-4 focus-visible:outline-none">
            {activeTab === "integrations" ? (
            <Tabs
              value={integrationSection}
              onValueChange={onIntegrationSectionChange}
              className="w-full space-y-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
                <TabsTrigger
                  value="pos"
                  className={cn(
                    HUB_TABS_TRIGGER,
                    "w-full justify-center py-3 text-sm font-semibold sm:text-[15px]",
                  )}
                >
                  {t("settings.integrations.tabs.pos")}
                </TabsTrigger>
                <TabsTrigger
                  value="reservations"
                  className={cn(
                    HUB_TABS_TRIGGER,
                    "w-full justify-center py-3 text-sm font-semibold sm:text-[15px]",
                  )}
                >
                  {t("settings.integrations.tabs.reservations")}
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className={cn(
                    HUB_TABS_TRIGGER,
                    "w-full justify-center py-3 text-sm font-semibold sm:text-[15px]",
                  )}
                >
                  {t("settings.integrations.tabs.calendar")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pos" className="mt-0 space-y-4 focus-visible:outline-none">
            <PosIntegrations onChange={() => void fetchUnifiedSettings()} />
              </TabsContent>

              <TabsContent value="reservations" className="mt-0 space-y-4 focus-visible:outline-none">
            <div id="reservation-booking-integration" className="scroll-mt-24">
              <ReservationIntegration onIntegrationChange={() => void fetchUnifiedSettings()} />
            </div>
              </TabsContent>

              <TabsContent value="calendar" className="mt-0 space-y-4 focus-visible:outline-none">
            <SettingsSection
              icon={<Calendar className="h-5 w-5" />}
              iconClassName="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              title={t("settings.gcal.title") || "Google Calendar"}
              description={t("settings.gcal.description") || "Connect your personal Google Calendar to see your upcoming meetings and reminders."}
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
                  <div className="flex flex-col items-start gap-3">
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {t("settings.gcal.connect_hint") || "Connecting Google Calendar enables scheduling meetings, setting reminders, and showing upcoming events on your Meetings & Reminders widget."}
                    </p>
                    <Button
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
                    {t("settings.gcal.disconnect_desc") || "The system will no longer be able to create meetings or reminders, and the Meetings & Reminders widget will show a reconnect prompt. You can reconnect at any time."}
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
            </Tabs>
            ) : null}
          </TabsContent>
        )}

        {!isStaff && activeTab === "billing" ? (
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
        ) : null}

        {!isStaff && (
          <TabsContent value="compliance-approvals" className="mt-0 space-y-4 focus-visible:outline-none">
            <Tabs
              value={complianceApprovalsSection}
              onValueChange={onComplianceApprovalsSectionChange}
              className="w-full space-y-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5">
                <TabsTrigger
                  value="compliance"
                  className={cn(
                    HUB_TABS_TRIGGER,
                    "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]",
                  )}
                >
                  <FileWarning className="h-4 w-4 shrink-0" />
                  {t("settings.tabs.compliance")}
                </TabsTrigger>
                <TabsTrigger
                  value="approvals"
                  className={cn(
                    HUB_TABS_TRIGGER,
                    "w-full justify-center gap-2 py-3 text-sm font-semibold sm:text-[15px]",
                  )}
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  {t("settings.tabs.payguard")}
                </TabsTrigger>
              </TabsList>

              {complianceApprovalsSection === "compliance" ? (
              <TabsContent value="compliance" className="mt-0 focus-visible:outline-none">
                <Suspense fallback={<FormSectionSkeleton />}>
                  <ComplianceDocumentsSettings />
                </Suspense>
              </TabsContent>
              ) : null}

              {complianceApprovalsSection === "approvals" ? (
              <TabsContent value="approvals" className="mt-0 focus-visible:outline-none">
                <Suspense fallback={<FormSectionSkeleton />}>
                  <ApprovalRulesSettings />
                </Suspense>
              </TabsContent>
              ) : null}
            </Tabs>
          </TabsContent>
        )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default memo(Settings);

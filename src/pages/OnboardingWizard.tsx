/**
 * 6-step first-run onboarding wizard.
 *
 * Layout is ONE full-screen gradient page with a top progress bar, a
 * centered step card that swaps contents with a fade transition, and a
 * footer with Back / Skip / Next. Each substantive step persists to the
 * backend immediately on "Continue", so a user can close the tab at any
 * point and resume exactly where they left off (wizard reads the server
 * state on mount).
 *
 * Steps:
 *   0. Welcome           — greet by name, show what's coming
 *   1. staff_csv         — upload staff CSV (activation-by-WhatsApp flow)
 *   2. widgets           — pick which dashboard widgets to show
 *   3. widget_permissions — pick which roles can see each widget
 *   4. category_owners   — pick who owns each incident/request/task category
 *   5. google_calendar   — (optional) connect Google Calendar
 *   6. Done              — confetti + "Enjoy Mizan" → /dashboard
 *
 * Persistence: each step POSTs to the backend; on success the server marks
 * the step complete and, when all REQUIRED steps are done, sets
 * ``Restaurant.onboarding_completed_at``. The wizard then lets the user
 * click through to the dashboard.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    ArrowRight,
    CalendarPlus,
    CheckCircle2,
    ChevronRight,
    Circle,
    Download,
    FileSpreadsheet,
    Loader2,
    LucideIcon,
    PartyPopper,
    ShieldCheck,
    Sparkles,
    Upload,
    UserCog,
    Users,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BrandLogo from "@/components/BrandLogo";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import { API_BASE, api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
    DASHBOARD_WIDGET_IDS,
    DEFAULT_DASHBOARD_WIDGET_ORDER,
    WIDGET_ADD_ICONS,
    type DashboardWidgetId,
} from "@/pages/dashboard/DashboardWidgets";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type BackendStep =
    | "staff_csv"
    | "widgets"
    | "widget_permissions"
    | "category_owners"
    | "google_calendar";

type WizardStep = "welcome" | BackendStep | "done";

const WIZARD_ORDER: WizardStep[] = [
    "welcome",
    "staff_csv",
    "widgets",
    "widget_permissions",
    "category_owners",
    "google_calendar",
    "done",
];

interface OnboardingStatus {
    restaurant_id: string;
    completed: boolean;
    completed_at: string | null;
    steps: Record<BackendStep, boolean>;
    order: BackendStep[];
    required_steps: BackendStep[];
    optional_steps: BackendStep[];
    next_step: BackendStep | null;
    config: {
        widget_role_visibility: Record<string, string[]>;
        category_owners: Record<string, string>;
        google_calendar: {
            connected?: boolean;
            email?: string | null;
            skipped?: boolean;
        };
    };
}

/** Roles the wizard lets you grant widget visibility to. Keep short. */
const ROLE_CHOICES: { id: string; labelKey: string }[] = [
    { id: "SUPER_ADMIN", labelKey: "onboarding.roles.super_admin" },
    { id: "OWNER", labelKey: "onboarding.roles.owner" },
    { id: "ADMIN", labelKey: "onboarding.roles.admin" },
    { id: "MANAGER", labelKey: "onboarding.roles.manager" },
    { id: "CHEF", labelKey: "onboarding.roles.chef" },
    { id: "WAITER", labelKey: "onboarding.roles.waiter" },
    { id: "CASHIER", labelKey: "onboarding.roles.cashier" },
    { id: "ACCOUNTANT", labelKey: "onboarding.roles.accountant" },
    { id: "STAFF", labelKey: "onboarding.roles.staff" },
];

/** Categories collected on the owners step. Keys MUST match the backend list. */
const CATEGORY_GROUPS: {
    groupKey: string;
    items: { key: string; labelKey: string }[];
}[] = [
    {
        groupKey: "onboarding.owners.groups.incidents",
        items: [
            { key: "incident.equipment", labelKey: "onboarding.owners.cats.incident_equipment" },
            { key: "incident.safety", labelKey: "onboarding.owners.cats.incident_safety" },
            { key: "incident.hr", labelKey: "onboarding.owners.cats.incident_hr" },
            { key: "incident.customer", labelKey: "onboarding.owners.cats.incident_customer" },
            { key: "incident.security", labelKey: "onboarding.owners.cats.incident_security" },
            { key: "incident.quality", labelKey: "onboarding.owners.cats.incident_quality" },
        ],
    },
    {
        groupKey: "onboarding.owners.groups.requests",
        items: [
            { key: "request.payroll", labelKey: "onboarding.owners.cats.request_payroll" },
            { key: "request.scheduling", labelKey: "onboarding.owners.cats.request_scheduling" },
            { key: "request.hr", labelKey: "onboarding.owners.cats.request_hr" },
            { key: "request.document", labelKey: "onboarding.owners.cats.request_document" },
            // New buckets for the intelligent-inbox. Miya routes WhatsApp
            // messages tagged with these categories directly to the owner
            // set here. Falls back to ``incident.equipment`` if unset.
            { key: "request.maintenance", labelKey: "onboarding.owners.cats.request_maintenance" },
            { key: "request.reservations", labelKey: "onboarding.owners.cats.request_reservations" },
            { key: "request.inventory", labelKey: "onboarding.owners.cats.request_inventory" },
        ],
    },
    {
        groupKey: "onboarding.owners.groups.departments",
        items: [
            { key: "task.foh", labelKey: "onboarding.owners.cats.task_foh" },
            { key: "task.boh", labelKey: "onboarding.owners.cats.task_boh" },
            { key: "task.bar", labelKey: "onboarding.owners.cats.task_bar" },
            { key: "task.finance", labelKey: "onboarding.owners.cats.task_finance" },
        ],
    },
];

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
    "Content-Type": "application/json",
});

/* -------------------------------------------------------------------------- */
/*  CSV parsing — header-aware, very forgiving                                 */
/* -------------------------------------------------------------------------- */

interface ParsedStaffRow {
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    email?: string;
    _raw: Record<string, string>;
    _rowIndex: number;
}

/** Tiny CSV parser handling quoted cells + commas; good enough for staff CSVs. */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let cur: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            cur.push(cell);
            cell = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            cur.push(cell);
            rows.push(cur);
            cur = [];
            cell = "";
        } else {
            cell += ch;
        }
    }
    if (cell.length || cur.length) {
        cur.push(cell);
        rows.push(cur);
    }
    return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim()));
}

const HEADER_ALIASES: Record<string, keyof ParsedStaffRow | "skip"> = {
    "first name": "first_name",
    firstname: "first_name",
    given: "first_name",
    prenom: "first_name",
    "prénom": "first_name",
    "last name": "last_name",
    lastname: "last_name",
    surname: "last_name",
    family: "last_name",
    nom: "last_name",
    phone: "phone",
    "phone number": "phone",
    whatsapp: "phone",
    "whatsapp number": "phone",
    mobile: "phone",
    tel: "phone",
    telephone: "phone",
    email: "email",
    "e-mail": "email",
    mail: "email",
    role: "role",
    position: "role",
    job: "role",
    poste: "role",
};

function normalizeHeader(h: string): keyof ParsedStaffRow | "skip" {
    const clean = h.trim().toLowerCase().replace(/[_-]+/g, " ");
    return HEADER_ALIASES[clean] ?? "skip";
}

function parseStaffCsv(text: string): {
    rows: ParsedStaffRow[];
    errors: string[];
} {
    const raw = parseCsv(text);
    if (raw.length === 0) return { rows: [], errors: ["Empty file."] };
    const [header, ...body] = raw;
    const mapping = header.map(normalizeHeader);
    const rows: ParsedStaffRow[] = [];
    const errors: string[] = [];

    body.forEach((r, idx) => {
        const record: Record<string, string> = {};
        let first_name = "";
        let last_name = "";
        let phone = "";
        let role = "";
        let email = "";
        r.forEach((cell, colIdx) => {
            const key = mapping[colIdx];
            const value = (cell ?? "").trim();
            record[header[colIdx] ?? `col${colIdx}`] = value;
            if (key === "first_name") first_name = value;
            else if (key === "last_name") last_name = value;
            else if (key === "phone") phone = value;
            else if (key === "role") role = value;
            else if (key === "email") email = value;
        });
        if (!first_name && !last_name && !phone && !email) return;
        if (!first_name && !last_name) {
            errors.push(`Row ${idx + 2}: missing first/last name.`);
            return;
        }
        if (!phone && !email) {
            errors.push(`Row ${idx + 2}: needs phone or email.`);
            return;
        }
        rows.push({
            first_name,
            last_name,
            phone: phone.replace(/[^\d+]/g, ""),
            role: role || "STAFF",
            email: email || undefined,
            _raw: record,
            _rowIndex: idx + 2,
        });
    });

    return { rows, errors };
}

/**
 * Build a CSV template matching the headers our parser accepts. We ship three
 * sample rows covering the typical cases (phone-only, email-only, both) and
 * a valid role code, so the manager can just replace the examples with their
 * own team and re-upload.
 */
const STAFF_CSV_TEMPLATE_HEADERS = [
    "First Name",
    "Last Name",
    "WhatsApp",
    "Role",
    "Email",
];

const STAFF_CSV_TEMPLATE_ROWS: string[][] = [
    ["Amina", "Berrada", "+212612345678", "MANAGER", "amina@example.com"],
    ["Youssef", "El Hassani", "+212698765432", "WAITER", ""],
    ["Sara", "Alaoui", "", "CHEF", "sara@example.com"],
];

function csvEscape(value: string): string {
    const needsQuote = /[",\n\r]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuote ? `"${escaped}"` : escaped;
}

function buildStaffCsvTemplate(): string {
    const lines = [
        STAFF_CSV_TEMPLATE_HEADERS.map(csvEscape).join(","),
        ...STAFF_CSV_TEMPLATE_ROWS.map((row) => row.map(csvEscape).join(",")),
    ];
    // Prepend a UTF-8 BOM so Excel opens non-ASCII characters (e.g. accents,
    // Arabic names) correctly without a manual "Import Data" step.
    return "\ufeff" + lines.join("\r\n") + "\r\n";
}

function downloadStaffCsvTemplate(): void {
    const csv = buildStaffCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mizan-staff-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the object URL on the next tick so Safari has time to start
    // the download before it's revoked.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

const OnboardingWizard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    const [step, setStep] = useState<WizardStep>("welcome");
    const [animKey, setAnimKey] = useState(0);

    const canManage = useMemo(() => {
        const role = String(user?.role || "").toUpperCase();
        return ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(role);
    }, [user?.role]);

    /* -------------------------- Backend status -------------------------- */

    const { data: status, isLoading, error } = useQuery<OnboardingStatus>({
        queryKey: ["onboarding-status"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/onboarding/`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error("Failed to load onboarding status.");
            return res.json();
        },
        enabled: !!user,
        staleTime: 30_000,
    });

    /* -------------------------- Step navigation ------------------------- */

    const goTo = useCallback((next: WizardStep) => {
        setStep(next);
        setAnimKey((k) => k + 1);
    }, []);

    const goNext = useCallback(() => {
        const idx = WIZARD_ORDER.indexOf(step);
        const next = WIZARD_ORDER[idx + 1];
        if (next) goTo(next);
    }, [step, goTo]);

    const goBack = useCallback(() => {
        const idx = WIZARD_ORDER.indexOf(step);
        const prev = WIZARD_ORDER[idx - 1];
        if (prev) goTo(prev);
    }, [step, goTo]);

    /* On first load, resume at next_step or welcome. */
    const didAutoResume = useRef(false);
    useEffect(() => {
        if (didAutoResume.current || !status || step !== "welcome") return;
        didAutoResume.current = true;
        if (status.completed) {
            goTo("done");
        } else if (status.next_step) {
            // If user has already started, resume at their next incomplete
            // step rather than forcing them back through welcome.
            const started =
                (Object.values(status.steps) as boolean[]).some((v) => v);
            if (started) goTo(status.next_step as WizardStep);
        }
    }, [status, step, goTo]);

    /* Handle the Google OAuth callback redirect: /onboarding?gcal=connected
     * or /onboarding?gcal=error&gcal_detail=<msg>. The callback view has
     * already saved the tokens + marked the step done server-side; we
     * just need to refetch status, surface a toast, strip the query
     * params, and advance the wizard. */
    const didHandleGcalCallback = useRef(false);
    useEffect(() => {
        if (didHandleGcalCallback.current) return;
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const flag = params.get("gcal");
        if (!flag) return;
        didHandleGcalCallback.current = true;

        const detail = params.get("gcal_detail") || "";
        params.delete("gcal");
        params.delete("gcal_detail");
        const qs = params.toString();
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${qs ? `?${qs}` : ""}`,
        );

        if (flag === "connected") {
            toast.success(
                t(
                    "onboarding.gcal.connected",
                    "Google Calendar connected.",
                ),
            );
            queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
            goTo("done");
        } else {
            toast.error(
                detail
                    ? t("onboarding.gcal.error_detail", {
                          defaultValue: "Google Calendar connect failed: {{detail}}",
                          detail,
                      })
                    : t(
                          "onboarding.gcal.error",
                          "Google Calendar connect failed. Try again or skip for now.",
                      ),
            );
            goTo("google_calendar");
        }
    }, [goTo, queryClient, t]);

    /* ------------------------ Role / permission gate -------------------- */

    if (!user) return null;

    if (!canManage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="py-10 text-center space-y-4">
                        <Sparkles className="h-8 w-8 mx-auto text-slate-400" />
                        <p className="text-muted-foreground">
                            {t(
                                "onboarding.gate.owner_only",
                                "Only the restaurant owner can complete initial setup.",
                            )}
                        </p>
                        <Button variant="outline" onClick={() => navigate("/staff-dashboard")}>
                            {t("onboarding.gate.go_staff_app", "Go to my staff app")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || !status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-red-200">
                    <CardContent className="py-8 text-center text-red-600">
                        {error instanceof Error ? error.message : "Failed to load."}
                    </CardContent>
                </Card>
            </div>
        );
    }

    /* -------------------------- Progress header -------------------------- */

    const requiredDone = status.required_steps.filter((s) => status.steps[s]).length;
    const requiredTotal = status.required_steps.length;
    const progress = Math.round((requiredDone / requiredTotal) * 100);

    const currentIdx = WIZARD_ORDER.indexOf(step);
    const totalWizardSteps = WIZARD_ORDER.length;

    /* -------------------------- Render active step ----------------------- */

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/70 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
            {/* Top bar */}
            <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <BrandLogo size="sm" className="!w-6 !h-6 shadow-none" />
                        {t("onboarding.brand", "Mizan setup")}
                    </div>
                    <div className="flex-1">
                        <Progress value={progress} className="h-1.5" />
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {t("onboarding.progress_label", { defaultValue: "{{done}} of {{total}}", done: requiredDone, total: requiredTotal })}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => navigate("/dashboard")}
                    >
                        <X className="h-4 w-4 mr-1" />
                        {t("onboarding.skip_to_dashboard", "Skip for now")}
                    </Button>
                </div>
                {/* Step chips */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3 overflow-x-auto">
                    <div className="flex items-center gap-2 text-xs">
                        {WIZARD_ORDER.filter((s) => s !== "welcome" && s !== "done").map(
                            (s, i) => {
                                const done = status.steps[s as BackendStep];
                                const active = step === s;
                                return (
                                    <React.Fragment key={s}>
                                        {i > 0 && (
                                            <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => goTo(s)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap transition",
                                                active
                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                    : done
                                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200",
                                            )}
                                        >
                                            {done ? (
                                                <CheckCircle2 className="h-3 w-3" />
                                            ) : (
                                                <Circle className="h-3 w-3" />
                                            )}
                                            {t(`onboarding.steps.${s}.chip`, stepChipFallback(s))}
                                        </button>
                                    </React.Fragment>
                                );
                            },
                        )}
                    </div>
                </div>
            </div>

            {/* Step body */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <div
                    key={animKey}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    {step === "welcome" && (
                        <WelcomeStep
                            onStart={() => goTo("staff_csv")}
                            userName={user.first_name || user.email || ""}
                            restaurantName={user.restaurant_name || ""}
                            completedAlready={status.completed}
                            onEnterDashboard={() => navigate("/dashboard")}
                        />
                    )}

                    {step === "staff_csv" && (
                        <StaffCsvStep
                            status={status}
                            onSaved={async () => {
                                await markStepComplete("staff_csv");
                                await refreshStatus();
                                goNext();
                            }}
                            onSkip={goNext}
                        />
                    )}

                    {step === "widgets" && (
                        <WidgetsStep
                            status={status}
                            onSaved={async (selectedIds) => {
                                await saveWidgetSelection(selectedIds);
                                await refreshStatus();
                                goNext();
                            }}
                        />
                    )}

                    {step === "widget_permissions" && (
                        <PermissionsStep
                            status={status}
                            onSaved={async (visibility) => {
                                await saveWidgetVisibility(visibility);
                                await refreshStatus();
                                goNext();
                            }}
                        />
                    )}

                    {step === "category_owners" && (
                        <OwnersStep
                            status={status}
                            onSaved={async (owners) => {
                                await saveCategoryOwners(owners);
                                await refreshStatus();
                                goNext();
                            }}
                        />
                    )}

                    {step === "google_calendar" && (
                        <GoogleCalendarStep
                            status={status}
                            onComplete={async () => {
                                await refreshStatus();
                                goNext();
                            }}
                            onSkip={async () => {
                                await skipGoogleCalendar();
                                await refreshStatus();
                                goNext();
                            }}
                        />
                    )}

                    {step === "done" && (
                        <DoneStep
                            restaurantName={user.restaurant_name || ""}
                            onEnter={() => navigate("/dashboard")}
                        />
                    )}
                </div>

                {/* Footer nav for intermediate steps (welcome + done hide it) */}
                {step !== "welcome" && step !== "done" && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            disabled={currentIdx <= 1}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t("onboarding.back", "Back")}
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            {t("onboarding.step_of", {
                                defaultValue: "Step {{cur}} of {{total}}",
                                cur: currentIdx,
                                total: totalWizardSteps - 2,
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    /* ---------------------- Backend persistence helpers ---------------- */

    async function refreshStatus() {
        await queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
    }

    async function markStepComplete(s: BackendStep) {
        const res = await fetch(`${API_BASE}/onboarding/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ step: s }),
        });
        if (!res.ok) throw new Error("Could not save step.");
        return (await res.json()) as OnboardingStatus;
    }

    async function saveWidgetSelection(ids: DashboardWidgetId[]) {
        const res = await fetch(`${API_BASE}/dashboard/widget-order/`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({ order: ids }),
        });
        if (!res.ok) throw new Error(t("onboarding.err.save_widgets"));
        await markStepComplete("widgets");
    }

    async function saveWidgetVisibility(visibility: Record<string, string[]>) {
        const res = await fetch(`${API_BASE}/onboarding/widget-visibility/`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ visibility }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || t("onboarding.err.save_perms"));
        }
    }

    async function saveCategoryOwners(owners: Record<string, string>) {
        const res = await fetch(`${API_BASE}/onboarding/category-owners/`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ owners }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || t("onboarding.err.save_owners"));
        }
    }

    async function skipGoogleCalendar() {
        const res = await fetch(`${API_BASE}/integrations/google-calendar/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action: "skip" }),
        });
        if (!res.ok) throw new Error(t("onboarding.err.gcal"));
    }
};

function stepChipFallback(s: string): string {
    switch (s) {
        case "staff_csv":
            return "Staff";
        case "widgets":
            return "Widgets";
        case "widget_permissions":
            return "Permissions";
        case "category_owners":
            return "Owners";
        case "google_calendar":
            return "Calendar";
        default:
            return s;
    }
}

/* -------------------------------------------------------------------------- */
/*  Step: Welcome                                                              */
/* -------------------------------------------------------------------------- */

const WelcomeStep: React.FC<{
    onStart: () => void;
    userName: string;
    restaurantName: string;
    completedAlready: boolean;
    onEnterDashboard: () => void;
}> = ({ onStart, userName, restaurantName, completedAlready, onEnterDashboard }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center space-y-8 py-6">
            <div className="inline-flex items-center justify-center gap-3">
                <BrandLogo size="lg" ariaLabel="Mizan AI" />
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Mizan AI
                </span>
the system            </div>
            <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t("onboarding.welcome.title", {
                        defaultValue: "Hello {{name}}, welcome to Mizan AI",
                        name: userName || "there",
                    })}
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    {t("onboarding.welcome.subtitle", {
                        defaultValue:
                            "Let's get {{restaurant}} set up in about 2 minutes — you can skip anything you want.",
                        restaurant: restaurantName || "your business",
                    })}
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                <WelcomeBullet
                    icon={FileSpreadsheet}
                    title={t("onboarding.welcome.b1_title", "Upload your team")}
                    desc={t("onboarding.welcome.b1_desc", "A CSV of staff or collaborators — we'll invite them on WhatsApp.")}
                />
                <WelcomeBullet
                    icon={Users}
                    title={t("onboarding.welcome.b2_title", "Pick your widgets")}
                    desc={t("onboarding.welcome.b2_desc", "Choose the dashboard cards you care about most.")}
                />
                <WelcomeBullet
                    icon={ShieldCheck}
                    title={t("onboarding.welcome.b3_title", "Set permissions")}
                    desc={t("onboarding.welcome.b3_desc", "Decide which roles can see each widget.")}
                />
                <WelcomeBullet
                    icon={UserCog}
                    title={t("onboarding.welcome.b4_title", "Assign owners")}
                    desc={t("onboarding.welcome.b4_desc", "Tell Miya who handles each type of issue or request.")}
                />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                    size="lg"
                    className="gap-2 min-w-[200px] bg-emerald-500 hover:bg-emerald-600"
                    onClick={onStart}
                >
                    {completedAlready
                        ? t("onboarding.welcome.cta_resume", "Review my setup")
                        : t("onboarding.welcome.cta", "Let's get started")}
                    <ArrowRight className="h-4 w-4" />
                </Button>
                {completedAlready && (
                    <Button size="lg" variant="outline" onClick={onEnterDashboard}>
                        {t("onboarding.welcome.cta_skip", "Go to dashboard")}
                    </Button>
                )}
            </div>
        </div>
    );
};

const WelcomeBullet: React.FC<{
    icon: LucideIcon;
    title: string;
    desc: string;
}> = ({ icon: Icon, title, desc }) => (
    <div className="flex gap-3 p-4 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70">
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-0.5">
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Step 1: Staff CSV upload                                                  */
/* -------------------------------------------------------------------------- */

const StaffCsvStep: React.FC<{
    status: OnboardingStatus;
    onSaved: () => Promise<void> | void;
    onSkip: () => void;
}> = ({ status, onSaved, onSkip }) => {
    const { t } = useTranslation();
    const [rows, setRows] = useState<ParsedStaffRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = String(e.target?.result ?? "");
            const { rows, errors } = parseStaffCsv(text);
            setRows(rows);
            setErrors(errors);
        };
        reader.readAsText(file);
    }, []);

    const upload = useMutation({
        mutationFn: async () => {
            if (rows.length === 0) throw new Error(t("onboarding.staff.err.no_rows"));
            const payload = {
                staff_list: rows.map((r) => ({
                    first_name: r.first_name,
                    last_name: r.last_name,
                    phone: r.phone,
                    role: r.role,
                    email: r.email,
                })),
            };
            const res = await fetch(
                `${API_BASE}/staff/activation/upload/`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(payload),
                },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    body.detail || body.error || t("onboarding.staff.err.upload"),
                );
            }
            return res.json();
        },
        onSuccess: async () => {
            const count = rows.length;
            toast.success(
                t("onboarding.staff.saved", {
                    defaultValue: "Invited {{count}} staff — they'll get a WhatsApp.",
                    count,
                }),
            );
            await onSaved();
        },
        onError: (err: unknown) => {
            toast.error(
                err instanceof Error ? err.message : t("onboarding.staff.err.upload"),
            );
        },
    });

    const alreadyDone = status.steps.staff_csv;

    return (
        <StepShell
            icon={<FileSpreadsheet className="h-6 w-6" />}
            title={t("onboarding.staff.title", "Upload your staff")}
            subtitle={t(
                "onboarding.staff.subtitle",
                "Drop a CSV of your team. We'll send each person a WhatsApp to activate their account — no app install needed.",
            )}
            alreadyDoneBadge={alreadyDone}
        >
            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                }}
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer",
                    dragging
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                        : "border-slate-300 dark:border-slate-700 hover:border-emerald-400",
                )}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                    }}
                />
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                <div className="font-medium text-slate-800 dark:text-slate-200">
                    {fileName ||
                        t("onboarding.staff.dropzone_title", "Drop CSV here or click to browse")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    {t(
                        "onboarding.staff.dropzone_hint",
                        "Columns: First Name, Last Name, WhatsApp, Role (Email is optional).",
                    )}
                </div>
            </div>

            {/* Template helper */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 -mt-1">
                <p className="text-xs text-muted-foreground">
                    {t(
                        "onboarding.staff.template_hint",
                        "Not sure how to format your file? Grab our ready-made template.",
                    )}
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 self-start sm:self-auto"
                    onClick={(e) => {
                        // Prevent this click from bubbling up to the dropzone
                        // (the dropzone opens the file picker on click).
                        e.stopPropagation();
                        try {
                            downloadStaffCsvTemplate();
                        } catch (err) {
                            toast.error(
                                t(
                                    "onboarding.staff.template_err",
                                    "Couldn't download the template. Please try again.",
                                ),
                            );
                            console.error("csv-template download failed", err);
                        }
                    }}
                >
                    <Download className="h-4 w-4" />
                    {t("onboarding.staff.download_template", "Download CSV template")}
                </Button>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>
                            {t("onboarding.staff.preview_count", {
                                defaultValue: "{{count}} staff ready to invite",
                                count: rows.length,
                            })}
                        </span>
                        <button
                            type="button"
                            className="text-xs text-slate-500 hover:text-slate-700"
                            onClick={() => {
                                setRows([]);
                                setErrors([]);
                                setFileName(null);
                            }}
                        >
                            {t("onboarding.staff.clear", "Clear")}
                        </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        {rows.slice(0, 20).map((r) => (
                            <div
                                key={r._rowIndex}
                                className="px-3 py-2 flex items-center gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">
                                        {r.first_name} {r.last_name}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {r.phone || r.email}
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    {r.role}
                                </Badge>
                            </div>
                        ))}
                        {rows.length > 20 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                {t("onboarding.staff.preview_more", {
                                    defaultValue: "+ {{rest}} more",
                                    rest: rows.length - 20,
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {errors.length > 0 && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-medium">
                        {t("onboarding.staff.errors_title", "Some rows need attention")}
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs">
                        {errors.slice(0, 5).map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                        {errors.length > 5 && (
                            <li>
                                {t("onboarding.staff.errors_more", {
                                    defaultValue: "+ {{rest}} more",
                                    rest: errors.length - 5,
                                })}
                            </li>
                        )}
                    </ul>
                </div>
            )}

            <StepActions>
                <Button variant="ghost" onClick={onSkip} disabled={upload.isPending}>
                    {t("onboarding.skip_step", "Skip for now")}
                </Button>
                <Button
                    onClick={() => upload.mutate()}
                    disabled={rows.length === 0 || upload.isPending}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600"
                >
                    {upload.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {t("onboarding.staff.cta", {
                        defaultValue: "Invite {{count}} staff",
                        count: rows.length,
                    })}
                </Button>
            </StepActions>
        </StepShell>
    );
};

/* -------------------------------------------------------------------------- */
/*  Step 2: Widget selection                                                   */
/* -------------------------------------------------------------------------- */

const WidgetsStep: React.FC<{
    status: OnboardingStatus;
    onSaved: (ids: DashboardWidgetId[]) => Promise<void> | void;
}> = ({ status, onSaved }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Set<DashboardWidgetId>>(() => {
        // Pre-seed with system defaults; if user visited before, we can't
        // fetch their saved order here without a round-trip, so defaults are
        // a safe starting point.
        return new Set(DEFAULT_DASHBOARD_WIDGET_ORDER);
    });
    const [saving, setSaving] = useState(false);

    const toggle = (id: DashboardWidgetId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const save = async () => {
        if (selected.size === 0) {
            toast.error(t("onboarding.widgets.err.need_one", "Pick at least one widget."));
            return;
        }
        setSaving(true);
        try {
            await onSaved(
                DASHBOARD_WIDGET_IDS.filter((id) =>
                    selected.has(id),
                ) as DashboardWidgetId[],
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <StepShell
            icon={<Users className="h-6 w-6" />}
            title={t("onboarding.widgets.title", "What do you want on your dashboard?")}
            subtitle={t(
                "onboarding.widgets.subtitle",
                "Pick the cards that matter. You can always add more later from the dashboard.",
            )}
            alreadyDoneBadge={status.steps.widgets}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {DASHBOARD_WIDGET_IDS.map((id) => {
                    const Icon = WIDGET_ADD_ICONS[id];
                    const on = selected.has(id);
                    return (
                        <button
                            type="button"
                            key={id}
                            onClick={() => toggle(id)}
                            className={cn(
                                "relative text-left p-3 rounded-xl border transition select-none",
                                on
                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/20"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/60 dark:hover:bg-slate-900/30",
                            )}
                        >
                            <div
                                className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
                                    on
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {t(`dashboard.${id}.title`, widgetFallback(id))}
                            </div>
                            {on && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute top-2 right-2" />
                            )}
                        </button>
                    );
                })}
            </div>

            <StepActions>
                <div className="text-xs text-muted-foreground">
                    {t("onboarding.widgets.selected_count", {
                        defaultValue: "{{count}} selected",
                        count: selected.size,
                    })}
                </div>
                <Button
                    onClick={save}
                    disabled={saving}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRight className="h-4 w-4" />
                    )}
                    {t("onboarding.continue", "Continue")}
                </Button>
            </StepActions>
        </StepShell>
    );
};

function widgetFallback(id: DashboardWidgetId): string {
    const map: Record<DashboardWidgetId, string> = {
        insights: "Insights",
        tasks_demands: "Tasks & Demands",
        staffing: "Staffing",
        sales_or_tasks: "Sales",
        operations: "Operations",
        wellbeing: "Wellbeing",
        live_attendance: "Live attendance",
        compliance_risk: "Compliance",
        inventory_delivery: "Inventory",
        task_execution: "Task execution",
        take_orders: "Take orders",
        reservations: "Reservations",
        retail_store_ops: "Store ops",
        jobsite_crew: "Jobsite",
        ops_reports: "Ops reports",
        staff_inbox: "Staff inbox",
    };
    return map[id] || id;
}

/* -------------------------------------------------------------------------- */
/*  Step 3: Widget permissions                                                 */
/* -------------------------------------------------------------------------- */

const PermissionsStep: React.FC<{
    status: OnboardingStatus;
    onSaved: (visibility: Record<string, string[]>) => Promise<void> | void;
}> = ({ status, onSaved }) => {
    const { t } = useTranslation();
    const [visibility, setVisibility] = useState<Record<string, string[]>>(() => {
        const seeded: Record<string, string[]> = {};
        // Default every widget to OWNER/ADMIN/MANAGER as a sane starting point.
        DASHBOARD_WIDGET_IDS.forEach((id) => {
            seeded[id] = status.config.widget_role_visibility[id] || [
                "SUPER_ADMIN",
                "OWNER",
                "ADMIN",
                "MANAGER",
            ];
        });
        return seeded;
    });
    const [saving, setSaving] = useState(false);

    const toggleRole = (widgetId: string, role: string) => {
        setVisibility((prev) => {
            const cur = prev[widgetId] || [];
            const next = cur.includes(role)
                ? cur.filter((r) => r !== role)
                : [...cur, role];
            return { ...prev, [widgetId]: next };
        });
    };

    const save = async () => {
        setSaving(true);
        try {
            await onSaved(visibility);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <StepShell
            icon={<ShieldCheck className="h-6 w-6" />}
            title={t("onboarding.perms.title", "Who can see each widget?")}
            subtitle={t(
                "onboarding.perms.subtitle",
                "Choose which roles have access to each card. You can change this anytime in Settings → Permissions.",
            )}
            alreadyDoneBadge={status.steps.widget_permissions}
        >
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {DASHBOARD_WIDGET_IDS.map((id) => {
                    const Icon = WIDGET_ADD_ICONS[id];
                    const roles = visibility[id] || [];
                    return (
                        <Card key={id} className="overflow-visible">
                            <CardContent className="py-3 px-4 flex items-center gap-3 flex-wrap">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-[120px] flex-1">
                                    <div className="text-sm font-medium">
                                        {t(`dashboard.${id}.title`, widgetFallback(id))}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {roles.length === 0
                                            ? t("onboarding.perms.no_roles", "No one has access")
                                            : t("onboarding.perms.role_count", {
                                                  defaultValue: "{{count}} role(s)",
                                                  count: roles.length,
                                              })}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {ROLE_CHOICES.map((r) => {
                                        const on = roles.includes(r.id);
                                        return (
                                            <button
                                                type="button"
                                                key={r.id}
                                                onClick={() => toggleRole(id, r.id)}
                                                className={cn(
                                                    "text-[11px] px-2 py-0.5 rounded-full border transition",
                                                    on
                                                        ? "bg-emerald-500 text-white border-emerald-500"
                                                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400",
                                                )}
                                            >
                                                {t(r.labelKey, r.id)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <StepActions>
                <Button
                    variant="ghost"
                    onClick={() => {
                        const everyone: Record<string, string[]> = {};
                        DASHBOARD_WIDGET_IDS.forEach((id) => {
                            everyone[id] = ROLE_CHOICES.map((r) => r.id);
                        });
                        setVisibility(everyone);
                    }}
                >
                    {t("onboarding.perms.all_everyone", "Let everyone see everything")}
                </Button>
                <Button
                    onClick={save}
                    disabled={saving}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRight className="h-4 w-4" />
                    )}
                    {t("onboarding.continue", "Continue")}
                </Button>
            </StepActions>
        </StepShell>
    );
};

/* -------------------------------------------------------------------------- */
/*  Step 4: Category / department owners                                       */
/* -------------------------------------------------------------------------- */

interface StaffItem {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
}

const OwnersStep: React.FC<{
    status: OnboardingStatus;
    onSaved: (owners: Record<string, string>) => Promise<void> | void;
}> = ({ status, onSaved }) => {
    const { t } = useTranslation();
    const [owners, setOwners] = useState<Record<string, string>>(
        () => ({ ...(status.config.category_owners || {}) }),
    );
    const [saving, setSaving] = useState(false);

    const staffQuery = useQuery<StaffItem[]>({
        queryKey: ["onboarding-staff-list"],
        queryFn: async () => {
            const token = localStorage.getItem("access_token") || "";
            try {
                const list = await api.getStaffList(token);
                return (list as unknown as StaffItem[]) || [];
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
    });

    const staff = staffQuery.data || [];

    const setOwner = (cat: string, uid: string) => {
        setOwners((prev) => {
            if (!uid) {
                const { [cat]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [cat]: uid };
        });
    };

    const save = async () => {
        setSaving(true);
        try {
            await onSaved(owners);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <StepShell
            icon={<UserCog className="h-6 w-6" />}
            title={t("onboarding.owners.title", "Who owns what?")}
            subtitle={t(
                "onboarding.owners.subtitle",
                "Pick a default person for each category — Miya routes incidents, requests, and tasks to them automatically.",
            )}
            alreadyDoneBadge={status.steps.category_owners}
        >
            {staffQuery.isLoading ? (
                <div className="py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : staff.length === 0 ? (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                    {t(
                        "onboarding.owners.no_staff",
                        "No staff yet — upload a CSV in step 1 and come back.",
                    )}
                </div>
            ) : (
                <div className="space-y-5 max-h-[440px] overflow-y-auto pr-1">
                    {CATEGORY_GROUPS.map((group) => (
                        <div key={group.groupKey} className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t(group.groupKey, group.groupKey.split(".").pop() || "")}
                            </div>
                            <div className="space-y-1.5">
                                {group.items.map((cat) => (
                                    <div
                                        key={cat.key}
                                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                                    >
                                        <Label className="flex-1 text-sm font-medium">
                                            {t(cat.labelKey, cat.key)}
                                        </Label>
                                        <div className="w-[220px]">
                                            <Select
                                                value={owners[cat.key] || ""}
                                                onValueChange={(v) => setOwner(cat.key, v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t(
                                                            "onboarding.owners.pick_placeholder",
                                                            "Pick a person",
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {staff.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {(s.first_name || s.email || "unnamed") +
                                                                (s.last_name ? ` ${s.last_name}` : "")}
                                                            {s.role ? ` · ${s.role}` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <StepActions>
                <div className="text-xs text-muted-foreground">
                    {t("onboarding.owners.chosen_count", {
                        defaultValue: "{{count}} categories assigned",
                        count: Object.keys(owners).length,
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={async () => {
                            setSaving(true);
                            try {
                                // Saving {} still marks the step done on the
                                // backend so the wizard can complete. Owners
                                // can be configured later from Settings.
                                await onSaved({});
                            } catch (err) {
                                toast.error(
                                    err instanceof Error ? err.message : "Skip failed.",
                                );
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                    >
                        {t("onboarding.skip_step", "Skip for now")}
                    </Button>
                    <Button
                        onClick={save}
                        disabled={saving || staff.length === 0}
                        className="gap-2 bg-emerald-500 hover:bg-emerald-600"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="h-4 w-4" />
                        )}
                        {t("onboarding.continue", "Continue")}
                    </Button>
                </div>
            </StepActions>
        </StepShell>
    );
};

/* -------------------------------------------------------------------------- */
/*  Step 5: Google Calendar                                                    */
/* -------------------------------------------------------------------------- */

const GoogleCalendarStep: React.FC<{
    status: OnboardingStatus;
    onComplete: () => Promise<void> | void;
    onSkip: () => Promise<void> | void;
}> = ({ status, onComplete, onSkip }) => {
    const { t } = useTranslation();
    const [connecting, setConnecting] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [serverNote, setServerNote] = useState<string | null>(null);

    const connect = async () => {
        setConnecting(true);
        setServerNote(null);
        try {
            const res = await fetch(`${API_BASE}/integrations/google-calendar/`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ action: "connect" }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.status === 501) {
                setServerNote(
                    body.detail ||
                        t(
                            "onboarding.gcal.not_configured",
                            "Google Calendar isn't enabled on this server yet.",
                        ),
                );
                return;
            }
            if (!res.ok) {
                throw new Error(body.detail || "Could not start connect.");
            }
            if (body.redirect_url) {
                window.location.href = body.redirect_url;
                return;
            }
            await onComplete();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Connect failed.");
        } finally {
            setConnecting(false);
        }
    };

    const skip = async () => {
        setSkipping(true);
        try {
            await onSkip();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Skip failed.");
        } finally {
            setSkipping(false);
        }
    };

    return (
        <StepShell
            icon={<CalendarPlus className="h-6 w-6" />}
            title={t("onboarding.gcal.title", "Connect Google Calendar")}
            subtitle={t(
                "onboarding.gcal.subtitle",
                "Optional. Sync shifts and reservations both ways — or skip and add it later.",
            )}
            alreadyDoneBadge={status.steps.google_calendar}
            optional
        >
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900/40 text-center space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md">
                    <CalendarPlus className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                    <div className="font-medium">
                        {t("onboarding.gcal.card_title", "Two-way sync, whenever you want it")}
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {t(
                            "onboarding.gcal.card_desc",
                            "Shifts show up on your Google Calendar, meetings flow into Mizan. You can enable this later from Settings.",
                        )}
                    </p>
                </div>
                {serverNote && (
                    <div className="mx-auto max-w-md rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                        {serverNote}
                    </div>
                )}
            </div>

            <StepActions>
                <Button variant="ghost" onClick={skip} disabled={skipping || connecting}>
                    {skipping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        t("onboarding.gcal.skip", "Skip for now")
                    )}
                </Button>
                <Button
                    onClick={connect}
                    disabled={connecting || skipping}
                    className="gap-2 bg-blue-500 hover:bg-blue-600"
                >
                    {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <CalendarPlus className="h-4 w-4" />
                    )}
                    {t("onboarding.gcal.connect", "Connect Google Calendar")}
                </Button>
            </StepActions>
        </StepShell>
    );
};

/* -------------------------------------------------------------------------- */
/*  Step 6: Done                                                               */
/* -------------------------------------------------------------------------- */

const DoneStep: React.FC<{
    restaurantName: string;
    onEnter: () => void;
}> = ({ restaurantName, onEnter }) => {
    const { t } = useTranslation();

    // Pure-CSS/emoji confetti burst — no library dep.
    return (
        <div className="text-center space-y-8 py-8 relative overflow-hidden">
            <ConfettiBurst />

            <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/40 animate-in zoom-in-75 duration-500">
                <PartyPopper className="h-12 w-12 text-white" />
            </div>

            <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                    {t("onboarding.done.title", "Enjoy Mizan!")}
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    {t(
                        "onboarding.done.subtitle",
                        "{{restaurant}} is ready. Miya is listening on WhatsApp and your dashboard is live.",
                        { restaurant: restaurantName || t("onboarding.done.your_business", "Your business") },
                    )}
                </p>
            </div>

            <Button
                size="lg"
                onClick={onEnter}
                className="gap-2 min-w-[240px] bg-emerald-500 hover:bg-emerald-600"
            >
                {t("onboarding.done.cta", "Enter my dashboard")}
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
};

const ConfettiBurst: React.FC = () => {
    // 18 emoji pieces with randomized offsets and animation delays.
    // No external dependency — plain inline styles + Tailwind keyframes.
    const pieces = useMemo(
        () =>
            Array.from({ length: 18 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 0.8,
                duration: 2.5 + Math.random() * 1.5,
                emoji: ["🎉", "✨", "🎊", "🥳"][i % 4],
            })),
        [],
    );
    return (
        <div className="pointer-events-none absolute inset-0">
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className="absolute text-2xl animate-[fall_3s_linear_infinite]"
                    style={{
                        left: `${p.left}%`,
                        top: "-10%",
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                >
                    {p.emoji}
                </span>
            ))}
            <style>{`
                @keyframes fall {
                    0%   { transform: translateY(0)    rotate(0deg);   opacity: 0; }
                    10%  { opacity: 1; }
                    100% { transform: translateY(520px) rotate(360deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*  Shared scaffolding                                                         */
/* -------------------------------------------------------------------------- */

const StepShell: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    alreadyDoneBadge?: boolean;
    optional?: boolean;
}> = ({ icon, title, subtitle, children, alreadyDoneBadge, optional }) => {
    const { t } = useTranslation();
    return (
        <Card className="shadow-lg border-slate-200/80 dark:border-slate-800/80">
            <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                {title}
                            </h2>
                            {optional && (
                                <Badge variant="secondary" className="text-[10px]">
                                    {t("onboarding.optional", "optional")}
                                </Badge>
                            )}
                            {alreadyDoneBadge && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {t("onboarding.done_badge", "done")}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                    </div>
                </div>
                {children}
            </CardContent>
        </Card>
    );
};

const StepActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        {children}
    </div>
);

export default OnboardingWizard;

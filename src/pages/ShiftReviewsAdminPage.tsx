/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA, enUS, fr } from "date-fns/locale";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  MapPin,
  MapPinOff,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { logError, logInfo } from "@/lib/logging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------- Types ----------

type ReviewItem = {
  id: string;
  session_id: string;
  staff_name?: string;
  staff_id?: string;
  department?: string;
  rating: number;
  tags?: string[];
  comments?: string;
  completed_at_iso: string;
  hours_decimal?: number;
  likes_count?: number;
  duration_hms?: string;
  duration_seconds?: number;
  verified_location?: boolean;
  flags?: string[];
};

type CsvRow = {
  id: string;
  session_id: string;
  staff_name: string;
  staff_id: string;
  department: string;
  rating: number;
  tags: string;
  comments: string;
  completed_at_iso: string;
  hours_decimal: string;
  duration_hms: string;
  verified_location: string;
  flags: string;
};

type SortKey = "date" | "staff" | "rating";
type SortDir = "asc" | "desc";

// ---------- Helpers ----------

const RATING_PALETTE: Record<number, { bg: string; text: string; ring: string; label: string }> = {
  5: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
    label: "Great",
  },
  4: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/30",
    label: "Good",
  },
  3: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/30",
    label: "Decent",
  },
  2: {
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/30",
    label: "Bad",
  },
  1: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
    label: "Awful",
  },
};

const toHms = (seconds?: number | null): string | undefined => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return undefined;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const isUuid = (v: string | undefined): boolean => {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
};

function normalize(r: any): ReviewItem {
  const id: string =
    r?.id ?? r?.review_id ?? r?.uuid ?? String(r?.session_id ?? r?.shift_id ?? Math.random());
  const session_id: string =
    r?.session_id ?? r?.shift_id ?? r?.shift ?? r?.shift_uuid ?? "";
  const staff_name: string | undefined =
    r?.staff_name ??
    r?.staff ??
    (r?.staff?.first_name && r?.staff?.last_name
      ? `${r.staff.first_name} ${r.staff.last_name}`
      : undefined);
  const staff_id: string | undefined =
    r?.staff_id ?? r?.user_id ?? r?.user ?? r?.staff?.id;
  const department: string | undefined =
    r?.department ?? r?.department_name ?? r?.dept;
  const rating: number =
    typeof r?.rating === "number" ? r.rating : Number(r?.stars ?? r?.score ?? 0) || 0;
  const tags: string[] | undefined = Array.isArray(r?.tags)
    ? r.tags
    : typeof r?.tags === "string"
      ? r.tags.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(r?.tag_list)
        ? r.tag_list
        : undefined;
  const comments: string | undefined = r?.comments ?? r?.comment ?? r?.text ?? r?.notes;
  const completed_at_raw =
    r?.completed_at_iso ?? r?.completed_at ?? r?.submitted_at ?? r?.created_at ?? r?.date;
  const completed_at_iso: string = completed_at_raw
    ? new Date(completed_at_raw).toISOString()
    : new Date().toISOString();
  const hours_decimal: number | undefined =
    typeof r?.hours_decimal === "number"
      ? r.hours_decimal
      : typeof r?.hours === "number"
        ? r.hours
        : typeof r?.duration_hours === "number"
          ? r.duration_hours
          : undefined;
  const likes_count: number | undefined =
    typeof r?.likes_count === "number"
      ? r.likes_count
      : typeof r?.likes === "number"
        ? r.likes
        : undefined;
  const duration_seconds: number | undefined =
    typeof r?.duration_seconds === "number"
      ? r.duration_seconds
      : (() => {
          const start = r?.start_time ?? r?.clock_in_time;
          const end = r?.end_time ?? r?.clock_out_time;
          if (start && end) {
            const s = new Date(start).getTime();
            const e = new Date(end).getTime();
            if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
              return Math.floor((e - s) / 1000);
            }
          }
          return undefined;
        })();
  const duration_hms: string | undefined = r?.duration_hms ?? toHms(duration_seconds);
  const verified_location: boolean | undefined =
    typeof r?.verified_location === "boolean"
      ? r.verified_location
      : typeof r?.verified === "boolean"
        ? r.verified
        : undefined;
  const flags: string[] | undefined = Array.isArray(r?.flags)
    ? r.flags
    : Array.isArray(r?.flag_list)
      ? r.flag_list
      : undefined;

  return {
    id,
    session_id,
    staff_name,
    staff_id,
    department,
    rating,
    tags,
    comments,
    completed_at_iso,
    hours_decimal,
    likes_count,
    duration_hms,
    duration_seconds,
    verified_location,
    flags,
  };
}

// ---------- Subcomponents ----------

function StarRating({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const stars = [1, 2, 3, 4, 5];
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {stars.map((s) => (
        <Star
          key={s}
          className={cn(
            dim,
            s <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-black/10",
              accent,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 truncate">
              {value}
            </div>
            {hint && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {hint}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RatingDistribution({
  byRating,
  total,
}: {
  byRating: Array<{ rating: number; count: number }>;
  total: number;
}) {
  const map = new Map<number, number>();
  for (const row of byRating) map.set(row.rating, row.count);
  const rows = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: map.get(r) ?? 0,
    pct: total > 0 ? Math.round(((map.get(r) ?? 0) / total) * 100) : 0,
  }));
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const palette = RATING_PALETTE[row.rating];
        return (
          <div key={row.rating} className="flex items-center gap-3">
            <div className="flex w-10 items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.rating}
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
            </div>
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  row.rating === 5 && "bg-gradient-to-r from-emerald-500 to-emerald-400",
                  row.rating === 4 && "bg-gradient-to-r from-sky-500 to-sky-400",
                  row.rating === 3 && "bg-gradient-to-r from-amber-500 to-amber-400",
                  row.rating === 2 && "bg-gradient-to-r from-orange-500 to-orange-400",
                  row.rating === 1 && "bg-gradient-to-r from-rose-500 to-rose-400",
                )}
                style={{ width: `${Math.max(row.pct, row.count > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className="w-20 text-right text-xs">
              <span className={cn("font-semibold", palette.text)}>{row.count}</span>
              <span className="text-slate-400 dark:text-slate-500 ml-1">· {row.pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SortBtn({
  active,
  dir,
  children,
  onClick,
}: {
  active: boolean;
  dir: SortDir;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 -mx-1 px-1 rounded font-semibold tracking-tight",
        "text-[11px] uppercase",
        active
          ? "text-slate-900 dark:text-white"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
      )}
    >
      {children}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}

// ---------- Main page ----------

export default function ShiftReviewsAdminPage() {
  const { accessToken } = useAuth();
  const { t, language } = useLanguage();
  const fmtLocale = language === "fr" ? fr : language === "ar" ? arSA : enUS;

  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<string>("all");
  const [verified, setVerified] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const {
    data: stats,
    isError: statsError,
    error: statsErr,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["shiftReviewStats", accessToken],
    queryFn: () => api.getShiftReviewStats(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  const {
    data: rawReviews,
    isLoading,
    isError,
    error,
    isFetching,
    refetch: refetchReviews,
  } = useQuery<any[]>({
    queryKey: ["shiftReviews", accessToken],
    queryFn: () => api.getShiftReviews(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : 0;
      logInfo({ feature: "shift-reviews-admin", action: "fetch-success" }, `count=${count}`);
    },
    onError: (e) => {
      logError({ feature: "shift-reviews-admin", action: "fetch-error" }, e);
    },
  });

  const { data: staffProfiles } = useQuery({
    queryKey: ["staffProfiles", accessToken],
    queryFn: () => api.getStaffProfiles(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
  });

  const { data: staffList } = useQuery({
    queryKey: ["staffList", accessToken],
    queryFn: () => api.getStaffList(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
  });

  const reviews: ReviewItem[] = useMemo(() => {
    const base = Array.isArray(rawReviews) ? rawReviews.map(normalize) : [];
    const nameById = new Map<string, string>();
    if (Array.isArray(staffProfiles)) {
      for (const p of staffProfiles as any[]) {
        const full = [p?.user_details?.first_name, p?.user_details?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const uid = p?.user_details?.id ? String(p.user_details.id) : undefined;
        const pid = p?.id ? String(p.id) : undefined;
        if (uid && full) nameById.set(uid, full);
        if (pid && full && !nameById.has(pid)) nameById.set(pid, full);
      }
    }
    if (Array.isArray(staffList)) {
      for (const s of staffList as any[]) {
        const full = [s?.first_name, s?.last_name].filter(Boolean).join(" ").trim();
        const sid = s?.id ? String(s.id) : undefined;
        if (sid && full && !nameById.has(sid)) nameById.set(sid, full);
      }
    }
    return base.map((r) => {
      const resolved =
        (!isUuid(r.staff_name || undefined) && r.staff_name) ||
        (r.staff_id ? nameById.get(String(r.staff_id)) : undefined);
      return { ...r, staff_name: resolved };
    });
  }, [rawReviews, staffProfiles, staffList]);

  const filteredSorted = useMemo(() => {
    const base = (reviews || []).filter((r) => {
      const hay = `${r.staff_name || ""} ${r.department || ""} ${r.comments || ""} ${(r.tags || []).join(" ")} ${(r.flags || []).join(" ")}`.toLowerCase();
      const okSearch = search.trim() === "" || hay.includes(search.trim().toLowerCase());
      const okRating = rating === "all" || String(r.rating) === rating;
      const okVerified =
        verified === "all" ||
        (verified === "verified" && r.verified_location === true) ||
        (verified === "unverified" && r.verified_location === false);
      return okSearch && okRating && okVerified;
    });
    return base.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") {
        return (
          (new Date(a.completed_at_iso).getTime() - new Date(b.completed_at_iso).getTime()) * dir
        );
      }
      if (sortKey === "staff") {
        return (a.staff_name || "").localeCompare(b.staff_name || "") * dir;
      }
      if (sortKey === "rating") {
        return (a.rating - b.rating) * dir;
      }
      return 0;
    });
  }, [reviews, search, rating, sortKey, sortDir, verified]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ---------- Derived KPIs ----------

  const kpis = useMemo(() => {
    const totalReviews = stats?.total_reviews ?? reviews.length;
    const totalLikes = stats?.total_likes ?? reviews.reduce((acc, r) => acc + (r.likes_count ?? 0), 0);
    const ratedSum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const ratedCount = reviews.filter((r) => r.rating > 0).length;
    const avgRating = ratedCount > 0 ? ratedSum / ratedCount : 0;
    const verifiedCount = reviews.filter((r) => r.verified_location === true).length;
    const unverifiedCount = reviews.filter((r) => r.verified_location === false).length;
    const verifiedTotal = verifiedCount + unverifiedCount;
    const verifiedPct = verifiedTotal > 0 ? Math.round((verifiedCount / verifiedTotal) * 100) : null;
    return { totalReviews, totalLikes, avgRating, verifiedPct, verifiedCount, unverifiedCount };
  }, [reviews, stats]);

  const hasAnyData = (stats?.total_reviews ?? 0) > 0 || reviews.length > 0;

  const handleExportCsv = () => {
    const rows: CsvRow[] = filteredSorted.map((r) => ({
      id: r.id,
      session_id: r.session_id || "",
      staff_name: r.staff_name || "",
      staff_id: r.staff_id || "",
      department: r.department || "",
      rating: r.rating,
      tags: (r.tags || []).join("|"),
      comments: r.comments || "",
      completed_at_iso: r.completed_at_iso,
      hours_decimal: typeof r.hours_decimal === "number" ? r.hours_decimal.toFixed(2) : "",
      duration_hms: r.duration_hms || "",
      verified_location:
        r.verified_location === true
          ? t("common.yes")
          : r.verified_location === false
            ? t("common.no")
            : "",
      flags: (r.flags || []).join("|"),
    }));
    const header: Array<keyof CsvRow> = [
      "id",
      "session_id",
      "staff_name",
      "staff_id",
      "department",
      "rating",
      "tags",
      "comments",
      "completed_at_iso",
      "hours_decimal",
      "duration_hms",
      "verified_location",
      "flags",
    ];
    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift_reviews_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshing = statsFetching || isFetching;
  const handleRefresh = () => {
    refetchStats();
    refetchReviews();
  };

  // ---------- Render ----------

  return (
    <TooltipProvider delayDuration={150}>
      <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-32 lg:pb-10 max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/30 shrink-0">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {t("shift_reviews.title")}
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              {t("shift_reviews.page.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">{t("common.refresh")}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredSorted.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("shift_reviews.export_csv")}</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        {/* Analytics error banner */}
        {statsError && (
          <Card className="border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30">
            <CardContent className="py-3 text-sm text-red-700 dark:text-red-300">
              {(statsErr as any)?.message || t("shift_reviews.analytics.error")}
            </CardContent>
          </Card>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<MessageSquare className="h-5 w-5 text-white" />}
            label={t("shift_reviews.analytics.total_reviews")}
            value={kpis.totalReviews.toLocaleString()}
            hint={t("shift_reviews.kpi.total_reviews_hint")}
            accent="bg-gradient-to-br from-rose-500 to-pink-500"
          />
          <KpiCard
            icon={<Star className="h-5 w-5 text-white" />}
            label={t("shift_reviews.kpi.avg_rating")}
            value={kpis.avgRating > 0 ? kpis.avgRating.toFixed(2) : "—"}
            hint={
              kpis.avgRating > 0 ? (
                <StarRating value={Math.round(kpis.avgRating)} size="sm" />
              ) : (
                t("shift_reviews.kpi.avg_rating_empty")
              )
            }
            accent="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <KpiCard
            icon={<ThumbsUp className="h-5 w-5 text-white" />}
            label={t("shift_reviews.analytics.total_likes")}
            value={kpis.totalLikes.toLocaleString()}
            hint={t("shift_reviews.kpi.total_likes_hint")}
            accent="bg-gradient-to-br from-emerald-500 to-teal-500"
          />
          <KpiCard
            icon={<MapPin className="h-5 w-5 text-white" />}
            label={t("shift_reviews.kpi.verified_location")}
            value={kpis.verifiedPct === null ? "—" : `${kpis.verifiedPct}%`}
            hint={
              kpis.verifiedPct === null
                ? t("shift_reviews.kpi.verified_empty")
                : `${kpis.verifiedCount} ${t("common.verified")} · ${kpis.unverifiedCount} ${t("common.unverified")}`
            }
            accent="bg-gradient-to-br from-sky-500 to-indigo-500"
          />
        </div>

        {/* Distribution + tags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-100 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                {t("shift_reviews.analytics.distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnyData ? (
                <EmptyState
                  icon={<Star className="h-6 w-6 text-slate-400" />}
                  title={t("shift_reviews.analytics.no_data")}
                  hint={t("shift_reviews.analytics.no_data_hint")}
                />
              ) : (
                <RatingDistribution
                  byRating={stats?.by_rating ?? []}
                  total={stats?.total_reviews ?? reviews.length}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500" />
                {t("shift_reviews.analytics.top_tags")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.tag_counts || Object.keys(stats.tag_counts).length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-6 w-6 text-slate-400" />}
                  title={t("shift_reviews.analytics.no_tags")}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.tag_counts)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 12)
                    .map(([tag, count]) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        {tag}
                        <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                          {count as number}
                        </span>
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews table */}
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base font-bold tracking-tight">
                {t("shift_reviews.list.title")}{" "}
                <span className="text-slate-400 dark:text-slate-500 font-medium ml-1">
                  · {filteredSorted.length}
                </span>
              </CardTitle>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 pt-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder={t("shift_reviews.search.placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-2 lg:w-auto">
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger className="h-10 lg:w-[170px]">
                    <SelectValue placeholder={t("shift_reviews.filters.rating")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shift_reviews.filters.all_ratings")}</SelectItem>
                    <SelectItem value="5">{t("shift_reviews.filters.rating_5")}</SelectItem>
                    <SelectItem value="4">{t("shift_reviews.filters.rating_4")}</SelectItem>
                    <SelectItem value="3">{t("shift_reviews.filters.rating_3")}</SelectItem>
                    <SelectItem value="2">{t("shift_reviews.filters.rating_2")}</SelectItem>
                    <SelectItem value="1">{t("shift_reviews.filters.rating_1")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={verified} onValueChange={setVerified}>
                  <SelectTrigger className="h-10 lg:w-[170px]">
                    <SelectValue placeholder={t("shift_reviews.filters.location")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shift_reviews.filters.all_locations")}</SelectItem>
                    <SelectItem value="verified">{t("shift_reviews.filters.verified")}</SelectItem>
                    <SelectItem value="unverified">{t("shift_reviews.filters.unverified")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-0">
            {isError && (
              <div className="px-6 pb-3 text-sm text-red-600">
                {(error as any)?.message || t("shift_reviews.error")}
              </div>
            )}

            {isLoading ? (
              <div className="px-6 space-y-2 pb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredSorted.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={<MessageSquare className="h-6 w-6 text-slate-400" />}
                  title={t("shift_reviews.table.none")}
                  hint={
                    search || rating !== "all" || verified !== "all"
                      ? t("shift_reviews.table.none_filtered_hint")
                      : t("shift_reviews.table.none_hint")
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="px-6">
                        <SortBtn
                          active={sortKey === "date"}
                          dir={sortDir}
                          onClick={() => toggleSort("date")}
                        >
                          {t("shift_reviews.table.date")}
                        </SortBtn>
                      </TableHead>
                      <TableHead>
                        <SortBtn
                          active={sortKey === "staff"}
                          dir={sortDir}
                          onClick={() => toggleSort("staff")}
                        >
                          {t("shift_reviews.table.staff_name")}
                        </SortBtn>
                      </TableHead>
                      <TableHead>
                        <SortBtn
                          active={sortKey === "rating"}
                          dir={sortDir}
                          onClick={() => toggleSort("rating")}
                        >
                          {t("shift_reviews.table.rating")}
                        </SortBtn>
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                        {t("shift_reviews.table.department")}
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                        {t("shift_reviews.table.tags")}
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                        {t("shift_reviews.table.comments")}
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 pr-6">
                        {t("shift_reviews.table.location")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSorted.map((r) => {
                      const palette = RATING_PALETTE[r.rating] ?? RATING_PALETTE[3];
                      const dt = new Date(r.completed_at_iso);
                      const dateLabel = isNaN(dt.getTime())
                        ? r.completed_at_iso || "—"
                        : format(dt, "PP", { locale: fmtLocale });
                      const timeLabel = isNaN(dt.getTime())
                        ? ""
                        : format(dt, "p", { locale: fmtLocale });
                      const fallback =
                        ((r as any)?.staff?.first_name || "") +
                        " " +
                        ((r as any)?.staff?.last_name || "");
                      const name = (r.staff_name || fallback.trim()) || "—";
                      const initials = name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() || "")
                        .join("") || "?";
                      const tags = r.tags || [];
                      return (
                        <TableRow
                          key={r.id}
                          className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <TableCell className="px-6 py-3 whitespace-nowrap align-top">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {dateLabel}
                            </div>
                            {timeLabel && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {timeLabel}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap align-top">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                                  {name}
                                </div>
                                {r.duration_hms && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {r.duration_hms}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 align-top">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                                  palette.bg,
                                  palette.text,
                                  palette.ring,
                                )}
                              >
                                {r.rating}
                                <Star className="h-3 w-3 fill-current" aria-hidden />
                              </span>
                              <StarRating value={r.rating} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap align-top text-sm text-slate-700 dark:text-slate-300">
                            {r.department || "—"}
                          </TableCell>
                          <TableCell className="py-3 align-top max-w-[260px]">
                            {tags.length === 0 ? (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {tags.length > 3 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-2 py-0.5 text-[11px] font-medium border border-dashed border-slate-300 dark:border-slate-700">
                                        +{tags.length - 3}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{tags.slice(3).join(", ")}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3 align-top max-w-[340px]">
                            {r.comments ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                    {r.comments}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  {r.comments}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 pr-6 whitespace-nowrap align-top">
                            {r.verified_location === true ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15"
                              >
                                <MapPin className="h-3 w-3" />
                                {t("common.verified")}
                              </Badge>
                            ) : r.verified_location === false ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/15"
                              >
                                <MapPinOff className="h-3 w-3" />
                                {t("common.unverified")}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      {hint && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{hint}</p>
      )}
    </div>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ArrowUpDown, ThumbsUp } from "lucide-react";
import { format } from "date-fns";
import { logError, logInfo } from "@/lib/logging";

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

// Typed row for CSV export to avoid any usage
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

export default function ShiftReviewsAdminPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<string>("all");
  const [verified, setVerified] = useState<string>("all"); // all | verified | unverified
  const [sortKey, setSortKey] = useState<"date" | "staff" | "rating">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Stats query for analytics
  const { data: stats, isError: statsError, error: statsErr } = useQuery({
    queryKey: ["shiftReviewStats", accessToken],
    queryFn: () => api.getShiftReviewStats(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  // Fetch raw review items and normalize to our ReviewItem shape to tolerate backend field variations
  const { data: rawReviews, isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["shiftReviews", accessToken],
    queryFn: () => api.getShiftReviews(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : 0;
      logInfo({ feature: "shift-reviews-admin", action: "fetch-success" }, `count=${count}`);
    },
    onError: (e) => {
      logError({ feature: "shift-reviews-admin", action: "fetch-error" }, e);
    },
  });

  // Fetch staff profiles to map IDs -> full names for display
  const { data: staffProfiles } = useQuery({
    queryKey: ["staffProfiles", accessToken],
    queryFn: () => api.getStaffProfiles(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
  });

  // Fetch concise staff list (id, first_name, last_name) for robust ID→name mapping
  const { data: staffList } = useQuery({
    queryKey: ["staffList", accessToken],
    queryFn: () => api.getStaffList(accessToken!),
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
  });

  const toHms = (seconds?: number | null): string | undefined => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return undefined;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const normalize = (r: any): ReviewItem => {
  const id: string = r?.id ?? r?.review_id ?? r?.uuid ?? String(r?.session_id ?? r?.shift_id ?? Math.random());
  const session_id: string = r?.session_id ?? r?.shift_id ?? r?.shift ?? r?.shift_uuid ?? "";
    const staff_name: string | undefined = r?.staff_name ?? r?.staff ?? (r?.staff?.first_name && r?.staff?.last_name ? `${r.staff.first_name} ${r.staff.last_name}` : undefined);
    const staff_id: string | undefined = r?.staff_id ?? r?.user_id ?? r?.user ?? r?.staff?.id;
    const department: string | undefined = r?.department ?? r?.department_name ?? r?.dept;
    const rating: number = typeof r?.rating === "number" ? r.rating : Number(r?.stars ?? r?.score ?? 0) || 0;
    const tags: string[] | undefined = Array.isArray(r?.tags)
      ? r.tags
      : typeof r?.tags === "string"
        ? r.tags.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(r?.tag_list) ? r.tag_list : undefined;
    const comments: string | undefined = r?.comments ?? r?.comment ?? r?.text ?? r?.notes;
    const completed_at_raw = r?.completed_at_iso ?? r?.completed_at ?? r?.submitted_at ?? r?.created_at ?? r?.date;
    const completed_at_iso: string = completed_at_raw ? new Date(completed_at_raw).toISOString() : new Date().toISOString();
    const hours_decimal: number | undefined =
      typeof r?.hours_decimal === "number" ? r.hours_decimal
      : typeof r?.hours === "number" ? r.hours
      : typeof r?.duration_hours === "number" ? r.duration_hours
      : undefined;
    const likes_count: number | undefined = typeof r?.likes_count === "number" ? r.likes_count : typeof r?.likes === "number" ? r.likes : undefined;
    const duration_seconds: number | undefined =
      typeof r?.duration_seconds === "number" ? r.duration_seconds
      : (() => {
          const start = r?.start_time ?? r?.clock_in_time;
          const end = r?.end_time ?? r?.clock_out_time;
          if (start && end) {
            const s = new Date(start).getTime();
            const e = new Date(end).getTime();
            if (Number.isFinite(s) && Number.isFinite(e) && e > s) return Math.floor((e - s) / 1000);
          }
          return undefined;
        })();
    const duration_hms: string | undefined = r?.duration_hms ?? toHms(duration_seconds);
    const verified_location: boolean | undefined = typeof r?.verified_location === "boolean" ? r.verified_location : (typeof r?.verified === "boolean" ? r.verified : undefined);
    const flags: string[] | undefined = Array.isArray(r?.flags) ? r.flags : Array.isArray(r?.flag_list) ? r.flag_list : undefined;

  return { id, session_id, staff_name, staff_id, department, rating, tags, comments, completed_at_iso, hours_decimal, likes_count, duration_hms, duration_seconds, verified_location, flags };
  };

  const reviews: ReviewItem[] = useMemo(() => {
    const base = Array.isArray(rawReviews) ? rawReviews.map(normalize) : [];
    const nameById = new Map<string, string>();
    if (Array.isArray(staffProfiles)) {
      for (const p of staffProfiles as any[]) {
        const full = [p?.user_details?.first_name, p?.user_details?.last_name].filter(Boolean).join(" ").trim();
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
    const isUuid = (v: string | undefined) => {
      if (!v) return false;
      const s = String(v).trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    };
    return base.map((r) => {
      const resolved = (!isUuid(r.staff_name || undefined) && r.staff_name) || (r.staff_id ? nameById.get(String(r.staff_id)) : undefined);
      return { ...r, staff_name: resolved };
    });
  }, [rawReviews, staffProfiles, staffList, normalize]);

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
    const sorted = base.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") {
        return (new Date(a.completed_at_iso).getTime() - new Date(b.completed_at_iso).getTime()) * dir;
      }
      if (sortKey === "staff") {
        return ((a.staff_name || "").localeCompare(b.staff_name || "")) * dir;
      }
      if (sortKey === "rating") {
        return (a.rating - b.rating) * dir;
      }
      return 0;
    });
    return sorted;
  }, [reviews, search, rating, sortKey, sortDir, verified]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics summary */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Review Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {statsError && (
            <div className="py-2 text-sm text-red-600">{(statsErr as any)?.message || "Failed to load analytics."}</div>
          )}
          {!stats ? (
            <div className="py-6 text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Reviews</div>
                <div className="text-2xl font-semibold">{stats.total_reviews}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Likes</div>
                <div className="text-2xl font-semibold">{stats.total_likes}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ratings</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {stats.by_rating?.map((r: { rating: number; count: number }) => (
                    <span key={r.rating} className="px-2 py-1 rounded bg-muted text-sm">
                      {r.rating}: {r.count}
                    </span>
                  ))}
                </div>
              </div>
              {stats.tag_counts && (
                <div className="md:col-span-3">
                  <div className="text-sm text-muted-foreground">Top Tags</div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {Object.entries(stats.tag_counts)
                      .slice(0, 10)
                      .map(([tag, count]) => (
                        <span key={tag} className="px-2 py-1 rounded bg-muted text-sm">
                          {tag}: {count as number}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {Array.isArray(reviews) && reviews.length > 0 && (
                <div className="md:col-span-3">
                  <div className="flex items-center gap-3 mt-2">
                    {(() => {
                      const verifiedCount = reviews.filter(r => r.verified_location === true).length;
                      const unverifiedCount = reviews.filter(r => r.verified_location === false).length;
                      const total = verifiedCount + unverifiedCount;
                      const vPct = total ? Math.round((verifiedCount / total) * 100) : 0;
                      const uPct = total ? 100 - vPct : 0;
                      return (
                        <>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shift Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input placeholder="Search by employee, comments, or tags" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">Great (5)</SelectItem>
                <SelectItem value="4">Good (4)</SelectItem>
                <SelectItem value="3">Decent (3)</SelectItem>
                <SelectItem value="2">Bad (2)</SelectItem>
                <SelectItem value="1">Awful (1)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                const rows: CsvRow[] = filteredSorted.map(r => ({
                  id: r.id,
                  session_id: (r as any).session_id || (r as any).shift_id || "",
                  staff_name: r.staff_name || "",
                  staff_id: r.staff_id || "",
                  department: r.department || "",
                  rating: r.rating,
                  tags: (r.tags || []).join("|"),
                  comments: r.comments || "",
                  completed_at_iso: r.completed_at_iso,
                  hours_decimal: typeof r.hours_decimal === "number" ? r.hours_decimal.toFixed(2) : "",
                  duration_hms: r.duration_hms || "",
                  verified_location: r.verified_location === true ? "yes" : r.verified_location === false ? "no" : "",
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
                  ...rows.map(row =>
                    header
                      .map(h => String(row[h]).replace(/"/g, '""'))
                      .map(v => `"${v}"`)
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `shift_reviews_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          </div>

          {isError && (
            <div className="py-2 text-sm text-red-600">{(error as any)?.message || "Failed to load reviews."}</div>
          )}
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("date")}>
                    <div className="flex items-center">Date <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => toggleSort("staff")}>
                    <div className="flex items-center">Staff Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => toggleSort("rating")}>
                    <div className="flex items-center">Rating <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{(() => {
                      const t = new Date(r.completed_at_iso);
                      return isNaN(t.getTime()) ? (r.completed_at_iso || "—") : format(t, "PPpp");
                    })()}</TableCell>
                    <TableCell className="whitespace-nowrap">{
                      (() => {
                        const fallback = ((r as any)?.staff?.first_name || "") + (" ") + (((r as any)?.staff?.last_name) || "");
                        const name = r.staff_name || fallback.trim();
                        return name && name.length > 0 ? name : "—";
                      })()
                    }</TableCell>
                    <TableCell>{r.rating}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.department || "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{(r.tags || []).join(", ")}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{r.comments || ""}</TableCell>
                  </TableRow>
                ))}
                {filteredSorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">No reviews found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { logError, logInfo } from "@/lib/logging";
import { toast } from "sonner";

type Row = {
  id: string;
  template?: { id: string; name?: string; description?: string } | null;
  submitted_at?: string | null;
  status?: string | null;
  notes?: string | null;
};

const StaffSubmittedChecklists: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery<Row[]>({
    queryKey: ["staff-submitted-checklists", dateFrom, dateTo],
    queryFn: async () => {
      try {
          const my = await api.getMyChecklists({ status: "COMPLETED", page_size: 100, ordering: "-completed_at" });
          const arr = Array.isArray(my) ? my : (my.results || []);
          const rows: Row[] = arr.map((e: any) => ({
            id: String(e.id),
            template: e.template || e.template_info || null,
            submitted_at: e.completed_at || e.updated_at || null,
            status: e.review_status || (e.supervisor_approved ? 'APPROVED' : 'PENDING') || (e.status || "COMPLETED"),
            notes: e.completion_notes || null,
          }));
        logInfo({ feature: "staff-submissions", action: "load" }, `Loaded ${rows.length}`);
        return rows;
      } catch (err) {
        logError({ feature: "staff-submissions", action: "load" }, err);
        toast.error("Failed to load your submissions");
        return [];
      }
    },
    refetchInterval: 15000,
    staleTime: 15000,
  });

  const filtered = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const term = search.trim().toLowerCase();
    const inRange = arr.filter((r) => {
      const ts = r.submitted_at ? new Date(r.submitted_at).getTime() : 0;
      const fromOk = !dateFrom || ts >= new Date(dateFrom).getTime();
      const toOk = !dateTo || ts <= new Date(dateTo).getTime() + 86400000 - 1;
      return fromOk && toOk;
    });
    return inRange.filter((r) => !term || String(r.template?.name || "").toLowerCase().includes(term));
  }, [data, search, dateFrom, dateTo]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Submitted Checklists</h2>
          <p className="text-sm text-muted-foreground">View and search your completed submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by checklist" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-60" />
          <Input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-44" />
          <Input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-44" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
          <CardDescription className="text-sm">Filtered list of your submitted checklists</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No submissions found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.template?.name || "—"}</TableCell>
                      <TableCell>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "COMPLETED" ? "secondary" : "outline"} className="text-xs">{r.status || "—"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={r.notes || undefined}>{r.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSubmittedChecklists;
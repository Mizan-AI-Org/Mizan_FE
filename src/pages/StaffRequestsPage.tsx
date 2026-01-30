/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MessageCircle, FileText, Calendar, Wallet, Settings, Briefcase, Plus, AlertCircle, Clock, CheckCircle2, ChevronRight } from "lucide-react";

type StaffRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "CLOSED";

type StaffRequestComment = {
  id: string;
  kind: string;
  body: string;
  created_at: string;
  author_details?: { first_name?: string; last_name?: string; email?: string } | null;
};

type StaffRequest = {
  id: string;
  staff_name?: string;
  staff_phone?: string;
  category: string;
  priority: string;
  status: StaffRequestStatus;
  subject?: string;
  description?: string;
  source?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
  comments?: StaffRequestComment[];
};

const STATUSES: { key: StaffRequestStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "CLOSED", label: "Closed" },
];

function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("accessToken") || "";
}

function priorityBadge(priority?: string) {
  const p = String(priority || "").toUpperCase();
  if (p === "URGENT") return "bg-red-600 text-white border-red-600";
  if (p === "HIGH") return "bg-amber-500 text-white border-amber-500";
  if (p === "LOW") return "bg-slate-200 text-slate-900 border-slate-200";
  return "bg-blue-600 text-white border-blue-600";
}

function statusBadge(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200";
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200";
  if (s === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200";
  if (s === "ESCALATED") return "bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-200";
  return "bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-200";
}

function getSourceIcon(source?: string) {
  const s = String(source || "").toLowerCase();
  if (s === "whatsapp") return <MessageCircle className="w-3 h-3 text-green-600" />;
  return <Plus className="w-3 h-3 text-blue-600" />;
}

function getCategoryIcon(category?: string) {
  const c = String(category || "").toUpperCase();
  if (c === "DOCUMENT") return <FileText className="w-3.5 h-3.5" />;
  if (c === "SCHEDULING") return <Calendar className="w-3.5 h-3.5" />;
  if (c === "PAYROLL") return <Wallet className="w-3.5 h-3.5" />;
  if (c === "OPERATIONS") return <Briefcase className="w-3.5 h-3.5" />;
  if (c === "HR") return <Settings className="w-3.5 h-3.5" />;
  return <Plus className="w-3.5 h-3.5" />;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost<T>(path: string, body?: any): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

const StaffRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();

  const selectedId = params.id || null;
  const [activeStatus, setActiveStatus] = useState<StaffRequestStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [comment, setComment] = useState("");

  const listQuery = useQuery({
    queryKey: ["staff-requests", activeStatus, search],
    queryFn: async (): Promise<StaffRequest[]> => {
      const qs = new URLSearchParams();
      qs.set("status", activeStatus);
      if (search.trim()) qs.set("search", search.trim());
      const data = await apiGet<any>(`/staff/requests/?${qs.toString()}`);
      if (Array.isArray(data)) return data as StaffRequest[];
      if (data && Array.isArray(data.results)) return data.results as StaffRequest[];
      if (data && Array.isArray(data.requests)) return data.requests as StaffRequest[];
      return [];
    },
  });

  const countsQuery = useQuery({
    queryKey: ["staff-requests-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const data = await apiGet<any>("/staff/requests/counts/");
      return data?.counts || {};
    },
    refetchInterval: 30000,
  });

  const selectedQuery = useQuery({
    queryKey: ["staff-request", selectedId],
    queryFn: async (): Promise<StaffRequest | null> => {
      if (!selectedId) return null;
      return apiGet<StaffRequest>(`/staff/requests/${selectedId}/`);
    },
    enabled: !!selectedId,
  });

  const requests = useMemo(() => (Array.isArray(listQuery.data) ? listQuery.data : []), [listQuery.data]);
  const selected = selectedQuery.data || null;

  const mutateAction = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      if (!selectedId) throw new Error("No request selected");
      return apiPost(`/staff/requests/${selectedId}/${action}/`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-request"] });
    },
  });

  const onSelect = (id: string) => {
    navigate(`/dashboard/staff-requests/${id}`);
  };

  const emptyState = (
    <div className="text-sm text-muted-foreground py-10 text-center">
      No requests found.
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Staff Requests</h2>
          <p className="text-sm text-muted-foreground">
            Manager inbox for staff questions, documents, and approvals.
          </p>
        </div>
      </div>

      <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as StaffRequestStatus)}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="w-full md:w-auto bg-muted/50 p-1">
            {STATUSES.map((s) => (
              <TabsTrigger key={s.key} value={s.key} className="relative">
                {s.label}
                {countsQuery.data?.[s.key] !== undefined && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
                  >
                    {countsQuery.data[s.key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2 w-full md:w-[360px]">
            <Input
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear
            </Button>
          </div>
        </div>

        <TabsContent value={activeStatus} className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
            <Card className="h-[72vh]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Inbox</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[62vh] pr-3">
                  {listQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground py-6">Loading…</div>
                  ) : listQuery.isError ? (
                    <div className="text-sm text-red-600 py-6">Failed to load requests.</div>
                  ) : requests.length === 0 ? (
                    emptyState
                  ) : (
                    <div className="space-y-2">
                      {requests.map((r) => {
                        const isNew = new Date().getTime() - new Date(r.created_at).getTime() < 86400000;
                        const isUrgent = r.priority === "URGENT" || r.priority === "HIGH";

                        return (
                          <button
                            key={r.id}
                            onClick={() => onSelect(r.id)}
                            className={cn(
                              "w-full text-left rounded-xl border p-4 transition-all duration-200 group relative overflow-hidden",
                              selectedId === r.id
                                ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                : "border-border hover:border-border-hover hover:bg-muted/50"
                            )}
                          >
                            {isUrgent && selectedId !== r.id && (
                              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                            )}

                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getSourceIcon(r.source)}
                                  <div className="font-semibold text-sm truncate">{r.subject || "Staff request"}</div>
                                  {isNew && (
                                    <Badge className="h-4 px-1 text-[9px] bg-blue-500 hover:bg-blue-600">NEW</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <span className="font-medium text-foreground/80 truncate">{(r.staff_name || "Staff")}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    {getCategoryIcon(r.category)}
                                    {r.category}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0", statusBadge(r.status))}>
                                  {r.status}
                                </Badge>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground mt-2.5 line-clamp-1 leading-relaxed">
                              {r.description || ""}
                            </div>

                            <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground/70">
                              <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <ChevronRight className={cn("w-3 h-3 transition-transform", selectedId === r.id ? "rotate-90 text-primary" : "group-hover:translate-x-0.5")} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="h-[72vh]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Request details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!selectedId ? (
                  <div className="text-sm text-muted-foreground py-10 text-center">
                    Select a request on the left.
                  </div>
                ) : selectedQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-6">Loading…</div>
                ) : selectedQuery.isError || !selected ? (
                  <div className="text-sm text-red-600 py-6">Failed to load request.</div>
                ) : (
                  <div className="flex flex-col h-[72vh]">
                    <div className="flex items-start justify-between p-6 pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                          {getCategoryIcon(selected.category)}
                          {selected.category}
                        </div>
                        <h3 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{selected.subject || "Staff request"}</h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground/80">{(selected.staff_name || "Staff")}</span>
                          <span>•</span>
                          <span>{selected.staff_phone || "No phone"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={cn("text-xs font-bold px-3 py-1 uppercase rounded-full", statusBadge(selected.status))}>
                          {selected.status}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", priorityBadge(selected.priority))}>
                          {String(selected.priority || "MEDIUM").toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="px-6 py-4">
                      <div className="bg-muted/30 rounded-2xl p-4 border border-border/40">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <MessageCircle className="w-3 h-3" />
                          Message from Staff
                        </div>
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap italic">
                          "{selected.description || "No description provided."}"
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 px-6">
                      <div className="space-y-6 pb-6 mt-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</div>
                            <div className="text-xs font-semibold flex items-center gap-1.5 capitalize">
                              {getSourceIcon(selected.source)}
                              {selected.source || "web"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Received</div>
                            <div className="text-xs font-semibold flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {new Date(selected.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference ID</div>
                            <div className="text-xs font-mono text-muted-foreground/80">{selected.id.substring(0, 8)}</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              Activity log
                            </div>
                            <Separator className="flex-1 ml-4 h-[1px] bg-border/40" />
                          </div>

                          <div className="space-y-4">
                            {(selected.comments || []).length === 0 ? (
                              <div className="text-sm text-muted-foreground italic pl-4 border-l-2 border-border/30 py-1">No activity logged yet.</div>
                            ) : (
                              (selected.comments || []).map((c) => (
                                <div key={c.id} className="relative pl-6 pb-2">
                                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-border ring-4 ring-background" />
                                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                                    <span className="font-bold text-foreground/70">
                                      {(c.author_details?.first_name || c.author_details?.last_name)
                                        ? `${c.author_details?.first_name || ""} ${c.author_details?.last_name || ""}`.trim()
                                        : (c.kind === "system" ? "Miya AI" : "Manager")}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(c.created_at).toLocaleString()}</span>
                                    <Badge variant="secondary" className="text-[9px] px-1 h-3.5 uppercase font-bold tracking-tighter">
                                      {c.kind}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-foreground/80 bg-muted/20 rounded-xl p-3 border border-border/30">
                                    {c.body}
                                  </div>
                                </div>
                              )).reverse()
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    <div className="p-6 bg-muted/40 border-t border-border/40 backdrop-blur-sm rounded-b-xl">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                          className="px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95"
                          onClick={() => mutateAction.mutate({ action: "approve" })}
                          disabled={mutateAction.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="px-6 rounded-full shadow-sm transition-all active:scale-95"
                          onClick={() => mutateAction.mutate({ action: "reject", payload: { reason: "Rejected" } })}
                          disabled={mutateAction.isPending}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="outline"
                          className="px-6 rounded-full border-2 transition-all active:scale-95"
                          onClick={() => mutateAction.mutate({ action: "escalate", payload: { note: "Escalated" } })}
                          disabled={mutateAction.isPending}
                        >
                          Escalate
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-6 rounded-full transition-all"
                          onClick={() => mutateAction.mutate({ action: "close" })}
                          disabled={mutateAction.isPending}
                        >
                          Close
                        </Button>
                      </div>

                      <div className="relative group">
                        <Textarea
                          placeholder="Type your response or internal note here..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="min-h-[80px] rounded-2xl transition-all border-2 focus:ring-primary/20 bg-background pr-24"
                        />
                        <Button
                          className="absolute bottom-2.5 right-2.5 rounded-xl shadow-md transition-all active:scale-95"
                          size="sm"
                          onClick={() => {
                            const body = comment.trim();
                            if (!body) return;
                            mutateAction.mutate({ action: "comment", payload: { body } });
                            setComment("");
                          }}
                          disabled={mutateAction.isPending}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffRequestsPage;


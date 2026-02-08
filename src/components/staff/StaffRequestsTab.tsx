/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

const STATUSES: { key: StaffRequestStatus; labelKey: string }[] = [
  { key: "PENDING", labelKey: "staff.requests.pending" },
  { key: "APPROVED", labelKey: "staff.requests.approved" },
  { key: "REJECTED", labelKey: "staff.requests.rejected" },
  { key: "ESCALATED", labelKey: "staff.requests.escalated" },
  { key: "CLOSED", labelKey: "staff.requests.closed" },
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
  if (s === "PENDING") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (s === "APPROVED") return "bg-green-100 text-green-900 border-green-200";
  if (s === "REJECTED") return "bg-red-100 text-red-900 border-red-200";
  if (s === "ESCALATED") return "bg-purple-100 text-purple-900 border-purple-200";
  return "bg-slate-100 text-slate-900 border-slate-200";
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

const StaffRequestsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [activeStatus, setActiveStatus] = useState<StaffRequestStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const listQuery = useQuery({
    queryKey: ["staff-requests-tab", activeStatus, search],
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

  const selectedQuery = useQuery({
    queryKey: ["staff-request-tab", selectedId],
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
      await queryClient.invalidateQueries({ queryKey: ["staff-requests-tab"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-request-tab"] });
      // Also refresh the dashboard page version if it's open somewhere else
      await queryClient.invalidateQueries({ queryKey: ["staff-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-request"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("staff.requests.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("staff.requests.subtitle")}
        </p>
      </div>

      <Tabs value={activeStatus} onValueChange={(v) => { setActiveStatus(v as StaffRequestStatus); setSelectedId(null); }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="w-full md:w-auto">
            {STATUSES.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {t(s.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2 w-full md:w-[360px]">
            <Input
              placeholder={t("staff.requests.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setSearch("")}>
              {t("staff.requests.clear")}
            </Button>
          </div>
        </div>

        <TabsContent value={activeStatus} className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
            <Card className="h-[68vh]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("staff.requests.inbox")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[58vh] pr-3">
                  {listQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground py-6">Loading…</div>
                  ) : listQuery.isError ? (
                    <div className="text-sm text-red-600 py-6">Failed to load requests.</div>
                  ) : requests.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-10 text-center">{t("staff.requests.no_requests")}</div>
                  ) : (
                    <div className="space-y-2">
                      {requests.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors",
                            selectedId === r.id ? "border-primary bg-muted" : "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{r.subject || t("staff.request_fallback")}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {(r.staff_name || t("staff.page.title"))}{r.staff_phone ? ` • ${r.staff_phone}` : ""} • {r.category}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className={cn("text-[10px]", statusBadge(r.status))}>
                                {r.status}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px]", priorityBadge(r.priority))}>
                                {String(r.priority || "MEDIUM").toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {r.description || ""}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-2">
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="h-[68vh]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("staff.requests.details")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!selectedId ? (
                  <div className="text-sm text-muted-foreground py-10 text-center">
                    {t("staff.requests.select_request")}
                  </div>
                ) : selectedQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-6">Loading…</div>
                ) : selectedQuery.isError || !selected ? (
                  <div className="text-sm text-red-600 py-6">Failed to load request.</div>
                ) : (
                  <div className="flex flex-col h-[58vh]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold">{selected.subject || t("staff.request_fallback")}</div>
                        <div className="text-sm text-muted-foreground">
                          {(selected.staff_name || t("staff.page.title"))}{selected.staff_phone ? ` • ${selected.staff_phone}` : ""} • {selected.category}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={cn(statusBadge(selected.status))}>
                          {selected.status}
                        </Badge>
                        <Badge variant="outline" className={cn(priorityBadge(selected.priority))}>
                          {String(selected.priority || "MEDIUM").toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <ScrollArea className="flex-1 pr-3">
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                          <div className="text-sm whitespace-pre-wrap">{selected.description || "—"}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="font-medium text-muted-foreground">Source</div>
                            <div>{selected.source || "—"}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">External ID</div>
                            <div>{selected.external_id || "—"}</div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Request history</div>
                          <div className="space-y-2">
                            {(selected.comments || []).length === 0 ? (
                              <div className="text-sm text-muted-foreground">No updates yet.</div>
                            ) : (
                              (selected.comments || []).map((c) => (
                                <div key={c.id} className="rounded-md border p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs text-muted-foreground">
                                      {(c.author_details?.first_name || c.author_details?.last_name)
                                        ? `${c.author_details?.first_name || ""} ${c.author_details?.last_name || ""}`.trim()
                                        : (c.kind === "system" ? t("staff.system") : t("staff.manager"))}
                                      {" • "}
                                      {new Date(c.created_at).toLocaleString()}
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">
                                      {c.kind}
                                    </Badge>
                                  </div>
                                  <div className="text-sm mt-2 whitespace-pre-wrap">{c.body}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    <Separator className="my-3" />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => mutateAction.mutate({ action: "approve" })}
                        disabled={mutateAction.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => mutateAction.mutate({ action: "reject", payload: { reason: "Rejected" } })}
                        disabled={mutateAction.isPending}
                      >
                        Decline
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => mutateAction.mutate({ action: "escalate", payload: { note: "Escalated" } })}
                        disabled={mutateAction.isPending}
                      >
                        Escalate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => mutateAction.mutate({ action: "close" })}
                        disabled={mutateAction.isPending}
                      >
                        Close
                      </Button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Textarea
                        placeholder={t("staff.add_comment")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[44px]"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const body = comment.trim();
                          if (!body) return;
                          mutateAction.mutate({ action: "comment", payload: { body } });
                          setComment("");
                        }}
                        disabled={mutateAction.isPending}
                      >
                        Comment
                      </Button>
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

export default StaffRequestsTab;


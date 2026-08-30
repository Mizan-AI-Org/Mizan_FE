/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wrench,
  RefreshCw,
  ConciergeBell,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";

// ── Types ───────────────────────────────────────────────────────────
type GuestRequestStatus = "open" | "in_progress" | "resolved";
type GuestRequestPriority = "low" | "normal" | "high" | "urgent";
type GuestRequestType =
  | "towel"
  | "room_service"
  | "housekeeping"
  | "maintenance"
  | "complaint"
  | "amenity"
  | "check_in"
  | "check_out"
  | "other";

interface GuestRequest {
  id: string;
  guest_name: string;
  request_type: GuestRequestType;
  status: GuestRequestStatus;
  priority: GuestRequestPriority;
  room_number: string;
  notes: string;
  resolution_notes: string;
  assigned_to_name: string;
  sla_minutes: number;
  sla_breached: boolean;
  time_to_resolve_minutes: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

// ── Constants ───────────────────────────────────────────────────────
const REQUEST_TYPE_CONFIG: Record<
  GuestRequestType,
  { label: string; icon: any; color: string }
> = {
  towel: { label: "Towel", icon: Sparkles, color: "text-blue-500" },
  room_service: { label: "Room Service", icon: ConciergeBell, color: "text-amber-500" },
  housekeeping: { label: "Housekeeping", icon: Sparkles, color: "text-green-500" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "text-orange-500" },
  complaint: { label: "Complaint", icon: AlertTriangle, color: "text-red-500" },
  amenity: { label: "Amenity", icon: Plus, color: "text-purple-500" },
  check_in: { label: "Check-in", icon: Bell, color: "text-teal-500" },
  check_out: { label: "Check-out", icon: CheckCircle2, color: "text-gray-500" },
  other: { label: "Other", icon: Clock, color: "text-gray-400" },
};

const PRIORITY_COLORS: Record<GuestRequestPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<GuestRequestStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

// ── Component ───────────────────────────────────────────────────────
export default function GuestRequestsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<GuestRequestStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery<GuestRequest[]>({
    queryKey: ["guest-requests", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${API_BASE}/staff/guest-requests/${params}`);
      if (!res.ok) throw new Error("Failed to fetch guest requests");
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: {
      guest_name: string;
      request_type: GuestRequestType;
      priority: GuestRequestPriority;
      room_number: string;
      notes: string;
      sla_minutes: number;
    }) => {
      const res = await fetch(`${API_BASE}/staff/guest-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create guest request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-requests"] });
      setCreateOpen(false);
      toast.success("Guest request created");
    },
    onError: () => toast.error("Failed to create guest request"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: GuestRequestStatus;
      resolution_notes?: string;
    }) => {
      const res = await fetch(`${API_BASE}/staff/guest-requests/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-requests"] });
      toast.success("Request updated");
    },
    onError: () => toast.error("Failed to update request"),
  });

  // ── Derived ────────────────────────────────────────────────────────
  const openCount = requests.filter((r) => r.status === "open").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const resolvedCount = requests.filter((r) => r.status === "resolved").length;
  const slaBreachedCount = requests.filter((r) => r.sla_breached && r.status !== "resolved").length;
  const detailRequest = requests.find((r) => r.id === detailId);

  return (
    <div className={PAGE_SHELL_PADDED}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("Guest Requests")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Track and manage hospitality guest service requests")}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("New Request")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("New Guest Request")}</DialogTitle>
            </DialogHeader>
            <GuestRequestForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setCreateOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Bell}
          label={t("Open")}
          value={openCount}
          color="text-yellow-600"
        />
        <StatCard
          icon={Clock}
          label={t("In Progress")}
          value={inProgressCount}
          color="text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("Resolved")}
          value={resolvedCount}
          color="text-green-600"
        />
        {slaBreachedCount > 0 && (
          <StatCard
            icon={AlertTriangle}
            label={t("SLA Breached")}
            value={slaBreachedCount}
            color="text-red-600"
          />
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{t("All")}</TabsTrigger>
          <TabsTrigger value="open">{t("Open")}</TabsTrigger>
          <TabsTrigger value="in_progress">{t("In Progress")}</TabsTrigger>
          <TabsTrigger value="resolved">{t("Resolved")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Request List */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            {t("Loading guest requests...")}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{t("No guest requests found")}</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => {
            const typeConfig = REQUEST_TYPE_CONFIG[req.request_type] || REQUEST_TYPE_CONFIG.other;
            const Icon = typeConfig.icon;
            return (
              <Card
                key={req.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailId(req.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-lg bg-muted ${typeConfig.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{req.guest_name}</span>
                      {req.room_number && (
                        <Badge variant="outline" className="text-xs">
                          Room {req.room_number}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{req.notes}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                    <Badge className={PRIORITY_COLORS[req.priority]} variant="secondary">
                      {req.priority}
                    </Badge>
                    {req.sla_breached && req.status !== "resolved" && (
                      <Badge className="bg-red-100 text-red-700" variant="secondary">
                        SLA ⚠️
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          {detailRequest && (
            <>
              <DialogHeader>
                <DialogTitle>{detailRequest.guest_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("Type")}:</span>{" "}
                    {REQUEST_TYPE_CONFIG[detailRequest.request_type]?.label}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Room")}:</span>{" "}
                    {detailRequest.room_number || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Priority")}:</span>{" "}
                    <Badge className={PRIORITY_COLORS[detailRequest.priority]} variant="secondary">
                      {detailRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Status")}:</span>{" "}
                    <Badge className={STATUS_COLORS[detailRequest.status]}>
                      {detailRequest.status}
                    </Badge>
                  </div>
                  {detailRequest.assigned_to_name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{t("Assigned to")}:</span>{" "}
                      {detailRequest.assigned_to_name}
                    </div>
                  )}
                </div>
                {detailRequest.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("Notes")}</p>
                    <p className="text-sm text-muted-foreground">{detailRequest.notes}</p>
                  </div>
                )}
                {detailRequest.resolution_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("Resolution")}</p>
                    <p className="text-sm text-muted-foreground">
                      {detailRequest.resolution_notes}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  {detailRequest.status === "open" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: detailRequest.id,
                          status: "in_progress",
                        })
                      }
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      {t("Start Working")}
                    </Button>
                  )}
                  {(detailRequest.status === "open" ||
                    detailRequest.status === "in_progress") && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        updateMutation.mutate({
                          id: detailRequest.id,
                          status: "resolved",
                          resolution_notes: "Resolved by staff",
                        })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {t("Mark Resolved")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GuestRequestForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const [guestName, setGuestName] = useState("");
  const [requestType, setRequestType] = useState<GuestRequestType>("towel");
  const [priority, setPriority] = useState<GuestRequestPriority>("normal");
  const [roomNumber, setRoomNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [slaMinutes, setSlaMinutes] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    onSubmit({
      guest_name: guestName.trim(),
      request_type: requestType,
      priority,
      room_number: roomNumber.trim(),
      notes: notes.trim(),
      sla_minutes: slaMinutes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("Guest Name")} *</label>
        <Input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={t("e.g. Mr. Smith")}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{t("Request Type")}</label>
          <Select value={requestType} onValueChange={(v) => setRequestType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REQUEST_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("Priority")}</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{t("Room Number")}</label>
          <Input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder={t("e.g. 201")}
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("SLA (minutes)")}</label>
          <Input
            type="number"
            value={slaMinutes}
            onChange={(e) => setSlaMinutes(Number(e.target.value))}
            min={5}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("Notes")}</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("Additional details...")}
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={isLoading || !guestName.trim()}>
          {isLoading ? t("Creating...") : t("Create Request")}
        </Button>
      </div>
    </form>
  );
}

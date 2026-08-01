import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NOTIFICATION_PREVIEW_LIMIT = 4;

/** Types that collapse into one row when several arrive together. */
const GROUPABLE_TYPES = new Set(["TASK_ASSIGNED"]);

export interface LayoutNotification {
  id: string;
  read: boolean;
  verb: string;
  description?: string;
  timestamp: string;
  notification_type?: string;
  title?: string;
}

type NotificationGroup =
  | { kind: "single"; item: LayoutNotification }
  | { kind: "batch"; type: string; label: string; items: LayoutNotification[] };

function notificationTypeKey(n: LayoutNotification): string {
  return String(n.notification_type || n.verb || "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function groupNotifications(items: LayoutNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  let i = 0;

  while (i < items.length) {
    const current = items[i];
    const typeKey = notificationTypeKey(current);

    if (GROUPABLE_TYPES.has(typeKey)) {
      const batch: LayoutNotification[] = [current];
      let j = i + 1;
      while (j < items.length) {
        const next = items[j];
        if (notificationTypeKey(next) !== typeKey || next.read !== current.read) break;
        batch.push(next);
        j += 1;
      }
      if (batch.length >= 2) {
        groups.push({
          kind: "batch",
          type: typeKey,
          label: current.verb.replace(/_/g, " "),
          items: batch,
        });
        i = j;
        continue;
      }
    }

    groups.push({ kind: "single", item: current });
    i += 1;
  }

  return groups;
}

function taskTitleFromMessage(message?: string): string {
  if (!message) return "";
  const match = message.match(/^New task:\s*(.+?)(?:\s*\(|$)/i);
  if (match?.[1]) return match[1].trim();
  return message.length > 48 ? `${message.slice(0, 45)}…` : message;
}

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MarkReadButton({
  onClick,
  label,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100",
        className,
      )}
      aria-label={label}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}

function NotificationRow({
  notification,
  onNavigate,
  onMarkRead,
  markReadLabel,
  compact = false,
}: {
  notification: LayoutNotification;
  onNavigate: (n: LayoutNotification) => void;
  onMarkRead: (id: string) => void;
  markReadLabel: string;
  compact?: boolean;
}) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 hover:bg-accent focus:bg-accent focus:outline-none",
        !notification.read && "bg-primary/5",
        compact && "py-1",
      )}
      onClick={() => onNavigate(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(notification);
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-xs font-medium capitalize">{notification.verb.replace(/_/g, " ")}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </div>
        {notification.description && (
          <p className="truncate text-[11px] text-muted-foreground">{notification.description}</p>
        )}
      </div>
      {!notification.read && (
        <MarkReadButton
          label={markReadLabel}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
        />
      )}
    </div>
  );
}

function BatchNotificationRow({
  group,
  expanded,
  onToggle,
  onNavigate,
  onMarkRead,
  t,
}: {
  group: Extract<NotificationGroup, { kind: "batch" }>;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (n: LayoutNotification) => void;
  onMarkRead: (ids: string[]) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const unreadIds = group.items.filter((n) => !n.read).map((n) => n.id);
  const titles = group.items.map((n) => taskTitleFromMessage(n.description)).filter(Boolean);
  const preview = titles.slice(0, 2).join(", ");
  const remaining = titles.length - 2;
  const subtitle =
    remaining > 0
      ? t("common.notifications.and_others", { preview, count: remaining })
      : preview || group.items[0]?.description;

  return (
    <div className={cn("rounded-sm", unreadIds.length > 0 && "bg-primary/5")}>
      <div
        role="menuitem"
        tabIndex={0}
        className="group flex cursor-pointer items-start gap-2 px-2 py-1.5 hover:bg-accent"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-xs font-medium capitalize">
              {group.type === "TASK_ASSIGNED"
                ? t("common.notifications.tasks_assigned_group", { count: group.items.length })
                : t("common.notifications.group_count", {
                    count: group.items.length,
                    label: group.label,
                  })}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatRelativeTime(group.items[0]?.timestamp || "")}
            </span>
          </div>
          {subtitle && (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {unreadIds.length > 0 && (
            <MarkReadButton
              label={t("common.notifications.mark_as_read")}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkRead(unreadIds);
              }}
            />
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border/60 pb-1 pl-2">
          {group.items.map((item) => (
            <NotificationRow
              key={item.id}
              notification={item}
              compact
              onNavigate={onNavigate}
              onMarkRead={(id) => onMarkRead([id])}
              markReadLabel={t("common.notifications.mark_as_read")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationDropdownContent({
  notifications,
  markAsRead,
  markAllAsRead,
  t,
  staffRequestsLabel,
  showStaffRequestsLink = true,
}: {
  notifications: LayoutNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  staffRequestsLabel?: string;
  showStaffRequestsLink?: boolean;
}) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(() => new Set());

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);
  const hiddenCount = Math.max(0, groups.length - NOTIFICATION_PREVIEW_LIMIT);
  const visibleGroups = showAll ? groups : groups.slice(0, NOTIFICATION_PREVIEW_LIMIT);

  const handleNavigate = (notification: LayoutNotification) => {
    const data = (notification as LayoutNotification & { data?: Record<string, unknown> }).data || {};
    const route = data?.route as string | undefined;
    const staffRequestId = data?.staff_request_id as string | undefined;
    if (route) {
      markAsRead(notification.id);
      navigate(route);
      return;
    }
    if (staffRequestId) {
      markAsRead(notification.id);
      navigate(`/dashboard/staff-requests/${staffRequestId}`);
    }
  };

  const markManyRead = (ids: string[]) => {
    ids.forEach((id) => markAsRead(id));
  };

  const toggleBatch = (key: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <DropdownMenuContent align="end" className="w-80 p-0">
      <div className="px-3 py-2 font-medium text-sm">{t("common.notifications.title")}</div>
      <DropdownMenuSeparator className="m-0" />
      {notifications.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {t("common.notifications.empty")}
        </p>
      ) : (
        <div className="max-h-[min(20rem,70vh)] overflow-y-auto overscroll-contain px-1 py-1">
          {visibleGroups.map((group) => {
            if (group.kind === "single") {
              return (
                <NotificationRow
                  key={group.item.id}
                  notification={group.item}
                  onNavigate={handleNavigate}
                  onMarkRead={markAsRead}
                  markReadLabel={t("common.notifications.mark_as_read")}
                />
              );
            }
            const batchKey = `${group.type}:${group.items.map((n) => n.id).join(",")}`;
            return (
              <BatchNotificationRow
                key={batchKey}
                group={group}
                expanded={expandedBatches.has(batchKey)}
                onToggle={() => toggleBatch(batchKey)}
                onNavigate={handleNavigate}
                onMarkRead={markManyRead}
                t={t}
              />
            );
          })}
          {hiddenCount > 0 && !showAll && (
            <button
              type="button"
              className="mt-0.5 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setShowAll(true)}
            >
              {t("common.notifications.show_more", { count: hiddenCount })}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
      <DropdownMenuSeparator className="m-0" />
      {showStaffRequestsLink && staffRequestsLabel && (
        <DropdownMenuItem
          onClick={() => navigate("/dashboard/staff-requests")}
          className="text-sm cursor-pointer"
        >
          {staffRequestsLabel}
        </DropdownMenuItem>
      )}
      {notifications.length > 0 && (
        <DropdownMenuItem onClick={markAllAsRead} className="text-sm cursor-pointer">
          {t("common.notifications.mark_all_read")}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}


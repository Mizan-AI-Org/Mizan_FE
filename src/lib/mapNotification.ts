export interface ApiNotification {
  id: string;
  message?: string;
  created_at?: string;
  is_read?: boolean;
  notification_type?: string;
  title?: string;
  link?: string;
  data?: { route?: string };
}

export interface MappedNotification {
  id: string;
  read: boolean;
  timestamp: string;
  verb: string;
  description: string;
  title?: string;
  notification_type?: string;
  data?: { route?: string };
}

/** Map a `/notifications/` row onto the bell dropdown shape. */
export function mapNotification(
  row: ApiNotification,
  formatMessage: (message: string) => string = (message) => message,
): MappedNotification {
  const route = (row.link || row.data?.route || "").trim();
  return {
    id: row.id,
    read: Boolean(row.is_read),
    timestamp: row.created_at || "",
    verb: (row.notification_type || "").replace(/_/g, " ").toLowerCase(),
    description: formatMessage(row.message || ""),
    title: row.title,
    notification_type: row.notification_type,
    data: route ? { route } : undefined,
  };
}

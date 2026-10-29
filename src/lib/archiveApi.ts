import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

/** Archive instead of delete (Django apps/core/archive.py): archived rows leave every list and can be restored
 * for 30 days from Operations > Archived, or with the Undo on the toast. */
export type ArchiveKind =
  | "task"
  | "incident"
  | "reminder"
  | "announcement"
  | "sop"
  | "process_template"
  | "checklist_template"
  | "menu_item"
  | "menu_category"
  | "shift_template"
  | "control_point";

export type ArchivedRow = { kind: ArchiveKind; id: string; title: string; archivedAt: string; restorable: boolean };

function token() {
  return localStorage.getItem("access_token") || "";
}

async function call(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "Request failed");
  return data.data ?? data;
}

const post = (path: string, body: Record<string, unknown>) => call(path, "POST", body);

export const listArchived = (kind?: ArchiveKind): Promise<ArchivedRow[]> =>
  call(`/archive/${kind ? `?kind=${kind}` : ""}`, "GET");

export const archiveItem = (kind: ArchiveKind, id: string) => post("/archive/", { kind, id });

export const restoreItem = (kind: ArchiveKind, id: string) => post("/archive/restore/", { kind, id });

/** Archive, then a toast with Undo. `onChange` runs after the archive and after an undo (refresh lists). */
export async function archiveWithUndo(
  kind: ArchiveKind,
  id: string,
  labels: { archived: string; undo: string; restored: string },
  onChange?: () => void,
) {
  try {
    await archiveItem(kind, id);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
    return;
  }
  onChange?.();
  toast.success(labels.archived, {
    duration: 10_000, // long enough to read the message and reach Undo
    action: {
      label: labels.undo,
      onClick: async () => {
        try {
          await restoreItem(kind, id);
          toast.success(labels.restored);
          onChange?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      },
    },
  });
}

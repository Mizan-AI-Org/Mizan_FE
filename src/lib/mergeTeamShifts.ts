import type { Shift } from "@/types/schedule";

function slotKey(shift: Shift): string {
  const title = (shift.title || "").trim().toLowerCase();
  return `${shift.date}|${shift.start}|${shift.end}|${title}`;
}

/** One list/grid card per logical shift when create/update made multiple AssignedShift rows. */
export function mergeTeamShifts(rows: Shift[]): Shift[] {
  const byKey = new Map<string, Shift>();

  for (const shift of rows) {
    const key = slotKey(shift);
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, {
        ...shift,
        group_shift_ids: [shift.id],
      });
      continue;
    }

    const memberIds = [
      ...new Set(
        [
          ...(previous.staff_members ?? []),
          ...(shift.staff_members ?? []),
          previous.staffId,
          shift.staffId,
        ]
          .map(String)
          .filter(Boolean),
      ),
    ];

    const detailsMap = new Map<string, { id: string; first_name: string; last_name: string }>();
    for (const row of [...(previous.staff_members_details ?? []), ...(shift.staff_members_details ?? [])]) {
      if (row?.id) detailsMap.set(String(row.id), row);
    }

    const templateIds = [...new Set([...(previous.task_templates ?? []), ...(shift.task_templates ?? [])])];
    const detailsById = new Map<string, NonNullable<Shift["task_templates_details"]>[number]>();
    for (const row of [...(previous.task_templates_details ?? []), ...(shift.task_templates_details ?? [])]) {
      if (row?.id) detailsById.set(String(row.id), row);
    }

    byKey.set(key, {
      ...previous,
      staff_members: memberIds,
      staff_members_details: [...detailsMap.values()],
      staffId: memberIds[0] ?? previous.staffId,
      group_shift_ids: [...new Set([...(previous.group_shift_ids ?? [previous.id]), shift.id])],
      task_templates: templateIds,
      task_templates_details: [...detailsById.values()],
      tasks: (previous.tasks?.length ? previous.tasks : shift.tasks) ?? [],
    });
  }

  return [...byKey.values()];
}

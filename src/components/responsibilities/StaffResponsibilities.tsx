import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Reverse assignment: pick items for one staff member, Executor or Read-only. */
export function StaffResponsibilities({ staffId }: { staffId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-responsibilities", staffId],
    queryFn: () => api.getStaffResponsibilities(staffId),
    enabled: Boolean(staffId),
  });
  const save = useMutation({
    mutationFn: (assignments: { item_id: string; role: string | null }[]) =>
      api.saveStaffResponsibilities(staffId, assignments),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["staff-responsibilities", staffId] }),
  });

  if (!query.data) return null;
  return (
    <div className="space-y-2 border-t pt-4">
      <h4 className="text-sm font-semibold">Responsibilities</h4>
      {query.data.items.filter((item) => item.is_enabled).map((item) => (
        <label key={item.item_id} className="flex items-center justify-between gap-3 text-sm">
          <span>
            {item.area}: {item.label}
          </span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={item.role || "none"}
            onChange={(event) => {
              const role = event.target.value === "none" ? null : event.target.value;
              const assignments = query.data!.items.map((row) => ({
                item_id: row.item_id,
                role: row.item_id === item.item_id ? role : row.role,
              }));
              save.mutate(assignments);
            }}
          >
            <option value="none">Not assigned</option>
            <option value="EXECUTOR">Executor</option>
            <option value="READ_ONLY">Read-only</option>
          </select>
        </label>
      ))}
    </div>
  );
}

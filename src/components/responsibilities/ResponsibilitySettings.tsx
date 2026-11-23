import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryOwnerPicker } from "@/components/settings/CategoryOwnerPicker";
import { api } from "@/lib/api";
import { singleExecutor, type ResponsibilityArea, type ResponsibilityItem } from "@/components/responsibilities/types";

export function ResponsibilitySettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["responsibilities"], queryFn: () => api.getResponsibilities() });
  const saveArea = useMutation({
    mutationFn: (area: ResponsibilityArea) =>
      api.updateResponsibilityArea(area.id, {
        venue_description: area.venue_description,
        is_enabled: area.is_enabled,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["responsibilities"] }),
  });
  const saveItem = useMutation({
    mutationFn: (input: { item: ResponsibilityItem; executor: string | null; readOnly: string[]; isEnabled?: boolean }) => {
      const next = singleExecutor(input.executor, input.readOnly);
      return api.setResponsibilityAssignments(input.item.id, {
        executor: next.executor,
        read_only: next.read_only,
        is_enabled: input.isEnabled ?? input.item.is_enabled,
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["responsibilities"] }),
  });

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading responsibilities…</p>;
  if (query.isError) return <p className="text-sm text-destructive">Could not load responsibilities.</p>;

  return (
    <div className="space-y-4">
      {(query.data?.areas ?? []).map((area) => (
        <section key={area.id} className="rounded-xl border border-border/80 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{area.label}</h3>
              <p className="text-sm text-muted-foreground">{area.standard_description}</p>
            </div>
            <Switch
              checked={area.is_enabled}
              onCheckedChange={(checked) => saveArea.mutate({ ...area, is_enabled: checked })}
              aria-label={`${area.label} enabled`}
            />
          </div>
          <Textarea
            className="mt-3"
            placeholder="What this area includes for your venue"
            defaultValue={area.venue_description}
            onBlur={(event) => {
              if (event.target.value !== area.venue_description) {
                saveArea.mutate({ ...area, venue_description: event.target.value });
              }
            }}
          />
          <ul className="mt-3 space-y-3">
            {area.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-border/70 p-3">
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={item.is_enabled}
                    onCheckedChange={(checked) =>
                      saveItem.mutate({
                        item,
                        executor: item.executor?.id || null,
                        readOnly: item.read_only.map((person) => person.id),
                        isEnabled: checked === true,
                      })
                    }
                    aria-label={`${item.label} enabled`}
                  />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.standard_description}</span>
                  </span>
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="text-xs text-muted-foreground">
                    Executor
                    <CategoryOwnerPicker
                      selectedIds={item.executor ? [item.executor.id] : []}
                      onChange={(ids) =>
                        saveItem.mutate({
                          item,
                          executor: ids.at(-1) || null,
                          readOnly: item.read_only.map((person) => person.id),
                        })
                      }
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Read-only
                    <CategoryOwnerPicker
                      selectedIds={item.read_only.map((person) => person.id)}
                      onChange={(ids) =>
                        saveItem.mutate({
                          item,
                          executor: item.executor?.id || null,
                          readOnly: ids,
                        })
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

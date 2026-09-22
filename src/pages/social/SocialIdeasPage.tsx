import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialPageShell } from "@/pages/social/SocialPageShell";
import { SocialPostComposerDialog } from "@/components/social/social-post-composer-dialog";
import { socialApi } from "@/lib/social-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

const COLUMNS = [
  { id: "ideas", labelKey: "social.plan.ideas" },
  { id: "review", labelKey: "social.plan.review" },
  { id: "scheduled", labelKey: "social.plan.scheduled" },
  { id: "published", labelKey: "social.plan.published" },
] as const;

function columnForItem(status: string, approval: string): string {
  if (status === "published") return "published";
  if (status === "scheduled") return "scheduled";
  if (status === "pending_approval" || approval === "pending_approval") return "review";
  return "ideas";
}

function KanbanCard({ item }: { item: Record<string, unknown> }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(item.id),
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-60 ring-2 ring-primary",
      )}
    >
      <p className="text-sm font-medium">{String(item.internal_name)}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(item.caption || "")}</p>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card className={cn("flex flex-col bg-muted/20", isOver && "ring-2 ring-primary/40")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="min-h-[220px] flex-1 space-y-2">
        {items.map((item) => (
          <KanbanCard key={String(item.id)} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

type Props = { embedded?: boolean };

export default function SocialIdeasPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const [composerOpen, setComposerOpen] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["social-content", "kanban"],
    queryFn: () => socialApi.listContent(),
  });

  const move = useMutation({
    mutationFn: ({ id, column }: { id: string; column: string }) =>
      socialApi.updateContent(id, { pipeline_column: column }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-content"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map: Record<string, Array<Record<string, unknown>>> = {
      ideas: [],
      review: [],
      scheduled: [],
      published: [],
    };
    for (const row of data || []) {
      const col = columnForItem(String(row.status || "draft"), String(row.approval_status || "draft"));
      map[col].push(row);
    }
    return map;
  }, [data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const col = event.over?.id as string | undefined;
    const itemId = event.active.id as string;
    if (!col || !COLUMNS.some((c) => c.id === col)) return;
    move.mutate({ id: itemId, column: col });
  };

  const board = isLoading ? (
    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
  ) : (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} id={col.id} title={t(col.labelKey)} items={grouped[col.id] || []} />
        ))}
      </div>
    </DndContext>
  );

  if (embedded) return board;

  return (
    <SocialPageShell
      title={t("social.plan.title")}
      description={t("social.plan.desc")}
      actions={
        <Button className="gap-2" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> {t("social.plan.add_post")}
        </Button>
      }
    >
      {board}
      <SocialPostComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </SocialPageShell>
  );
}

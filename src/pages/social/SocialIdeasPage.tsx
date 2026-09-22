import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type ColumnId = (typeof COLUMNS)[number]["id"];
type ContentRow = Record<string, unknown>;

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) return hits;
  return closestCorners(args);
};

function columnForItem(status: string, approval: string): ColumnId {
  if (status === "published") return "published";
  if (status === "scheduled" || status === "queued" || status === "publishing") return "scheduled";
  if (status === "pending_approval" || approval === "pending_approval") return "review";
  return "ideas";
}

function statusPatch(column: ColumnId): Pick<ContentRow, "status" | "approval_status"> {
  if (column === "published") return { status: "published", approval_status: "approved" };
  if (column === "scheduled") return { status: "scheduled", approval_status: "draft" };
  if (column === "review") return { status: "pending_approval", approval_status: "pending_approval" };
  return { status: "draft", approval_status: "draft" };
}

function isColumnId(value: string): value is ColumnId {
  return COLUMNS.some((col) => col.id === value);
}

function CardFace({ item, className }: { item: ContentRow; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-background p-3 shadow-sm", className)}>
      <p className="text-sm font-medium">{String(item.internal_name || "")}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(item.caption || "")}</p>
    </div>
  );
}

function KanbanCard({ item, column }: { item: ContentRow; column: ColumnId }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: String(item.id),
    data: { column },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `card:${item.id}`,
    data: { column },
  });
  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <CardFace item={item} />
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  items,
  footer,
}: {
  id: ColumnId;
  title: string;
  items: ContentRow[];
  footer?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { column: id } });
  return (
    <Card className={cn("flex min-h-[280px] flex-col bg-muted/20", isOver && "ring-2 ring-primary/40")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="flex min-h-[180px] flex-1 flex-col gap-2">
        {items.map((item) => (
          <KanbanCard key={String(item.id)} item={item} column={id} />
        ))}
        {footer}
      </CardContent>
    </Card>
  );
}

type Props = { embedded?: boolean };

export default function SocialIdeasPage({ embedded }: Props = {}) {
  const { t } = useLanguage();
  const [composerOpen, setComposerOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["social-content", "kanban"],
    queryFn: () => socialApi.listContent(),
  });

  const move = useMutation({
    mutationFn: ({ id, column }: { id: string; column: ColumnId }) =>
      socialApi.updateContent(id, { pipeline_column: column }),
    onMutate: async ({ id, column }) => {
      await qc.cancelQueries({ queryKey: ["social-content", "kanban"] });
      const previous = qc.getQueryData<ContentRow[]>(["social-content", "kanban"]);
      qc.setQueryData<ContentRow[]>(["social-content", "kanban"], (current) =>
        (current || []).map((row) => (String(row.id) === id ? { ...row, ...statusPatch(column) } : row)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) qc.setQueryData(["social-content", "kanban"], context.previous);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["social-content"] });
      qc.invalidateQueries({ queryKey: ["social-calendar"] });
    },
  });

  const createIdea = useMutation({
    mutationFn: (title: string) =>
      socialApi.createContent({
        internal_name: title,
        caption: title,
        channels: [],
        status: "draft",
      }),
    onSuccess: () => {
      setIdeaTitle("");
      qc.invalidateQueries({ queryKey: ["social-content"] });
      qc.invalidateQueries({ queryKey: ["social-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map: Record<ColumnId, ContentRow[]> = {
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
  const activeItem = (data || []).find((row) => String(row.id) === activeId) || null;

  const columnFromDrop = (event: DragEndEvent): ColumnId | null => {
    const over = event.over;
    if (!over) return null;
    const fromData = over.data.current?.column;
    if (typeof fromData === "string" && isColumnId(fromData)) return fromData;
    const overId = String(over.id);
    if (isColumnId(overId)) return overId;
    const cardId = overId.startsWith("card:") ? overId.slice(5) : overId;
    for (const col of COLUMNS) {
      if (grouped[col.id].some((row) => String(row.id) === cardId)) return col.id;
    }
    return null;
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const column = columnFromDrop(event);
    const itemId = String(event.active.id);
    if (!column) return;
    const current = columnForItem(
      String((data || []).find((row) => String(row.id) === itemId)?.status || "draft"),
      String((data || []).find((row) => String(row.id) === itemId)?.approval_status || "draft"),
    );
    if (current === column) return;
    move.mutate({ id: itemId, column });
  };

  const submitIdea = () => {
    const title = ideaTitle.trim();
    if (!title || createIdea.isPending) return;
    createIdea.mutate(title);
  };

  const board = isLoading ? (
    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
  ) : (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("social.plan.drag_hint")}</p>
        <Button className="gap-2" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> {t("social.plan.add_post")}
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={t(col.labelKey)}
              items={grouped[col.id] || []}
              footer={
                col.id === "ideas" ? (
                  <form
                    className="mt-auto flex gap-2 pt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitIdea();
                    }}
                  >
                    <Input
                      value={ideaTitle}
                      onChange={(event) => setIdeaTitle(event.target.value)}
                      placeholder={t("social.plan.idea_placeholder")}
                      aria-label={t("social.plan.add_idea")}
                    />
                    <Button type="submit" size="icon" variant="outline" disabled={createIdea.isPending || !ideaTitle.trim()}>
                      {createIdea.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </form>
                ) : null
              }
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? <CardFace item={activeItem} className="w-64 shadow-lg ring-2 ring-primary" /> : null}
        </DragOverlay>
      </DndContext>
      <SocialPostComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );

  if (embedded) return board;

  return (
    <SocialPageShell title={t("social.plan.title")} description={t("social.plan.desc")}>
      {board}
    </SocialPageShell>
  );
}

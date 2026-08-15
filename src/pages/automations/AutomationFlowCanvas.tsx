import React, { useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { actionLabel, triggerLabel } from "./automations-i18n";
import { AutomationStepEditor } from "./AutomationStepEditor";
import type { AutomationStep, CatalogItem } from "./automation-types";

const TRIGGER_Y = 40;
const GAP_Y = 64;
const ADD_NODE_H = 44;
const TRIGGER_H = 210;

function estimateActionHeight(type: string): number {
  switch (type) {
    case "create_task":
    case "create_staff_request":
    case "condition":
      return 300;
    case "send_message":
    case "update_contact_field":
      return 240;
    default:
      return 200;
  }
}

type TriggerNodeData = {
  triggerType: string;
  keywords: string;
  triggerTag: string;
  triggers: CatalogItem[];
  onTriggerTypeChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onTriggerTagChange: (value: string) => void;
};

type ActionNodeData = {
  index: number;
  step: AutomationStep;
  label: string;
  stepCount: number;
  onChange: (config: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
};

type AddNodeData = {
  label: string;
  onAdd: () => void;
};

const NODE_CARD =
  "rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-card shadow-sm";

function TriggerFlowNode({ data }: NodeProps<Node<TriggerNodeData>>) {
  const { t } = useLanguage();
  return (
    <div className={cn("w-[440px] p-5 ring-1 ring-emerald-500/20", NODE_CARD)}>
      <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none" />
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {t("automations.builder.trigger_label")}
      </p>
      <div className="nodrag nopan nowheel mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <Zap className="h-5 w-5 text-emerald-600" />
        </div>
        <Select value={data.triggerType} onValueChange={data.onTriggerTypeChange}>
          <SelectTrigger className="h-11 flex-1">
            <SelectValue placeholder={t("automations.builder.choose_trigger")} />
          </SelectTrigger>
          <SelectContent>
            {data.triggers.map((tr) => (
              <SelectItem key={tr.id} value={tr.id}>
                {triggerLabel(t, tr.id, tr.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="nodrag nopan nowheel">
        {data.triggerType === "keyword_match" && (
          <>
            <Input
              placeholder={t("automations.builder.keywords_placeholder")}
              value={data.keywords}
              onChange={(e) => data.onKeywordsChange(e.target.value)}
              className="mb-2"
            />
            <p className="text-xs text-slate-500">{t("automations.builder.keywords_hint")}</p>
          </>
        )}
        {data.triggerType === "tag_added" && (
          <Input
            placeholder={t("automations.builder.tag_placeholder")}
            value={data.triggerTag}
            onChange={(e) => data.onTriggerTagChange(e.target.value)}
          />
        )}
        {data.triggerType === "time_based" && (
          <p className="text-xs text-slate-500">{t("automations.builder.time_based_hint")}</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-emerald-400"
      />
    </div>
  );
}

function ActionFlowNode({ data }: NodeProps<Node<ActionNodeData>>) {
  const { t } = useLanguage();
  return (
    <div className={cn("group relative w-[440px] p-5", NODE_CARD)}>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-slate-200 dark:!bg-slate-600"
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {data.index + 1}. {data.label}
        </span>
        <div className="nodrag nopan flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={data.index === 0}
            onClick={() => data.onMove(-1)}
            aria-label={t("automations.builder.move_up")}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={data.index === data.stepCount - 1}
            onClick={() => data.onMove(1)}
            aria-label={t("automations.builder.move_down")}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-500"
            onClick={data.onRemove}
          >
            {t("automations.builder.remove")}
          </Button>
        </div>
      </div>
      <div className="nodrag nopan nowheel">
        <AutomationStepEditor step={data.step} onChange={data.onChange} />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-slate-200 dark:!bg-slate-600"
      />
    </div>
  );
}

function AddActionFlowNode({ data }: NodeProps<Node<AddNodeData>>) {
  return (
    <div className="flex w-[440px] justify-center">
      <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none" />
      <Button
        type="button"
        variant="outline"
        size="default"
        className="nodrag nopan gap-2 rounded-full px-5 shadow-sm"
        onClick={data.onAdd}
      >
        <Plus className="h-4 w-4" />
        {data.label}
      </Button>
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !pointer-events-none" />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerFlowNode,
  action: ActionFlowNode,
  addAction: AddActionFlowNode,
};

export type AutomationFlowCanvasProps = {
  triggerType: string;
  keywords: string;
  triggerTag: string;
  triggers: CatalogItem[];
  steps: AutomationStep[];
  actionLabels: Record<string, string | undefined>;
  onTriggerTypeChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onTriggerTagChange: (value: string) => void;
  onUpdateStep: (index: number, config: Record<string, unknown>) => void;
  onRemoveStep: (index: number) => void;
  onMoveStep: (index: number, dir: -1 | 1) => void;
  onOpenLibrary: () => void;
};

function FitViewOnChange({ depsKey }: { depsKey: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 200, maxZoom: 1 });
    });
    return () => cancelAnimationFrame(id);
  }, [depsKey, fitView]);
  return null;
}

function AutomationFlowInner(props: AutomationFlowCanvasProps) {
  const { t } = useLanguage();
  const {
    triggerType,
    keywords,
    triggerTag,
    triggers,
    steps,
    actionLabels,
    onTriggerTypeChange,
    onKeywordsChange,
    onTriggerTagChange,
    onUpdateStep,
    onRemoveStep,
    onMoveStep,
    onOpenLibrary,
  } = props;

  const { nodes, edges } = useMemo(() => {
    const nextNodes: Node[] = [];
    const nextEdges: Edge[] = [];
    let y = TRIGGER_Y;
    const x = 0;

    nextNodes.push({
      id: "trigger",
      type: "trigger",
      position: { x, y },
      data: {
        triggerType,
        keywords,
        triggerTag,
        triggers,
        onTriggerTypeChange,
        onKeywordsChange,
        onTriggerTagChange,
      } satisfies TriggerNodeData,
      draggable: false,
      selectable: false,
    });

    y += TRIGGER_H + GAP_Y;

    const midAddId = "add-mid";
    nextNodes.push({
      id: midAddId,
      type: "addAction",
      position: { x, y },
      data: {
        label: t("automations.builder.add_from_library"),
        onAdd: onOpenLibrary,
      } satisfies AddNodeData,
      draggable: false,
      selectable: false,
    });
    nextEdges.push({
      id: "e-trigger-add",
      source: "trigger",
      target: midAddId,
      type: "smoothstep",
      animated: false,
      style: { stroke: "rgb(148 163 184)", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgb(148 163 184)", width: 16, height: 16 },
    });

    y += ADD_NODE_H + GAP_Y;
    let prevId = midAddId;

    steps.forEach((step, index) => {
      const id = `action-${index}`;
      nextNodes.push({
        id,
        type: "action",
        position: { x, y },
        data: {
          index,
          step,
          label: actionLabel(t, step.type, actionLabels[step.type]),
          stepCount: steps.length,
          onChange: (config) => onUpdateStep(index, config),
          onRemove: () => onRemoveStep(index),
          onMove: (dir) => onMoveStep(index, dir),
        } satisfies ActionNodeData,
        draggable: false,
        selectable: true,
      });
      nextEdges.push({
        id: `e-${prevId}-${id}`,
        source: prevId,
        target: id,
        type: "smoothstep",
        style: { stroke: "rgb(148 163 184)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgb(148 163 184)", width: 16, height: 16 },
      });
      prevId = id;
      y += estimateActionHeight(step.type) + GAP_Y;
    });

    if (steps.length > 0) {
      const endAddId = "add-end";
      nextNodes.push({
        id: endAddId,
        type: "addAction",
        position: { x, y },
        data: {
          label: t("automations.builder.add_action_placeholder"),
          onAdd: onOpenLibrary,
        } satisfies AddNodeData,
        draggable: false,
        selectable: false,
      });
      nextEdges.push({
        id: `e-${prevId}-${endAddId}`,
        source: prevId,
        target: endAddId,
        type: "smoothstep",
        style: { stroke: "rgb(148 163 184)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgb(148 163 184)", width: 16, height: 16 },
      });
    }

    return { nodes: nextNodes, edges: nextEdges };
  }, [
    triggerType,
    keywords,
    triggerTag,
    triggers,
    steps,
    actionLabels,
    onTriggerTypeChange,
    onKeywordsChange,
    onTriggerTagChange,
    onUpdateStep,
    onRemoveStep,
    onMoveStep,
    onOpenLibrary,
    t,
  ]);

  const depsKey = `${triggerType}:${steps.length}:${steps.map((s) => s.type).join(",")}`;

  const onInit = useCallback(() => {
    /* fit handled by FitViewOnChange */
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
      minZoom={0.35}
      maxZoom={1.4}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      zoomOnScroll
      preventScrolling
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "smoothstep" }}
      className="bg-transparent"
      style={{ width: "100%", height: "100%" }}
    >
      <FitViewOnChange depsKey={depsKey} />
      <Background
        id="automation-dots"
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.2}
        color="rgb(148 163 184 / 0.35)"
        className="dark:[&>*]:!stroke-slate-600"
      />
      <Controls
        showInteractive={false}
        className="!overflow-hidden !rounded-lg !border !border-slate-200 !bg-card !shadow-sm dark:!border-slate-700"
      />
      <MiniMap
        pannable
        zoomable
        className="!overflow-hidden !rounded-lg !border !border-slate-200 !bg-card/90 dark:!border-slate-700"
        maskColor="rgb(15 23 42 / 0.45)"
        nodeColor={(n) => (n.type === "trigger" ? "#10b981" : n.type === "addAction" ? "#94a3b8" : "#64748b")}
      />
    </ReactFlow>
  );
}

export function AutomationFlowCanvas(props: AutomationFlowCanvasProps) {
  return (
    <div className="h-full w-full [&_.react-flow__node]:!cursor-default">
      <ReactFlowProvider>
        <AutomationFlowInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

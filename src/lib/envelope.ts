export function unwrapEnvelope<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    const envelope = payload as { success?: boolean; data?: T; error?: string };
    if (envelope.success === false) {
      throw new Error(envelope.error || "Request failed");
    }
    if (envelope.data !== undefined && envelope.data !== null) {
      return envelope.data as T;
    }
  }
  return payload as T;
}

export function unwrapUser(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const body = payload as Record<string, unknown>;
  const nested = (body.user || body.data) as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object" && (nested.email || nested.id)) {
    return nested;
  }
  return body;
}

export function mapInventoryItem(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    sku: String(row.sku || ""),
    unit: String(row.unit || "unit"),
    current_stock: Number(row.quantity ?? row.current_stock ?? 0),
    min_stock_level: Number(row.reorderPoint ?? row.reorder_point ?? row.min_stock_level ?? 0),
    category: String(row.category || ""),
    description: "",
    cost_per_unit: 0,
    restaurant: "",
    created_at: "",
    updated_at: "",
    isLow: Boolean(row.isLow),
  };
}

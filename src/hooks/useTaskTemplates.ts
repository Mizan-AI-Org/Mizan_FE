import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

export interface TemplateTaskMeta {
  title?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimated_duration?: number;
}

export interface TaskTemplateItem {
  id: string;
  name: string;
  description?: string | null;
  template_type?: string | null;
  frequency?: string | null;
  estimated_duration?: string | number | null;
  priority_level?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  is_active?: boolean;
  tasks?: TemplateTaskMeta[];
}

const STORAGE_KEY = "selectedTaskTemplateId";

export function useTaskTemplates(opts?: { pollIntervalMs?: number; autoStart?: boolean }) {
  const pollMs = opts?.pollIntervalMs ?? 10000;
  const [templates, setTemplates] = useState<TaskTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterFrequency, setFilterFrequency] = useState<string>("");
  const intervalRef = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/scheduling/task-templates/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load task templates (${res.status})`);
      }
      const data = await res.json();
      const list = (data.results || data || []) as TaskTemplateItem[];
      setTemplates(list);
      // Auto-select first template if none selected
      if (!selectedId && list.length > 0) {
        setSelectedId(String(list[0].id));
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load task templates");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // Start polling
  useEffect(() => {
    if (opts?.autoStart === false) return;
    void load();
    intervalRef.current = window.setInterval(() => void load(), pollMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [load, pollMs, opts?.autoStart]);

  const refresh = useCallback(() => {
    return load();
  }, [load]);

  // Persist selection
  useEffect(() => {
    try {
      if (selectedId) localStorage.setItem(STORAGE_KEY, selectedId);
    } catch {
      // ignore
    }
  }, [selectedId]);

  const filtered = useMemo(() => {
    let out = templates;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    if (filterType) {
      out = out.filter((t) => (t.template_type || "").toLowerCase() === filterType.toLowerCase());
    }
    if (filterFrequency) {
      out = out.filter((t) => (t.frequency || "").toLowerCase() === filterFrequency.toLowerCase());
    }
    return out;
  }, [templates, query, filterType, filterFrequency]);

  return {
    templates,
    filteredTemplates: filtered,
    loading,
    error,
    query,
    setQuery,
    filterType,
    setFilterType,
    filterFrequency,
    setFilterFrequency,
    selectedId,
    setSelectedId,
    refresh,
  };
}
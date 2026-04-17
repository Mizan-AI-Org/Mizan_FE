import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export type DashboardCategoryRow = {
  id: string;
  name: string;
  order_index: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DashboardCustomWidgetRow = {
  id: string;
  slot_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  icon: string;
  category_id?: string | null;
  created_at?: string | null;
};

const CATEGORIES_KEY = ["dashboard-categories"] as const;
const CUSTOM_WIDGETS_KEY = ["dashboard-custom-widgets"] as const;

export function useDashboardCategories(enabled = true) {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<DashboardCategoryRow[]> => {
      const res = await api.listDashboardCategories();
      return res.categories ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useDashboardCustomWidgetsList(enabled = true) {
  return useQuery({
    queryKey: CUSTOM_WIDGETS_KEY,
    queryFn: async (): Promise<DashboardCustomWidgetRow[]> => {
      const res = await api.getDashboardCustomWidgets();
      return (res.widgets ?? []) as DashboardCustomWidgetRow[];
    },
    enabled,
    staleTime: 30_000,
  });
}

/** Mutations that keep both queries fresh after writes. */
export function useDashboardCategoryMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    qc.invalidateQueries({ queryKey: CUSTOM_WIDGETS_KEY });
  };

  const createCategory = useMutation({
    mutationFn: (body: { name: string; order_index?: number }) =>
      api.createDashboardCategory(body),
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name?: string; order_index?: number };
    }) => api.updateDashboardCategory(id, body),
    onSuccess: invalidate,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.deleteDashboardCategory(id),
    onSuccess: invalidate,
  });

  const createWidget = useMutation({
    mutationFn: (body: {
      title: string;
      subtitle?: string;
      link_url?: string;
      icon?: string;
      category_id?: string | null;
      add_to_dashboard?: boolean;
    }) => api.createDashboardCustomWidget(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOM_WIDGETS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-widget-order"] });
    },
  });

  const updateWidget = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        title?: string;
        subtitle?: string;
        link_url?: string;
        icon?: string;
        category_id?: string | null;
      };
    }) => api.updateDashboardCustomWidget(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOM_WIDGETS_KEY });
    },
  });

  const deleteWidget = useMutation({
    mutationFn: (id: string) => api.deleteDashboardCustomWidget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOM_WIDGETS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-widget-order"] });
    },
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    createWidget,
    updateWidget,
    deleteWidget,
  };
}

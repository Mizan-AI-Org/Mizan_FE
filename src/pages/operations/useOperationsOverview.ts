import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { OperationsOverview } from "@/pages/operations/contract";

export type OperationsQuery = {
  tab: string;
  category: string;
  view: string;
  focus: string;
  staff: string;
  priority: string;
  q: string;
  dateFrom: string;
  dateTo: string;
  item?: string;
  enabled?: boolean;
};

export const OPERATIONS_OVERVIEW_KEY = "operations-overview";

export function useOperationsOverview(query: OperationsQuery) {
  const { enabled = true, ...rest } = query;
  return useQuery({
    queryKey: [OPERATIONS_OVERVIEW_KEY, rest],
    queryFn: () =>
      api.getOperationsOverview({
        category: rest.category,
        focus: rest.focus,
        staff: rest.staff,
        priority: rest.priority,
        q: rest.q,
        dateFrom: rest.dateFrom,
        dateTo: rest.dateTo,
        item: rest.item,
        pageSize: 100,
      }),
    enabled,
    staleTime: 15_000,
  });
}

export type { OperationsOverview };

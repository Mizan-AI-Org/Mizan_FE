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
};

export function useOperationsOverview(query: OperationsQuery) {
  return useQuery({
    queryKey: ["operations-overview", query],
    queryFn: () =>
      api.getOperationsOverview({
        category: query.category,
        focus: query.focus,
        staff: query.staff,
        priority: query.priority,
        q: query.q,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        item: query.item,
      }),
    staleTime: 15_000,
  });
}

export type { OperationsOverview };

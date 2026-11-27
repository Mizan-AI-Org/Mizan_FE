import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "@/contexts/BranchScopeContext";
import { api } from "@/lib/api";
import type { CommandCentrePayload } from "@/lib/commandCentre";

export function useCommandCentre() {
  const { selected } = useBranchScope();
  return useQuery<CommandCentrePayload>({
    queryKey: ["command-centre", selected],
    queryFn: () => api.getCommandCenter(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

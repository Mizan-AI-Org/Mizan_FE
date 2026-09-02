import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CommandCentrePayload } from "@/lib/commandCentre";

export function useCommandCentre() {
  return useQuery<CommandCentrePayload>({
    queryKey: ["command-centre"],
    queryFn: () => api.getCommandCenter(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

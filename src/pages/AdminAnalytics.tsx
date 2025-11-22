import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import ManagerReviewDashboard from "@/pages/ManagerReviewDashboard";
import type {
  DailyKPI,
  Task,
} from "../lib/types";

export default function AdminAnalytics() {
  const { token } = useAuth();

  // KPIs
  const {
    data: kpis,
  } = useQuery<DailyKPI[]>({
    queryKey: ["dailyKpis"],
    queryFn: () => api.getDailyKpis(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });


  // Tasks
  useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(token!),
    enabled: !!token,
    refetchInterval: 45000,
  });


  const [, setReassignTargetId] = useState<number | null>(null);
  const [, setReassignToStaffId] = useState<number | null>(null);



  return (
    <div className="space-y-6">
      <div className="mt-8">
        <ManagerReviewDashboard />
      </div>
    </div>
  );
}
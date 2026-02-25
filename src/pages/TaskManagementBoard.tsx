import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import {
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StaffMetric {
  staff_id: string;
  name: string;
  role: string;
  shift_status: 'ON_SHIFT' | 'BREAK' | 'OFF_SHIFT';
  current_process: {
    name: string;
    progress: number;
  };
  tasks: {
    completed: number;
    total: number;
    overdue: number;
    is_completed: boolean;
    tasks_marked_no?: number;
    follow_up_needed?: boolean;
    photo_evidence_count?: number;
  };
  pace: {
    elapsed_minutes: number;
    avg_minutes: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
  };
  attention: {
    needed: boolean;
    reason: string;
  };
}

export default function TaskManagementBoard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeProcessesCount, setActiveProcessesCount] = useState(0);
  const [tasksToday, setTasksToday] = useState({ total: 0, completed: 0, ongoing: 0 });
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [onTimeChange, setOnTimeChange] = useState(0);
  const [attentionNeeded, setAttentionNeeded] = useState(0);
  const [staffMetrics, setStaffMetrics] = useState<StaffMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLiveBoardMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/analytics/live_board_metrics/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setActiveProcessesCount(data.active_processes_count);
        setTasksToday(data.tasks_today);
        setOnTimeRate(data.on_time_rate);
        setOnTimeChange(data.on_time_change);
        setAttentionNeeded(data.attention_needed);
      }
    } catch (error) {
      console.error('Failed to load metrics', error);
    }
  };

  const loadStaffMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/analytics/staff_live_metrics/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStaffMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load staff metrics', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLiveBoardMetrics();
    loadStaffMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLiveBoardMetrics();
      loadStaffMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPaceColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'text-emerald-500';
      case 'YELLOW': return 'text-amber-500';
      case 'RED': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto dark:bg-slate-900">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: t("live_board.active_ongoing_processes"),
            value: activeProcessesCount,
            icon: PlayCircle,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/10"
          },
          {
            label: t("live_board.processes_tasks_today"),
            value: `${tasksToday.completed}/${tasksToday.total}`,
            subtext: `${tasksToday.ongoing} ${t("live_board.in_progress")}`,
            icon: CheckCircle,
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/10"
          },
          {
            label: t("live_board.on_time_rate"),
            value: `${onTimeRate}%`,
            change: onTimeChange,
            icon: Clock,
            color: "text-violet-500",
            bg: "bg-violet-50 dark:bg-violet-900/10"
          },
          {
            label: t("live_board.attention_needed"),
            value: attentionNeeded,
            icon: AlertCircle,
            color: "text-rose-500",
            bg: "bg-rose-50 dark:bg-rose-900/10"
          },
        ].map((metric, i) => (
          <Card key={i} className="border-none shadow-sm dark:bg-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                <div className="flex items-baseline space-x-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metric.value}</h2>
                  {metric.change !== undefined && (
                    <span className={cn("text-xs font-medium", metric.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  )}
                </div>
                {metric.subtext && <p className="text-xs text-slate-500 mt-1">{metric.subtext}</p>}
              </div>
              <div className={cn("p-2 rounded-lg", metric.bg)}>
                <metric.icon className={cn("w-5 h-5", metric.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Live Progress Section */}
      <Card className="border-none shadow-sm dark:bg-slate-800 flex-1">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                {t("live_board.staff_live_progress")}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">{t("live_board.staff_live_progress_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {t("live_board.active_staff", { count: staffMetrics.length })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">{t("live_board.loading_live_data")}</div>
          ) : staffMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t("live_board.no_active_shifts")}</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                {t("live_board.no_active_shifts_desc")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {staffMetrics.map((staff) => (
                <div key={staff.staff_id} className="p-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">

                  {/* 1. Staff Identity */}
                  <div className="flex items-center gap-3 w-full md:w-48">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${staff.name}`} />
                      <AvatarFallback>{staff.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={staff.name}>
                        {staff.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{staff.role}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className={cn(
                          "font-medium",
                          staff.shift_status === 'ON_SHIFT' ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {staff.shift_status === 'ON_SHIFT' ? t("live_board.on_shift") : staff.shift_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Current Process */}
                  <div className="flex-1 w-full md:min-w-[200px]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {staff.current_process.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {staff.current_process.progress}%
                      </span>
                    </div>
                    <Progress value={staff.current_process.progress} className="h-2" />
                  </div>

                  {/* 3. Task Progress */}
                  <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2" title={`${staff.tasks.completed} out of ${staff.tasks.total} tasks completed`}>
                      {staff.tasks.is_completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-slate-400 font-mono tracking-wider text-xs">{t("live_board.tasks_label")}</span>
                      )}
                      <span className="font-semibold">
                        {staff.tasks.completed}/{staff.tasks.total}
                      </span>
                    </div>
                    {staff.tasks.overdue > 0 && (
                      <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md dark:bg-rose-900/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="font-medium text-xs">{staff.tasks.overdue} overdue</span>
                      </div>
                    )}
                    {(staff.tasks.tasks_marked_no ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md dark:bg-amber-900/20" title="Tasks marked No — follow-up">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-medium text-xs">{staff.tasks.tasks_marked_no} No</span>
                      </div>
                    )}
                    {(staff.tasks.photo_evidence_count ?? 0) > 0 && (
                      <span className="text-xs text-slate-500" title="Photo evidence submitted">
                        📷 {staff.tasks.photo_evidence_count}
                      </span>
                    )}
                  </div>

                  {/* 4. Time & Pace */}
                  <div className="w-full md:w-32 flex items-center gap-2 text-sm whitespace-nowrap">
                    <Clock className={cn("w-4 h-4", getPaceColor(staff.pace.status))} />
                    <div>
                      <span className="font-semibold">{staff.pace.elapsed_minutes} min</span>
                      <span className="text-xs text-slate-400 ml-1">
                        (avg {staff.pace.avg_minutes})
                      </span>
                    </div>
                  </div>

                  {/* 5. Attention Flag */}
                  <div className="w-full md:w-32 flex justify-end">
                    {staff.attention.needed ? (
                      <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{staff.attention.reason || t("live_board.behind_schedule")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium opacity-70">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t("common.all_good")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
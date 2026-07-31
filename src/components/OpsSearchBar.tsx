import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";

type OpsSearchBarProps = {
  className?: string;
  inputClassName?: string;
};

export function OpsSearchBar({ className = "", inputClassName = "" }: OpsSearchBarProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const searchQuery = useQuery({
    queryKey: ["dashboard", "ops-search", debounced],
    queryFn: () => api.searchDashboardOps(debounced),
    enabled: debounced.length >= 2,
  });

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const data = searchQuery.data;
  const staffHits = data?.staff ?? [];
  const taskHits = data?.tasks ?? [];
  const requestHits = data?.staff_requests ?? [];
  const invoiceHits = data?.invoices ?? [];
  const empty =
    staffHits.length === 0 &&
    taskHits.length === 0 &&
    requestHits.length === 0 &&
    invoiceHits.length === 0;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("dashboard.ops_search.placeholder")}
          className={`h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${inputClassName}`}
          aria-label={t("dashboard.ops_search.aria")}
        />
        {searchQuery.isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
        ) : null}
      </div>
      {open && debounced.length >= 2 ? (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {searchQuery.isLoading ? (
            <p className="px-3 py-4 text-sm text-slate-500">{t("dashboard.ops_search.searching")}</p>
          ) : searchQuery.isError ? (
            <p className="px-3 py-4 text-sm text-slate-500">{t("dashboard.ops_search.failed")}</p>
          ) : empty ? (
            <p className="px-3 py-4 text-sm text-slate-500">{t("dashboard.ops_search.empty")}</p>
          ) : (
            <div className="py-1.5">
              {staffHits.length > 0 ? (
                <div className="px-1.5 pb-1">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("dashboard.ops_search.section_staff")}
                  </div>
                  <ul>
                    {staffHits.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          onClick={() => go("/dashboard/staff-app")}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {taskHits.length > 0 ? (
                <div className="px-1.5 pb-1">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("dashboard.ops_search.section_tasks")}
                  </div>
                  <ul>
                    {taskHits.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          className="flex w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          onClick={() => go("/dashboard")}
                        >
                          {task.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {requestHits.length > 0 ? (
                <div className="px-1.5 pb-1">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("dashboard.ops_search.section_staff_requests")}
                  </div>
                  <ul>
                    {requestHits.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="flex w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          onClick={() => go("/dashboard")}
                        >
                          {r.title || r.category}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default OpsSearchBar;

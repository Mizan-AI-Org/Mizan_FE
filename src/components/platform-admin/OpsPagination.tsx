import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { opsBtnGhost } from "@/components/platform-admin/opsStyles";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Shared pager for platform admin list tables. */
export default function OpsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400",
          className,
        )}
      >
        <span>
          {total === 0 ? "No results" : `Showing ${total} of ${total}`}
        </span>
      </div>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{from}–{to}</span> of{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={opsBtnGhost}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <span className="text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300 px-1">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className={opsBtnGhost}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Table layout skeleton: header row + N data rows with M columns. */
export function TableSkeleton({
  rowCount = 5,
  colCount = 5,
  headerLabels,
  className,
}: {
  rowCount?: number;
  colCount?: number;
  headerLabels?: string[];
  className?: string;
}) {
  const cols = headerLabels?.length ?? colCount;
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100">
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}>
                {headerLabels?.[i] ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <Skeleton className="h-4 w-16" />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <TableRow key={rowIdx} className="border-slate-100">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Grid of card placeholders (e.g. staff cards, template cards). */
export function CardGridSkeleton({
  count = 6,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className,
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div className={`grid ${columns} gap-4 ${className ?? ""}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-24 bg-muted/50" />
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Dashboard layout: stat cards row + main content cards. */
export function DashboardSkeleton({
  statCount = 4,
  contentCards = 2,
  className,
}: {
  statCount?: number;
  contentCards?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: statCount }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: contentCards }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** List rows with avatar + lines (e.g. presence, staff list). */
export function ListSkeleton({
  rowCount = 6,
  showAvatar = true,
  lineCount = 2,
  className,
}: {
  rowCount?: number;
  showAvatar?: boolean;
  lineCount?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
          <div className="flex-1 space-y-2 min-w-0">
            {Array.from({ length: lineCount }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${j === 0 ? "w-3/5" : "w-2/5"}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Page with title + action button + content area. */
export function PageWithTableSkeleton({
  title = true,
  tableRowCount = 6,
  tableColCount = 5,
  className,
}: {
  title?: boolean;
  tableRowCount?: number;
  tableColCount?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        {title && <Skeleton className="h-9 w-64" />}
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <TableSkeleton rowCount={tableRowCount} colCount={tableColCount} />
      </div>
    </div>
  );
}

/** Form section skeleton (e.g. settings). */
export function FormSectionSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Generic content block (e.g. chart placeholder, single card). */
export function BlockSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg border bg-card p-6 ${className ?? ""}`}>
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {["h-[40%]", "h-[65%]", "h-[45%]", "h-[80%]", "h-[55%]", "h-[70%]"].map((hClass, i) => (
          <Skeleton key={i} className={`flex-1 rounded-t ${hClass}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Full-page loading skeleton for lazy routes (Suspense fallback).
 * Mimics a typical dashboard page: container, optional tabs, card + table/content.
 * Use as <Suspense fallback={<PageLoadingSkeleton />}> to avoid blank "Loading..." screen.
 */
export function PageLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`min-h-[60vh] w-full bg-background ${className ?? ""}`}
      aria-label="Loading page"
    >
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Tabs row */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-full max-w-xl">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>

        {/* Top card (e.g. analytics) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Main content card with table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
              <Skeleton className="h-10 w-[180px] rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
            <TableSkeleton rowCount={8} colCount={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

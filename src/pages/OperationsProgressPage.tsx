"use client";

import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy route: Progress is a sub-view of the Operations page. Its own ?tab=staff|categories survives. */
export default function OperationsProgressPage() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set("view", "progress");
  return <Navigate to={`/dashboard/operations?${next.toString()}`} replace />;
}

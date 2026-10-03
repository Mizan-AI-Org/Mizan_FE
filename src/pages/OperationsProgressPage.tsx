"use client";

import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy route — progress lives on Live Operations as a tab. */
export default function OperationsProgressPage() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set("view", "progress");
  const qs = next.toString();
  return <Navigate to={`/dashboard/operations/live${qs ? `?${qs}` : ""}`} replace />;
}

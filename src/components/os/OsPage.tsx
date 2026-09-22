import React from "react";
import { MizanPageShell } from "@/components/os/MizanPageShell";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flushTop?: boolean;
  /** Gradient hero header (default on). */
  hero?: boolean;
};

/** Canonical OS page container — aligned with Social / Intelligence hubs. */
export function OsPage({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  flushTop,
  hero = true,
}: Props) {
  return (
    <MizanPageShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={action}
      hero={hero}
      className={cn(flushTop && "pt-2", className)}
    >
      {children}
    </MizanPageShell>
  );
}

export default OsPage;

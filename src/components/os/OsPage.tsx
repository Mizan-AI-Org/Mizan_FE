import React from "react";
import { PAGE_SHELL_PADDED } from "@/lib/page-shell";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/os/SectionHeader";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Extra top padding when back-link already exists above */
  flushTop?: boolean;
};

/** Canonical OS page container - typography first, light chrome. */
export function OsPage({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  flushTop,
}: Props) {
  return (
    <div className={cn(PAGE_SHELL_PADDED, flushTop && "pt-2", className)}>
      <div className="space-y-section">
        <SectionHeader
          as="h1"
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleClassName="text-page-title"
          action={action}
        />
        {children}
      </div>
    </div>
  );
}

export default OsPage;

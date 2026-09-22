import React from "react";
import { MizanPageShell } from "@/components/os/MizanPageShell";

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  askPrompt?: string;
};

export function IntelligenceShell({ title, description, children, className, askPrompt }: Props) {
  return (
    <MizanPageShell
      eyebrow="Intelligence"
      title={title}
      description={description}
      className={className}
      showAskAgent
      askAgentPrompt={askPrompt}
      hero
    >
      {children}
    </MizanPageShell>
  );
}

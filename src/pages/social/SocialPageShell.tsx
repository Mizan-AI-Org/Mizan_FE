import React from "react";
import { MizanPageShell } from "@/components/os/MizanPageShell";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function SocialPageShell({ title, description, actions, children }: Props) {
  return (
    <MizanPageShell title={title} description={description} actions={actions} hero>
      {children}
    </MizanPageShell>
  );
}

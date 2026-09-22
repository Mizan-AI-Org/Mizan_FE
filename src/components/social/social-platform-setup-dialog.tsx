import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PlatformSetupInfo = {
  platform: string;
  configured?: boolean;
  missing_env?: string[];
  redirect_uri?: string;
  provider?: string;
  env_vars?: string[];
  setup_steps?: string[];
  tenant_steps?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  setup: PlatformSetupInfo | undefined;
};

/** Operator + tenant checklist for one channel (server OAuth app). */
export function SocialPlatformSetupDialog({ open, onOpenChange, label, setup }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label} — setup</DialogTitle>
          <DialogDescription>
            Mizan uses one {setup?.provider || "provider"} OAuth app on the server. Each restaurant connects its own
            account; tokens stay scoped to that tenant.
          </DialogDescription>
        </DialogHeader>
        {setup?.redirect_uri ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">Redirect URI: </span>
            <code className="break-all text-muted-foreground">{setup.redirect_uri}</code>
          </div>
        ) : null}
        {setup?.missing_env?.length ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Missing in Mizan_BE/.env: {setup.missing_env.join(", ")}
          </p>
        ) : null}
        {setup?.setup_steps?.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Platform (once)</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
              {setup.setup_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {setup?.tenant_steps?.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Per tenant</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
              {setup.tenant_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

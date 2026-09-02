import React from "react";
import { cn } from "@/lib/utils";

const AGENT_AVATAR_SRC = "/agent-avatar.webp";

type Props = {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
  alt?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-14 w-14",
};

/** Miya — shared agent avatar (public/agent-avatar.webp). */
export function AgentAvatar({
  size = "md",
  className,
  ring = false,
  alt = "Miya Agent",
}: Props) {
  return (
    <img
      src={AGENT_AVATAR_SRC}
      alt={alt}
      className={cn(
        SIZE[size],
        "shrink-0 rounded-full object-cover object-top",
        ring && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background",
        className,
      )}
    />
  );
}

export default AgentAvatar;

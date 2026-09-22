import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { COMPACT_TABS_LIST, COMPACT_TABS_TRIGGER, HUB_TABS_LIST_INLINE, HUB_TABS_TRIGGER } from "@/lib/mizan-ui";

const Tabs = TabsPrimitive.Root;

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  variant?: "hub" | "compact";
};

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant = "hub", ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(variant === "compact" ? COMPACT_TABS_LIST : HUB_TABS_LIST_INLINE, className)}
      {...props}
    />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  variant?: "hub" | "compact";
};

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, variant = "hub", ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(variant === "compact" ? COMPACT_TABS_TRIGGER : HUB_TABS_TRIGGER, className)}
      {...props}
    />
  ),
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

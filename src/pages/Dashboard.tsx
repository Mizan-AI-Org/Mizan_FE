import React from "react";
import { CommandCentreView } from "@/components/command/CommandCentreView";
import FirstRunChecklist from "@/components/command/FirstRunChecklist";

export default function Dashboard() {
  return (
    <>
      <FirstRunChecklist />
      <CommandCentreView className="w-full" />
    </>
  );
}

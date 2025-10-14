import { FloorDesigner } from "@/components/FloorDesigner";

export default function FloorManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Floor & Table Management</h1>
        <p className="text-muted-foreground">Design your restaurant layout with drag-and-drop tables</p>
      </div>

      <FloorDesigner />
    </div>
  );
}

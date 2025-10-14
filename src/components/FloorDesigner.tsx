import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

interface Table {
  id: string;
  name: string;
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  shape: string;
  status: string;
}

interface Floor {
  id: string;
  name: string;
  layout_data: any;
}

export const FloorDesigner = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [floorName, setFloorName] = useState("");
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState(4);
  const [tableShape, setTableShape] = useState("rectangle");

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    if (selectedFloor) {
      fetchTables(selectedFloor.id);
    }
  }, [selectedFloor]);

  const fetchFloors = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .single();

    if (restaurant) {
      const { data } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order");

      setFloors(data || []);
      if (data && data.length > 0 && !selectedFloor) {
        setSelectedFloor(data[0]);
      }
    }
  };

  const fetchTables = async (floorId: string) => {
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("floor_id", floorId);

    setTables(data || []);
  };

  const createOrUpdateFloor = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.user.id)
      .single();

    if (!restaurant) return;

    try {
      if (editingFloor) {
        const { error } = await supabase
          .from("floors")
          .update({ name: floorName })
          .eq("id", editingFloor.id);

        if (error) throw error;
        toast.success("Floor updated");
      } else {
        const { error } = await supabase
          .from("floors")
          .insert({
            restaurant_id: restaurant.id,
            name: floorName,
            layout_data: {},
          });

        if (error) throw error;
        toast.success("Floor created");
      }

      setShowDialog(false);
      setFloorName("");
      setEditingFloor(null);
      fetchFloors();
    } catch (error) {
      console.error("Error saving floor:", error);
      toast.error("Failed to save floor");
    }
  };

  const addTable = async () => {
    if (!selectedFloor) return;

    try {
      const randomX = Math.random() * 600;
      const randomY = Math.random() * 400;

      const { error } = await supabase
        .from("tables")
        .insert({
          floor_id: selectedFloor.id,
          name: tableName || `Table ${tables.length + 1}`,
          capacity: tableCapacity,
          position_x: randomX,
          position_y: randomY,
          width: tableShape === "circle" ? 100 : 120,
          height: tableShape === "circle" ? 100 : 80,
          shape: tableShape,
          status: "available",
        });

      if (error) throw error;

      toast.success("Table added");
      setShowTableDialog(false);
      setTableName("");
      setTableCapacity(4);
      fetchTables(selectedFloor.id);
    } catch (error) {
      console.error("Error adding table:", error);
      toast.error("Failed to add table");
    }
  };

  const deleteTable = async (tableId: string) => {
    try {
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", tableId);

      if (error) throw error;

      toast.success("Table deleted");
      if (selectedFloor) {
        fetchTables(selectedFloor.id);
      }
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Failed to delete table");
    }
  };

  const updateTablePosition = async (tableId: string, x: number, y: number) => {
    try {
      const { error } = await supabase
        .from("tables")
        .update({ position_x: x, position_y: y })
        .eq("id", tableId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating table position:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, table: Table) => {
    e.dataTransfer.setData("tableId", table.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("tableId");
    const canvas = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - canvas.left;
    const y = e.clientY - canvas.top;
    updateTablePosition(tableId, x, y);
    
    setTables(prev => 
      prev.map(t => 
        t.id === tableId ? { ...t, position_x: x, position_y: y } : t
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={selectedFloor?.id}
            onValueChange={(id) => setSelectedFloor(floors.find(f => f.id === id) || null)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select floor" />
            </SelectTrigger>
            <SelectContent>
              {floors.map((floor) => (
                <SelectItem key={floor.id} value={floor.id}>
                  {floor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setEditingFloor(selectedFloor);
              setFloorName(selectedFloor?.name || "");
              setShowDialog(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingFloor(null);
              setFloorName("");
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Floor
          </Button>
          <Button onClick={() => setShowTableDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedFloor?.name || "Floor Plan"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="relative w-full h-[600px] bg-secondary/20 border-2 border-dashed rounded-lg overflow-auto"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {tables.map((table) => (
              <div
                key={table.id}
                draggable
                onDragStart={(e) => handleDragStart(e, table)}
                className="absolute cursor-move group"
                style={{
                  left: table.position_x,
                  top: table.position_y,
                  width: table.width,
                  height: table.height,
                }}
              >
                <div
                  className={`w-full h-full bg-primary/10 border-2 border-primary hover:bg-primary/20 transition-colors flex items-center justify-center ${
                    table.shape === "circle" ? "rounded-full" : "rounded-lg"
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-sm">{table.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {table.capacity} seats
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteTable(table.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFloor ? "Edit Floor" : "Create Floor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Floor Name</Label>
              <Input
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="e.g., Main Dining, Patio"
              />
            </div>
            <Button onClick={createOrUpdateFloor} className="w-full">
              {editingFloor ? "Update" : "Create"} Floor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Name</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g., T1, A1, VIP Table"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(parseInt(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div>
              <Label>Shape</Label>
              <Select value={tableShape} onValueChange={setTableShape}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addTable} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Square, Circle, Users } from "lucide-react";

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
  layout_data: Record<string, unknown>;
}

export const FloorDesigner = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showEditTableDialog, setShowEditTableDialog] = useState(false);
  const [floorName, setFloorName] = useState("");
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState(4);
  const [tableShape, setTableShape] = useState("rectangle");
  const [tableStatus, setTableStatus] = useState<"available" | "reserved" | "occupied" | "cleaning">("available");

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

      setFloors(data as Floor[] || []);
      if (data && data.length > 0 && !selectedFloor) {
        setSelectedFloor(data[0] as Floor);
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

  const updateTable = async () => {
    if (!editingTable) return;

    try {
      const { error } = await supabase
        .from("tables")
        .update({
          name: tableName,
          capacity: tableCapacity,
          shape: tableShape,
          status: tableStatus,
          width: tableShape === "circle" ? 100 : 120,
          height: tableShape === "circle" ? 100 : 80,
        })
        .eq("id", editingTable.id);

      if (error) throw error;

      toast.success("Table updated");
      setShowEditTableDialog(false);
      setEditingTable(null);
      setTableName("");
      setTableCapacity(4);
      setTableStatus("available");
      if (selectedFloor) fetchTables(selectedFloor.id);
    } catch (error) {
      console.error("Error updating table:", error);
      toast.error("Failed to update table");
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

  const handleTableClick = (table: Table) => {
    setEditingTable(table);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setTableShape(table.shape);
    setTableStatus(table.status as "available" | "reserved" | "occupied" | "cleaning");
    setSelectedTableId(table.id);
    setShowEditTableDialog(true);
  };

  const getTableBorderColor = (status: string) => {
    switch (status) {
      case "available":
        return "border-green-500";
      case "occupied":
        return "border-red-500";
      case "reserved":
        return "border-amber-500";
      default:
        return "border-border";
    }
  };

  const getTableBgColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 hover:bg-green-500/20";
      case "occupied":
        return "bg-red-500/10 hover:bg-red-500/20";
      case "reserved":
        return "bg-amber-500/10 hover:bg-amber-500/20";
      default:
        return "bg-secondary/20 hover:bg-secondary/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Floor Tabs and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tabs value={selectedFloor?.id} onValueChange={(id) => setSelectedFloor(floors.find(f => f.id === id) || null)}>
            <TabsList>
              {floors.map((floor) => (
                <TabsTrigger key={floor.id} value={floor.id}>
                  {floor.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingFloor(null);
              setFloorName("");
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Floor
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500 text-green-500">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Available
          </Badge>
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
            Reserved
          </Badge>
          <Badge variant="outline" className="border-red-500 text-red-500">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Occupied
          </Badge>
        </div>
      </div>

      {/* Floor Designer Canvas */}
      <div className="flex gap-4">
        {/* Toolbar */}
        <Card className="w-20 shrink-0">
          <CardContent className="p-2 space-y-2">
            <Button
              variant="outline"
              size="icon"
              className="w-full h-14"
              onClick={() => {
                setTableShape("rectangle");
                setShowTableDialog(true);
              }}
              title="Add Rectangle Table"
            >
              <Square className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-full h-14"
              onClick={() => {
                setTableShape("circle");
                setShowTableDialog(true);
              }}
              title="Add Round Table"
            >
              <Circle className="h-6 w-6" />
            </Button>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="flex-1">
          <CardContent className="p-4">
            <div
              className="relative w-full h-[600px] bg-[hsl(var(--muted)/0.3)] rounded-lg overflow-hidden"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {tables.map((table) => (
                <div
                  key={table.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, table)}
                  onClick={() => handleTableClick(table)}
                  className={`absolute cursor-pointer group transition-all ${
                    selectedTableId === table.id ? "ring-2 ring-primary" : ""
                  }`}
                  style={{
                    left: table.position_x,
                    top: table.position_y,
                    width: table.width,
                    height: table.height,
                  }}
                >
                  <div
                    className={`w-full h-full border-4 ${getTableBorderColor(table.status)} ${getTableBgColor(table.status)} transition-all flex items-center justify-center ${
                      table.shape === "circle" ? "rounded-full" : "rounded-lg"
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-bold text-lg">{table.name}</div>
                      <div className="text-xs opacity-70 flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        {table.capacity}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTable(table.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Dialog open={showEditTableDialog} onOpenChange={setShowEditTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table Settings</DialogTitle>
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
            <div>
              <Label>Status / Reservation</Label>
              <Select 
                value={tableStatus} 
                onValueChange={(value) => setTableStatus(value as "available" | "reserved" | "occupied" | "cleaning")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateTable} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Update Table
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingTable) {
                    deleteTable(editingTable.id);
                    setShowEditTableDialog(false);
                    setEditingTable(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  floor_id: string;
}

interface Floor {
  id: string;
  name: string;
  tables: Table[];
}

export default function FloorManagement() {
  const { toast } = useToast();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [restaurantId, setRestaurantId] = useState<string>("");

  // Form states
  const [floorName, setFloorName] = useState("");
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState("4");

  useEffect(() => {
    loadData();

    // Subscribe to real-time table updates
    const channel = supabase
      .channel('table-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.user.id)
      .single();

    if (restaurant) {
      setRestaurantId(restaurant.id);

      const { data: floorsData } = await supabase
        .from("floors")
        .select(`
          *,
          tables (*)
        `)
        .eq("restaurant_id", restaurant.id)
        .order("display_order");

      setFloors(floorsData || []);
    }
  };

  const openFloorDialog = (floor?: Floor) => {
    if (floor) {
      setEditingFloor(floor);
      setFloorName(floor.name);
    } else {
      setEditingFloor(null);
      setFloorName("");
    }
    setShowFloorDialog(true);
  };

  const openTableDialog = (floorId: string) => {
    setSelectedFloor(floorId);
    setTableName("");
    setTableCapacity("4");
    setShowTableDialog(true);
  };

  const saveFloor = async () => {
    if (!floorName.trim()) {
      toast({
        title: "Error",
        description: "Floor name is required",
        variant: "destructive",
      });
      return;
    }

    const floorData = {
      name: floorName,
      restaurant_id: restaurantId,
    };

    if (editingFloor) {
      const { error } = await supabase
        .from("floors")
        .update(floorData)
        .eq("id", editingFloor.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update floor",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("floors")
        .insert(floorData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create floor",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: `Floor ${editingFloor ? 'updated' : 'created'} successfully`,
    });
    setShowFloorDialog(false);
    loadData();
  };

  const saveTable = async () => {
    if (!tableName.trim()) {
      toast({
        title: "Error",
        description: "Table name is required",
        variant: "destructive",
      });
      return;
    }

    const tableData = {
      name: tableName,
      capacity: parseInt(tableCapacity),
      floor_id: selectedFloor,
    };

    const { error } = await supabase
      .from("tables")
      .insert(tableData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create table",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Table created successfully",
    });
    setShowTableDialog(false);
    loadData();
  };

  const deleteFloor = async (id: string) => {
    const { error } = await supabase
      .from("floors")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete floor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Floor deleted",
      });
      loadData();
    }
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase
      .from("tables")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Table deleted",
      });
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "occupied": return "bg-red-500";
      case "reserved": return "bg-blue-500";
      case "cleaning": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Floor & Table Management</h1>
        <Button onClick={() => openFloorDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Floor
        </Button>
      </div>

      {floors.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No floors created yet</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {floors.map(floor => (
            <Card key={floor.id} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{floor.name}</h2>
                <div className="flex gap-2">
                  <Button onClick={() => openTableDialog(floor.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openFloorDialog(floor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteFloor(floor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {floor.tables?.map(table => (
                  <Card
                    key={table.id}
                    className="p-4 flex flex-col items-center gap-2"
                  >
                    <Square className="h-12 w-12 text-muted-foreground" />
                    <span className="font-semibold">{table.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Capacity: {table.capacity}
                    </span>
                    <Badge className={getStatusColor(table.status)}>
                      {table.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTable(table.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFloor ? 'Edit Floor' : 'Add Floor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Floor Name *</Label>
              <Input
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="e.g., Main Floor, Patio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFloor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Name *</Label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g., T1, A-1"
              />
            </div>
            <div>
              <Label>Capacity *</Label>
              <Input
                type="number"
                value={tableCapacity}
                onChange={(e) => setTableCapacity(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTable}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

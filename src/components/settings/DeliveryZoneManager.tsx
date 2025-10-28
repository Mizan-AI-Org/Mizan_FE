import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  MapPin,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryZone {
  id: string;
  name: string;
  radius: number;
  deliveryFee: number;
  minOrder: number;
  estimatedTime: number;
  color: string;
}

export default function DeliveryZoneManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([
    {
      id: '1',
      name: 'Zone 1 - Downtown',
      radius: 2000,
      deliveryFee: 5,
      minOrder: 15,
      estimatedTime: 30,
      color: '#10b981',
    },
    {
      id: '2',
      name: 'Zone 2 - Suburbs',
      radius: 5000,
      deliveryFee: 8,
      minOrder: 25,
      estimatedTime: 45,
      color: '#f59e0b',
    },
  ]);

  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [newZone, setNewZone] = useState<Partial<DeliveryZone>>({
    name: '',
    radius: 1000,
    deliveryFee: 5,
    minOrder: 15,
    estimatedTime: 30,
    color: '#3b82f6',
  });

  const handleAddZone = () => {
    if (!newZone.name) {
      toast.error('Please enter a zone name');
      return;
    }

    const zone: DeliveryZone = {
      id: Date.now().toString(),
      name: newZone.name,
      radius: newZone.radius || 1000,
      deliveryFee: newZone.deliveryFee || 5,
      minOrder: newZone.minOrder || 15,
      estimatedTime: newZone.estimatedTime || 30,
      color: newZone.color || '#3b82f6',
    };

    setZones([...zones, zone]);
    setNewZone({
      name: '',
      radius: 1000,
      deliveryFee: 5,
      minOrder: 15,
      estimatedTime: 30,
      color: '#3b82f6',
    });
    toast.success('Delivery zone added successfully!');
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
    toast.success('Delivery zone deleted');
  };

  const handleUpdateZone = (id: string, updates: Partial<DeliveryZone>) => {
    setZones(zones.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const handleSaveEdit = (id: string) => {
    setEditingZone(null);
    toast.success('Zone updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Map Visualization */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Delivery Zones Map
          </CardTitle>
          <CardDescription>
            Visual representation of your delivery zones (centered on restaurant location)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[400px] rounded-lg overflow-hidden border-2 border-border bg-muted">
            <iframe
              src="https://maps.google.com/maps?width=100%&height=400&hl=en&q=40.7128,-74.0060&t=&z=12&ie=UTF8&iwloc=B&output=embed"
              width="100%"
              height="400"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title="Delivery Zones Map"
            />
          </div>

          {/* Zone Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <Badge
                key={zone.id}
                variant="outline"
                className="flex items-center gap-2"
                style={{ borderColor: zone.color }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Zones */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Delivery Zones</CardTitle>
          <CardDescription>Manage your delivery zones and pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 border rounded-lg space-y-4"
              style={{ borderLeftWidth: '4px', borderLeftColor: zone.color }}
            >
              {editingZone === zone.id ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zone Name</Label>
                    <Input
                      value={zone.name}
                      onChange={(e) =>
                        handleUpdateZone(zone.id, { name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Delivery Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={zone.deliveryFee}
                        onChange={(e) =>
                          handleUpdateZone(zone.id, {
                            deliveryFee: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Order ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={zone.minOrder}
                        onChange={(e) =>
                          handleUpdateZone(zone.id, {
                            minOrder: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Delivery Time (minutes)</Label>
                    <Input
                      type="number"
                      value={zone.estimatedTime}
                      onChange={(e) =>
                        handleUpdateZone(zone.id, {
                          estimatedTime: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Radius: {(zone.radius / 1000).toFixed(1)} km</Label>
                    <Slider
                      min={500}
                      max={10000}
                      step={100}
                      value={[zone.radius]}
                      onValueChange={(value) =>
                        handleUpdateZone(zone.id, { radius: value[0] })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveEdit(zone.id)}
                      size="sm"
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingZone(null)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{zone.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Radius: {(zone.radius / 1000).toFixed(1)} km
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditingZone(zone.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteZone(zone.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Delivery Fee</p>
                        <p className="font-medium">${zone.deliveryFee.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Min Order</p>
                        <p className="font-medium">${zone.minOrder.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Time</p>
                        <p className="font-medium">{zone.estimatedTime} min</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add New Zone */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Delivery Zone
          </CardTitle>
          <CardDescription>Create a new delivery zone with custom settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-zone-name">Zone Name</Label>
            <Input
              id="new-zone-name"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              placeholder="e.g., Zone 3 - North Side"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-delivery-fee">Delivery Fee ($)</Label>
              <Input
                id="new-delivery-fee"
                type="number"
                step="0.01"
                value={newZone.deliveryFee}
                onChange={(e) =>
                  setNewZone({ ...newZone, deliveryFee: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-min-order">Minimum Order ($)</Label>
              <Input
                id="new-min-order"
                type="number"
                step="0.01"
                value={newZone.minOrder}
                onChange={(e) =>
                  setNewZone({ ...newZone, minOrder: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-est-time">Estimated Delivery Time (minutes)</Label>
            <Input
              id="new-est-time"
              type="number"
              value={newZone.estimatedTime}
              onChange={(e) =>
                setNewZone({ ...newZone, estimatedTime: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Radius: {((newZone.radius || 1000) / 1000).toFixed(1)} km</Label>
            <Slider
              min={500}
              max={10000}
              step={100}
              value={[newZone.radius || 1000]}
              onValueChange={(value) => setNewZone({ ...newZone, radius: value[0] })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-zone-color">Zone Color</Label>
            <div className="flex gap-2">
              <Input
                id="new-zone-color"
                type="color"
                value={newZone.color}
                onChange={(e) => setNewZone({ ...newZone, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={newZone.color}
                onChange={(e) => setNewZone({ ...newZone, color: e.target.value })}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <Button onClick={handleAddZone} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Delivery Zone
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
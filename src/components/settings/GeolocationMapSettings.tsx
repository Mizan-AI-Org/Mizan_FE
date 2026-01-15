import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  MapPin,
  Navigation,
  Crosshair,
  Save,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { Circle, Marker, Polygon, TileLayer } from "react-leaflet";
import { useMap, useMapEvents } from "react-leaflet/hooks";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import * as L from "leaflet";
import { MapContainer } from "react-leaflet";
interface GeolocationMapSettingsProps {
  latitude: number;
  longitude: number;
  radius: number;
  geofenceEnabled: boolean;
  geofencePolygon: Array<[number, number]>;
  onToggleGeofence: (value: boolean) => void;
  onPolygonChange: (polygon: Array<[number, number]>) => void;
  onSave: (lat: number, lng: number, radius: number) => Promise<void> | void;
  isSaving: boolean;
}

type MapCenter = { lat: number; lng: number };

export default function GeolocationMapSettings({
  latitude,
  longitude,
  radius,
  geofenceEnabled,
  geofencePolygon,
  onToggleGeofence,
  onPolygonChange,
  onSave,
  isSaving,
}: GeolocationMapSettingsProps) {
  const fallbackCenter = useMemo<MapCenter>(() => {
    if (!latitude && !longitude) {
      return { lat: 40.7128, lng: -74.006 };
    }
    if (latitude === 0 && longitude === 0) {
      return { lat: 40.7128, lng: -74.006 };
    }
    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  const [lat, setLat] = useState<number>(fallbackCenter.lat);
  const [lng, setLng] = useState<number>(fallbackCenter.lng);
  const [latInput, setLatInput] = useState<string>(() =>
    fallbackCenter.lat.toString()
  );
  const [lngInput, setLngInput] = useState<string>(() =>
    fallbackCenter.lng.toString()
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(radius || 0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] =
    useState<L.LatLngExpression>(fallbackCenter);
  const [polygonPoints, setPolygonPoints] =
    useState<Array<[number, number]>>(geofencePolygon);
  const [isDrawing, setIsDrawing] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  useEffect(() => {
    setLat(fallbackCenter.lat);
    setLng(fallbackCenter.lng);
    setLatInput(fallbackCenter.lat.toString());
    setLngInput(fallbackCenter.lng.toString());
    setMapCenter(fallbackCenter);
  }, [fallbackCenter]);

  useEffect(() => {
    setRadiusMeters(radius || 0);
  }, [radius]);

  useEffect(() => {
    setPolygonPoints(geofencePolygon);
  }, [geofencePolygon]);

  useEffect(() => {
    onPolygonChange(polygonPoints);
  }, [polygonPoints, onPolygonChange]);

  useEffect(() => {
    setMapCenter({ lat, lng });
  }, [lat, lng]);

  const markerIcon = useMemo(
    () =>
      L.icon({
        iconUrl: new URL(
          "leaflet/dist/images/marker-icon.png",
          import.meta.url
        ).toString(),
        iconRetinaUrl: new URL(
          "leaflet/dist/images/marker-icon-2x.png",
          import.meta.url
        ).toString(),
        shadowUrl: new URL(
          "leaflet/dist/images/marker-shadow.png",
          import.meta.url
        ).toString(),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }),
    []
  );

  const MapCenterUpdater = ({ center }: { center: L.LatLngExpression }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center);
    }, [center, map]);
    return null;
  };

  const handleAddPolygonPoint = useCallback(
    (pointLat: number, pointLng: number) => {
      setPolygonPoints((prev) => [...prev, [pointLat, pointLng]]);
    },
    []
  );

  const handleMapClick = useCallback((pointLat: number, pointLng: number) => {
    setLat(pointLat);
    setLng(pointLng);
    setLatInput(pointLat.toString());
    setLngInput(pointLng.toString());
  }, []);

  const handleLatInputChange = useCallback((value: string) => {
    setLatInput(value);
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setLat(parsed);
    }
  }, []);

  const handleLngInputChange = useCallback((value: string) => {
    setLngInput(value);
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setLng(parsed);
    }
  }, []);

  const handleLatBlur = useCallback(() => {
    const parsed = parseFloat(latInput);
    if (Number.isNaN(parsed)) {
      setLatInput(lat.toString());
      return;
    }
    setLat(parsed);
    setLatInput(parsed.toString());
  }, [latInput, lat]);

  const handleLngBlur = useCallback(() => {
    const parsed = parseFloat(lngInput);
    if (Number.isNaN(parsed)) {
      setLngInput(lng.toString());
      return;
    }
    setLng(parsed);
    setLngInput(parsed.toString());
  }, [lngInput, lng]);

  const MapInteractions = () => {
    useMapEvents({
      click: (event) => {
        if (isDrawing) {
          if (!geofenceEnabled) {
            toast.error("Enable geofence to draw a zone.");
            return;
          }
          handleAddPolygonPoint(event.latlng.lat, event.latlng.lng);
          return;
        }
        handleMapClick(event.latlng.lat, event.latlng.lng);
      },
    });
    return null;
  };

  const handleMarkerDrag = useCallback((event: L.LeafletEvent) => {
    const marker = event.target as L.Marker;
    const position = marker.getLatLng();
    setLat(position.lat);
    setLng(position.lng);
    setLatInput(position.lat.toString());
    setLngInput(position.lng.toString());
  }, []);

  const handleStartStopDrawing = () => {
    if (isDrawing) {
      if (polygonPoints.length < 3) {
        toast.error("Add at least three points to define a geolock zone.");
        return;
      }
      toast.success("Geolock zone captured.");
    } else {
      setPolygonPoints([]);
    }
    setIsDrawing(!isDrawing);
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    toast.success("Geolock zone cleared.");
  };

  const searchAddress = useCallback(async () => {
    if (!addressInput.trim()) return;

    setIsSearchingAddress(true);
    try {
      const encodedAddress = encodeURIComponent(addressInput.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "MizanApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const results = await response.json();

      if (results && results.length > 0) {
        const result = results[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        setLat(newLat);
        setLng(newLng);
        setLatInput(newLat.toString());
        setLngInput(newLng.toString());
        toast.success(`Location found: ${result.display_name.substring(0, 50)}...`);
      } else {
        toast.error("Address not found. Try a more specific address.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Failed to search address. Please try again.");
    } finally {
      setIsSearchingAddress(false);
    }
  }, [addressInput]);

  const getCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);

    const setLocation = (lat: number, lng: number, accuracy: number | null, message: string, isInfo = false) => {
      setLat(lat);
      setLng(lng);
      setLatInput(lat.toString());
      setLngInput(lng.toString());
      setIsGettingLocation(false);
      const accuracyText = accuracy ? ` (±${Math.round(accuracy)}m)` : "";
      if (isInfo) {
        toast.info(message + accuracyText);
      } else {
        toast.success(message + accuracyText);
      }
    };

    const tryIpFallback = async () => {
      try {
        const resp = await fetch("https://ipwho.is/", { mode: "cors", cache: "no-store" });
        if (resp.ok) {
          const data = await resp.json();
          const ipLat = Number(data?.latitude);
          const ipLng = Number(data?.longitude);
          if (Number.isFinite(ipLat) && Number.isFinite(ipLng)) {
            setLocation(ipLat, ipLng, null, "Approximate location via IP. Please verify before saving.", true);
            return;
          }
        }
      } catch (error) {
        console.debug("IP geolocation fallback failed", error);
      }
      setIsGettingLocation(false);
      toast.error("Failed to get current location. Please enter manually.");
    };

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, "Location detected (low accuracy).");
        },
        () => {
          tryIpFallback();
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    };

    // Use watchPosition to collect multiple readings and pick the best one
    const tryHighAccuracyWatch = () => {
      let bestPosition: GeolocationPosition | null = null;
      let cleared = false;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cleared) return;
          // Keep the most accurate reading
          if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = pos;
          }
          // If we get a very accurate reading (< 50m), use it immediately
          if (pos.coords.accuracy < 50) {
            cleared = true;
            navigator.geolocation.clearWatch(watchId);
            setLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, "Location detected successfully.");
          }
        },
        () => {
          if (cleared) return;
          cleared = true;
          navigator.geolocation.clearWatch(watchId);
          if (bestPosition) {
            setLocation(bestPosition.coords.latitude, bestPosition.coords.longitude, bestPosition.coords.accuracy, "Location detected.");
          } else {
            tryLowAccuracy();
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );

      // After 10 seconds, use the best position we have
      setTimeout(() => {
        if (cleared) return;
        cleared = true;
        navigator.geolocation.clearWatch(watchId);
        if (bestPosition) {
          setLocation(bestPosition.coords.latitude, bestPosition.coords.longitude, bestPosition.coords.accuracy, "Best available location detected.");
        } else {
          tryLowAccuracy();
        }
      }, 10000);
    };

    // Start with watchPosition to collect the best reading
    tryHighAccuracyWatch();
  }, []);

  const handleSave = async () => {
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      Number.isNaN(radiusMeters)
    ) {
      toast.error("Please fill in all location fields.");
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      toast.error("Latitude must be between -90 and 90.");
      return;
    }
    if (parsedLng < -180 || parsedLng > 180) {
      toast.error("Longitude must be between -180 and 180.");
      return;
    }
    if (radiusMeters < 5 || radiusMeters > 100) {
      toast.error("Geofence radius must be between 5 and 100 meters.");
      return;
    }
    setLat(parsedLat);
    setLng(parsedLng);
    setLatInput(parsedLat.toString());
    setLngInput(parsedLng.toString());
    await onSave(parsedLat, parsedLng, radiusMeters);
  };

  const radiusInKm = (radiusMeters / 1000).toFixed(2);
  const hasPolygon = polygonPoints.length >= 3;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Restaurant Location & Geofencing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Geofence Monitoring</p>
            <p className="text-xs text-muted-foreground">
              Require team members to be within your geolocked zone before
              clocking in.
            </p>
          </div>
          <Switch
            checked={geofenceEnabled}
            onCheckedChange={onToggleGeofence}
            className="sm:self-center"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => handleLatInputChange(e.target.value)}
              onBlur={handleLatBlur}
              placeholder="e.g., 40.7128"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              inputMode="decimal"
              value={lngInput}
              onChange={(e) => handleLngInputChange(e.target.value)}
              onBlur={handleLngBlur}
              placeholder="e.g., -74.0060"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Search by Address</Label>
          <div className="flex gap-2">
            <Input
              id="address"
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && addressInput.trim()) {
                  e.preventDefault();
                  searchAddress();
                }
              }}
              placeholder="e.g., 123 Main St, Marrakech, Morocco"
              className="flex-1"
            />
            <Button
              onClick={searchAddress}
              disabled={isSearchingAddress || !addressInput.trim()}
              variant="outline"
            >
              {isSearchingAddress ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant={isDrawing ? "destructive" : "outline"}
              onClick={handleStartStopDrawing}
              className="w-full sm:w-auto"
            >
              {isDrawing ? "Finish Geolock Zone" : "Define Geolock Zone"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearPolygon}
              disabled={!polygonPoints.length}
              className="w-full sm:w-auto"
            >
              Clear Zone
            </Button>
          </div>
          <Badge
            variant={hasPolygon ? "default" : "secondary"}
            className="justify-center px-3 py-1 text-xs"
          >
            {hasPolygon
              ? `${polygonPoints.length} points captured`
              : "Zone not defined"}
          </Badge>
        </div>

        <div className="relative w-full h-[320px] overflow-hidden rounded-lg border-2 border-border sm:h-[420px]">
          <MapContainer
            center={mapCenter}
            zoom={15}
            scrollWheelZoom
            className="h-full w-full"
          >
            <MapCenterUpdater center={mapCenter} />
            <MapInteractions />
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution=""
              maxZoom={19}
              detectRetina
              crossOrigin="anonymous"
              keepBuffer={2}
            />
            <Marker
              position={[lat, lng]}
              draggable
              icon={markerIcon}
              eventHandlers={{ dragend: handleMarkerDrag }}
            />
            {radiusMeters > 0 && (
              <Circle
                center={[lat, lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.15,
                }}
              />
            )}
            {hasPolygon && (
              <Polygon
                positions={polygonPoints.map(([pointLat, pointLng]) => [
                  pointLat,
                  pointLng,
                ])}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#22c55e",
                  fillOpacity: 0.2,
                }}
              />
            )}
          </MapContainer>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-accent/20 bg-accent/10 p-4 sm:flex-row sm:items-start">
          <AlertCircle className="mt-0.5 h-5 w-5 text-accent" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">
              {geofenceEnabled ? "Geofencing Active" : "Geofencing Disabled"}
            </p>
            <p className="text-xs text-muted-foreground">
              Staff must clock in within {radiusInKm} km of the map marker.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="radius-slider">Geofence Radius</Label>
            <Badge variant="secondary" className="font-mono">
              {radiusMeters}m ({radiusInKm} km)
            </Badge>
          </div>
          <Slider
            id="radius-slider"
            min={5}
            max={100}
            step={5}
            value={[radiusMeters]}
            onValueChange={(value) => setRadiusMeters(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5m</span>
            <span>50m</span>
            <span>100m</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius-input">Radius (meters)</Label>
          <Input
            id="radius-input"
            type="number"
            value={radiusMeters}
            onChange={(e) => {
              let value = parseInt(e.target.value) || 0;
              // Clamp value between 5 and 100
              value = Math.max(5, Math.min(100, value));
              setRadiusMeters(value);
            }}
            min={5}
            max={100}
            placeholder="Enter radius in meters (5-100)"
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Location Settings
        </Button>
      </CardContent>
    </Card>
  );
}

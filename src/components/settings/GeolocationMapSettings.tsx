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
    <Card className="shadow-soft border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Restaurant Location & Geofencing</CardTitle>
            <CardDescription className="text-slate-500">Set your restaurant's location for staff clock-in verification</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Geofence Monitoring</p>
            <p className="text-xs text-slate-500">
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

        {/* Get My Location Button - Prominent */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <Crosshair className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick Location Setup</p>
                <p className="text-xs text-slate-500">Get your exact current location with one click</p>
              </div>
            </div>
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full sm:w-auto h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Get My Location
                </>
              )}
            </Button>
          </div>
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
            <Label htmlFor="radius-slider" className="text-sm font-medium text-slate-700">Geofence Radius</Label>
            <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700">
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
          <div className="flex justify-between text-xs text-slate-400">
            <span>5m</span>
            <span>50m</span>
            <span>100m</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius-input" className="text-sm font-medium text-slate-700">Radius (meters)</Label>
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
            className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={handleSave}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Location Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

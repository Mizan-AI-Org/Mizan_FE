import { useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import { useMap, useMapEvents } from "react-leaflet/hooks";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect } from "react";

export type WorkZone = { lat: number; lng: number; radius: number };

/** Casablanca: where a Moroccan business that has not placed its pin starts looking. */
export const DEFAULT_MAP_CENTER = { lat: 33.5731, lng: -7.5898 };

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom());
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Map pin + radius for the clock-in work zone. Click (or drag the pin) to place it. */
export default function WorkZonePicker({
  zone,
  onChange,
}: {
  zone: WorkZone | null;
  onChange: (zone: WorkZone) => void;
}) {
  const radius = zone?.radius ?? 100;
  const center = zone ?? { ...DEFAULT_MAP_CENTER };
  const icon = useMemo(
    () =>
      L.icon({
        iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
        iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
        shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }),
    [],
  );
  return (
    <div className="h-[280px] w-full overflow-hidden rounded-lg border border-border" data-testid="work-zone-map">
      <MapContainer center={[center.lat, center.lng]} zoom={zone ? 17 : 12} scrollWheelZoom className="h-full w-full">
        <Recenter lat={center.lat} lng={center.lng} />
        <ClickToPlace onPick={(lat, lng) => onChange({ lat, lng, radius })} />
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" maxZoom={19} crossOrigin="anonymous" />
        {zone ? (
          <>
            <Marker
              position={[zone.lat, zone.lng]}
              draggable
              icon={icon}
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  onChange({ lat: p.lat, lng: p.lng, radius });
                },
              }}
            />
            <Circle center={[zone.lat, zone.lng]} radius={radius} pathOptions={{ color: "#059669", fillOpacity: 0.15 }} />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}

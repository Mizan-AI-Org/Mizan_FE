import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MapPin, Navigation, Crosshair, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GeolocationMapSettingsProps {
  latitude: number;
  longitude: number;
  radius: number;
  onSave: (lat: number, lng: number, radius: number) => void;
}

export default function GeolocationMapSettings({
  latitude,
  longitude,
  radius,
  onSave,
}: GeolocationMapSettingsProps) {
  const [lat, setLat] = useState(latitude);
  const [lng, setLng] = useState(longitude);
  const [radiusMeters, setRadiusMeters] = useState(radius);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    setLat(latitude);
    setLng(longitude);
    setRadiusMeters(radius);
  }, [latitude, longitude, radius]);

  useEffect(() => {
    if (lat && lng) {
      updateMapUrl(lat, lng);
    }
  }, [lat, lng]);

  const updateMapUrl = (latitude: number, longitude: number) => {
    const url = `https://maps.google.com/maps?width=100%&height=400&hl=en&q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
    setMapUrl(url);
  };

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          setLat(newLat);
          setLng(newLng);
          updateMapUrl(newLat, newLng);
          setIsGettingLocation(false);
          toast.success('Location detected successfully!');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get current location. Please enter manually.');
          setIsGettingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
      setIsGettingLocation(false);
    }
  }, []);

  const handleSave = () => {
    if (!lat || !lng || !radiusMeters) {
      toast.error('Please fill in all location fields.');
      return;
    }
    onSave(lat, lng, radiusMeters);
  };

  const radiusInKm = (radiusMeters / 1000).toFixed(2);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Restaurant Location & Geofencing
        </CardTitle>
        <CardDescription>
          Set your restaurant's precise location and define the geofence radius for staff clock-in verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map Display */}
        <div className="relative w-full h-[400px] rounded-lg overflow-hidden border-2 border-border">
          {mapUrl ? (
            <iframe
              src={mapUrl}
              width="100%"
              height="400"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title="Restaurant Location Map"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Set location to view map</p>
              </div>
            </div>
          )}
        </div>

        {/* Location Info Alert */}
        <div className="flex items-start space-x-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Geofencing Active</p>
            <p className="text-xs text-muted-foreground">
              Staff can only clock in when within {radiusInKm} km of the restaurant location.
              Adjust the radius below to set the allowed area.
            </p>
          </div>
        </div>

        {/* Coordinates Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              placeholder="e.g., 40.7128"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value))}
              placeholder="e.g., -74.0060"
            />
          </div>
        </div>

        {/* Get Current Location Button */}
        <Button
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          variant="outline"
          className="w-full"
        >
          {isGettingLocation ? (
            <>
              <Navigation className="w-4 h-4 mr-2 animate-spin" />
              Detecting Location...
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4 mr-2" />
              Use Current Location
            </>
          )}
        </Button>

        {/* Radius Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="radius-slider">Geofence Radius</Label>
            <Badge variant="secondary" className="font-mono">
              {radiusMeters}m ({radiusInKm} km)
            </Badge>
          </div>
          <Slider
            id="radius-slider"
            min={50}
            max={5000}
            step={50}
            value={[radiusMeters]}
            onValueChange={(value) => setRadiusMeters(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50m</span>
            <span>2.5km</span>
            <span>5km</span>
          </div>
        </div>

        {/* Manual Radius Input */}
        <div className="space-y-2">
          <Label htmlFor="radius-input">Radius (meters)</Label>
          <Input
            id="radius-input"
            type="number"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(parseInt(e.target.value) || 0)}
            placeholder="Enter radius in meters"
          />
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Location Settings
        </Button>
      </CardContent>
    </Card>
  );
}
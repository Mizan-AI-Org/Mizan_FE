import { useState, useRef, useEffect } from "react";
import { Camera, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Webcam from "react-webcam";
import { supabase } from "@/integrations/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

interface ClockInOutProps {
  staffId?: string; // Made optional
  onSuccess?: () => void;
}

export const ClockInOut = ({ staffId, onSuccess }: ClockInOutProps) => {
  const [showCamera, setShowCamera] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [restaurantLatitude, setRestaurantLatitude] = useState<number | null>(null);
  const [restaurantLongitude, setRestaurantLongitude] = useState<number | null>(null);
  const [restaurantRadius, setRestaurantRadius] = useState<number | null>(null);
  const { accessToken } = useAuth();
  const [pinCode, setPinCode] = useState(""); // New state for PIN

  useEffect(() => {
    const fetchGeolocationSettings = async () => {
      if (!accessToken) return;
      try {
        const response = await api.request(
          "/accounts/restaurant/location/",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setRestaurantLatitude(data.latitude || null);
          setRestaurantLongitude(data.longitude || null);
          setRestaurantRadius(data.radius || null);
        }
      } catch (error) {
        console.error("Failed to fetch restaurant geolocation settings:", error);
        toast.error("Failed to load restaurant location for clock-in.");
      }
    };
    fetchGeolocationSettings();
  }, [accessToken]);

  const capture = async (action: "in" | "out") => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }

    let userLatitude: number | null = null;
    let userLongitude: number | null = null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;

      // Perform geofencing check
      if (restaurantLatitude !== null && restaurantLongitude !== null && restaurantRadius !== null) {
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          restaurantLatitude,
          restaurantLongitude
        );

        if (distance > restaurantRadius) {
          toast.error("You are outside the restaurant's designated clock-in area.");
          return;
        }
      }
    } catch (geoError) {
      console.error("Geolocation error:", geoError);
      toast.error("Failed to get your location. Geolocation is required for clock-in.");
      return;
    }

    try {
      // This is a placeholder for your actual clock-in/out API call
      // You would send userLatitude and userLongitude to the backend here.
      const response = await api.request(
        "/accounts/pin-login/", // Assuming this endpoint handles clock-in/out with pin and location
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            pin_code: pinCode, // Use the actual PIN input
            image_data: imageSrc,
            latitude: userLatitude,
            longitude: userLongitude,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || "Failed to clock in/out");
      }

      toast.success(`Clocked ${action === "in" ? "in" : "out"} successfully at ${new Date().toLocaleTimeString()}`);
      setIsClockedIn(action === "in");
      setShowCamera(false);
      onSuccess?.();
    } catch (error) {
      console.error("Clock in/out error:", error);
      toast.error("Failed to clock in/out: " + (error as Error).message);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in metres
    return distance;
  };

  return (
    <>
      <Button
        onClick={() => setShowCamera(true)}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        Clock {isClockedIn ? "Out" : "In"}
      </Button>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock {isClockedIn ? "Out" : "In"} Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
            <div>
              <label htmlFor="pin-code" className="sr-only">PIN Code</label>
              <input
                id="pin-code"
                type="password"
                maxLength={6}
                className="w-full p-2 border rounded-lg text-center text-xl tracking-widest font-mono"
                placeholder="Enter PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => capture(isClockedIn ? "out" : "in")}
                className="flex-1 gap-2"
              >
                <Camera className="h-4 w-4" />
                Capture & Clock {isClockedIn ? "Out" : "In"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCamera(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

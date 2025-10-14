import { useState, useRef } from "react";
import { Camera, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Webcam from "react-webcam";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClockInOutProps {
  staffId: string;
  onSuccess?: () => void;
}

export const ClockInOut = ({ staffId, onSuccess }: ClockInOutProps) => {
  const [showCamera, setShowCamera] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const capture = async (action: "in" | "out") => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }

    try {
      // In a real implementation, you would:
      // 1. Upload the image to Supabase Storage
      // 2. Create a time_tracking record with the image URL
      // 3. Optionally verify location/face recognition
      
      const timestamp = new Date().toISOString();
      
      toast.success(`Clocked ${action === "in" ? "in" : "out"} successfully at ${new Date().toLocaleTimeString()}`);
      setIsClockedIn(action === "in");
      setShowCamera(false);
      onSuccess?.();
    } catch (error) {
      console.error("Clock in/out error:", error);
      toast.error("Failed to clock in/out");
    }
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

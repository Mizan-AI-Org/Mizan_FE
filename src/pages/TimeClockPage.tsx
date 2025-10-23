import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClockEvent {
    id: string;
    user: string;
    clock_in_time: string;
    clock_out_time: string | null;
    is_break: boolean;
    break_start: string | null;
    break_end: string | null;
    clock_in_latitude: number;
    clock_in_longitude: number;
    clock_out_latitude: number | null;
    clock_out_longitude: number | null;
    verified_location: boolean;
    created_at: string;
    updated_at: string;
}

export default function TimeClockPage() {
    const { accessToken, user } = useAuth();
    const queryClient = useQueryClient();
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);

    // Fetch current session for clock-in/out status
    const { data: currentSession, isLoading: isLoadingSession } = useQuery<ClockEvent | null>({
        queryKey: ["currentSession", user?.id, accessToken],
        queryFn: () => api.getCurrentClockSession(accessToken!),
        enabled: !!accessToken && !!user?.id,
    });

    const { data: attendanceHistory, isLoading: isLoadingHistory } = useQuery<ClockEvent[]>({
        queryKey: ["attendanceHistory", user?.id, accessToken],
        queryFn: () => api.getAttendanceHistory(accessToken!),
        enabled: !!accessToken && !!user?.id,
    });

    const clockInMutation = useMutation({
        mutationFn: (location: { latitude: number; longitude: number }) => api.clockIn(accessToken!, location.latitude, location.longitude),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            toast.success("Clocked in successfully!");
        },
        onError: (err: any) => {
            toast.error(`Failed to clock in: ${err.message}`);
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (location: { latitude: number; longitude: number }) => api.clockOut(accessToken!, location.latitude, location.longitude),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            toast.success("Clocked out successfully!");
        },
        onError: (err: any) => {
            toast.error(`Failed to clock out: ${err.message}`);
        },
    });

    const startBreakMutation = useMutation({
        mutationFn: () => api.startBreak(accessToken!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            toast.success("Break started!");
        },
        onError: (err: any) => {
            toast.error(`Failed to start break: ${err.message}`);
        },
    });

    const endBreakMutation = useMutation({
        mutationFn: () => api.endBreak(accessToken!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            toast.success("Break ended!");
        },
        onError: (err: any) => {
            toast.error(`Failed to end break: ${err.message}`);
        },
    });

    const verifyLocationMutation = useMutation({
        mutationFn: (location: { latitude: number; longitude: number }) => api.verifyLocation(accessToken!, location.latitude, location.longitude),
        onSuccess: (data) => {
            toast.success(data.message);
            // Potentially update current session to reflect verified_location
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
        },
        onError: (err: any) => {
            toast.error(`Location verification failed: ${err.message}`);
        },
        onSettled: () => {
            setIsVerifyingLocation(false);
        }
    });

    const getUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            toast.error("Geolocation not supported.");
            return;
        }

        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                // Optionally verify location immediately after getting it
                // verifyLocationMutation.mutate({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            (error) => {
                setLocationError(error.message);
                toast.error(`Failed to get location: ${error.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Get location on component mount
    useState(() => {
        getUserLocation();
    });

    const handleClockIn = () => {
        if (currentLocation) {
            clockInMutation.mutate(currentLocation);
        } else {
            toast.error("Location not available. Please enable location services.");
            getUserLocation();
        }
    };

    const handleClockOut = () => {
        if (currentLocation) {
            clockOutMutation.mutate(currentLocation);
        } else {
            toast.error("Location not available. Please enable location services.");
            getUserLocation();
        }
    };

    const handleVerifyLocation = () => {
        if (currentLocation) {
            setIsVerifyingLocation(true);
            verifyLocationMutation.mutate(currentLocation);
        } else {
            toast.error("Location not available. Cannot verify.");
            getUserLocation();
        }
    };

    const isClockedIn = currentSession && !currentSession.clock_out_time;
    const isBreakActive = currentSession && currentSession.is_break && currentSession.break_start && !currentSession.break_end;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Time Clock</h1>
                    <p className="text-muted-foreground">Manage your clock-in, clock-out, and breaks.</p>
                </div>
            </div>

            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="text-xl">Current Status</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {isLoadingSession ? (
                        <div>Loading status...</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                Status:
                                <Badge variant={isClockedIn ? "default" : "secondary"}>
                                    {isClockedIn ? "Clocked In" : "Clocked Out"}
                                </Badge>
                                {isBreakActive && (
                                    <Badge variant="info">
                                        On Break
                                    </Badge>
                                )}
                            </div>
                            {currentSession && (
                                <p>Clock In Time: {format(new Date(currentSession.clock_in_time), "PPP p")}</p>
                            )}
                            {currentSession?.break_start && (
                                <p>Break Start Time: {format(new Date(currentSession.break_start), "PPP p")}</p>
                            )}
                            {locationError && (
                                <p className="text-destructive">Location Error: {locationError}</p>
                            )}
                            {currentLocation && (
                                <p className="text-muted-foreground text-sm">
                                    Current Location: Lat {currentLocation.latitude.toFixed(4)}, Lon {currentLocation.longitude.toFixed(4)}
                                    {!currentSession?.verified_location && (
                                        <span className="ml-2 text-orange-500">(Location not verified)</span>
                                    )}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="flex gap-4 mt-4">
                        {!isClockedIn ? (
                            <Button onClick={handleClockIn} disabled={clockInMutation.isPending || !currentLocation} className="bg-green-500 hover:bg-green-600">
                                {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                            </Button>
                        ) : (
                            <>
                                <Button onClick={handleClockOut} disabled={clockOutMutation.isPending || !currentLocation} className="bg-red-500 hover:bg-red-600">
                                    {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                                </Button>
                                {!isBreakActive ? (
                                    <Button onClick={() => startBreakMutation.mutate()} disabled={startBreakMutation.isPending} variant="outline">
                                        {startBreakMutation.isPending ? "Starting Break..." : "Start Break"}
                                    </Button>
                                ) : (
                                    <Button onClick={() => endBreakMutation.mutate()} disabled={endBreakMutation.isPending} variant="outline">
                                        {endBreakMutation.isPending ? "Ending Break..." : "End Break"}
                                    </Button>
                                )}
                                <Button onClick={handleVerifyLocation} disabled={isVerifyingLocation || !currentLocation} variant="secondary">
                                    {isVerifyingLocation ? "Verifying..." : "Verify Location"}
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="text-xl">Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div>Loading history...</div>
                    ) : (attendanceHistory && attendanceHistory.length > 0 ? (
                        <div className="space-y-4">
                            {attendanceHistory.map((event) => (
                                <Card key={event.id} className="p-4">
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium">{format(new Date(event.clock_in_time), "PPP")}</p>
                                        <Badge variant={event.clock_out_time ? "default" : "secondary"}>
                                            {event.clock_out_time ? "Completed" : "Ongoing"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Clock In: {format(new Date(event.clock_in_time), "p")}</p>
                                    {event.clock_out_time && (
                                        <p className="text-sm text-muted-foreground">Clock Out: {format(new Date(event.clock_out_time), "p")}</p>
                                    )}
                                    {event.is_break && event.break_start && (
                                        <p className="text-sm text-muted-foreground">Break: {format(new Date(event.break_start), "p")} - {event.break_end ? format(new Date(event.break_end), "p") : "Ongoing"}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                        Location Verified:
                                        {event.verified_location ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No attendance history available.</p>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

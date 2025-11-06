import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { format, parseISO, isValid } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

// Narrowing helper for verify-location response without using 'any'
type VerifyLocationResponse = { within_range: boolean; message?: string };
const hasWithinRange = (x: unknown): x is VerifyLocationResponse => {
    if (typeof x !== "object" || x === null) return false;
    const record = x as Record<string, unknown>;
    return typeof record.within_range === "boolean";
};

// Safe date formatting to prevent RangeError on invalid timestamps
const formatSafe = (value: string | Date | null | undefined, fmt: string): string => {
    if (!value) return "—";
    const d = typeof value === "string" ? parseISO(value) : value;
    return isValid(d) ? format(d as Date, fmt) : "—";
};

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

// Minimal Staff Dashboard shape used for gating by working hours
interface StaffDashboardData {
    todaysShift?: {
        id?: string;
        shift_type?: string;
        start_time?: string;
        end_time?: string;
        notes?: string;
        section?: string;
    };
    stats?: {
        hoursThisWeek?: number;
        shiftsThisWeek?: number;
        earningsThisWeek?: number;
    };
    restaurant_location?: { latitude?: number; longitude?: number; radius?: number };
    current_break_duration_minutes?: number;
}

export default function TimeClockPage() {
    const { accessToken, user } = useAuth();
    const queryClient = useQueryClient();
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
    const [canClockIn, setCanClockIn] = useState(false);
    const [lastVerificationMessage, setLastVerificationMessage] = useState<string | null>(null);
    const [geofence, setGeofence] = useState<{ latitude: number; longitude: number; radius: number } | null>(null);
    const [inRange, setInRange] = useState<boolean>(false);
    const [scheduleActive, setScheduleActive] = useState<boolean>(true); // default true; will refine if schedule available
    const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unsupported">("unsupported");
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    // Fetch restaurant location (supports both top-level and nested 'restaurant' payloads)
    interface RestaurantLocationPayload {
        latitude?: number;
        longitude?: number;
        radius?: number;
        geofence_radius?: number;
        restaurant?: {
            latitude?: number;
            longitude?: number;
            radius?: number;
            geofence_radius?: number;
        };
    }

    const { data: restaurantLoc } = useQuery<RestaurantLocationPayload | null>({
        queryKey: ["restaurantLocation", accessToken],
        queryFn: () => api.getRestaurantLocation(accessToken!),
        enabled: !!accessToken,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (!restaurantLoc) return;
        const payload = restaurantLoc.restaurant ?? restaurantLoc;
        const lat = payload.latitude;
        const lon = payload.longitude;
        const rad = (payload.geofence_radius ?? payload.radius ?? 100);
        if (typeof lat === "number" && typeof lon === "number") {
            setGeofence({ latitude: lat, longitude: lon, radius: Number(rad) });
        }
    }, [restaurantLoc]);

    // Live clock ticker
    useEffect(() => {
        const id = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Detect geolocation permission state where supported
    useEffect(() => {
        let mounted = true;
        const detect = async () => {
            try {
                if (!("permissions" in navigator) || !navigator.permissions) {
                    if (mounted) setPermissionState("unsupported");
                    return;
                }
                const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
                if (mounted) setPermissionState(status.state as "granted" | "denied" | "prompt");
                status.onchange = () => {
                    if (mounted) setPermissionState(status.state as "granted" | "denied" | "prompt");
                };
            } catch {
                if (mounted) setPermissionState("unsupported");
            }
        };
        detect();
        return () => {
            mounted = false;
        };
    }, []);

    // Optionally fetch today's shift to gate by valid working hours (if applicable)
    const { data: staffDashboard } = useQuery<StaffDashboardData | null>({
        queryKey: ["staffDashboardForClock", accessToken],
        queryFn: async (): Promise<StaffDashboardData | null> => {
            const resp = await fetch(`${API_BASE}/timeclock/staff-dashboard/`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
            });
            if (!resp.ok) return null;
            return resp.json();
        },
        enabled: !!accessToken,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        try {
            const shift = staffDashboard?.todaysShift;
            if (!shift?.start_time || !shift?.end_time) {
                setScheduleActive(true); // if no schedule data, allow clock-in by time
                return;
            }
            const now = new Date();
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            setScheduleActive(now >= start && now <= end);
        } catch {
            setScheduleActive(true);
        }
    }, [staffDashboard]);

    // Local Haversine to check in/out of range quickly
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // meters
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Fetch current session for clock-in/out status
    const { data: currentSession, isLoading: isLoadingSession } = useQuery<ClockEvent | null>({
        queryKey: ["currentSession", user?.id, accessToken],
        queryFn: () => api.getCurrentClockSession(accessToken!),
        enabled: !!accessToken && !!user?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });

    const { data: attendanceHistory, isLoading: isLoadingHistory } = useQuery<ClockEvent[]>({
        queryKey: ["attendanceHistory", user?.id, accessToken],
        queryFn: () => api.getAttendanceHistory(accessToken!),
        enabled: !!accessToken && !!user?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });

    const clockInMutation = useMutation({
        mutationFn: async (location: { latitude: number; longitude: number; accuracy?: number }) => {
            const verifyRes = await api.verifyLocation(accessToken!, location.latitude, location.longitude);
            const withinRange = hasWithinRange(verifyRes) ? verifyRes.within_range : true;
            if (!withinRange) {
                throw new Error("You must be within the restaurant geofence to clock in");
            }
            return api.webClockIn(accessToken!, location.latitude, location.longitude, location.accuracy);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            toast.success("Clocked in successfully!");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to clock in";
            toast.error(`Failed to clock in: ${message}`);
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (location: { latitude: number; longitude: number; accuracy?: number }) => api.webClockOut(accessToken!, location.latitude, location.longitude, location.accuracy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            toast.success("Clocked out successfully!");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to clock out";
            toast.error(`Failed to clock out: ${message}`);
        },
    });

    const startBreakMutation = useMutation({
        mutationFn: () => api.startBreak(accessToken!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            toast.success("Break started!");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to start break";
            toast.error(`Failed to start break: ${message}`);
        },
    });

    const endBreakMutation = useMutation({
        mutationFn: () => api.endBreak(accessToken!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            toast.success("Break ended!");
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to end break";
            toast.error(`Failed to end break: ${message}`);
        },
    });

    const verifyLocationMutation = useMutation<VerifyLocationResponse, unknown, { latitude: number; longitude: number }>({
        mutationFn: async (location) => {
            const res = await api.verifyLocation(accessToken!, location.latitude, location.longitude);
            const normalized: VerifyLocationResponse = hasWithinRange(res)
                ? { within_range: res.within_range, message: res.message }
                : { within_range: true, message: typeof (res as any)?.message === "string" ? (res as any).message : "Location verified" };
            return normalized;
        },
        onSuccess: (data) => {
            if (data.message) toast.success(data.message);
            // Potentially update current session to reflect verified_location
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Location verification failed";
            toast.error(`Location verification failed: ${message}`);
        },
        onSettled: () => {
            setIsVerifyingLocation(false);
        }
    });

    const geoErrorMessage = (error: GeolocationPositionError): string => {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return "Location permission denied. Please enable location access in your browser.";
            case error.POSITION_UNAVAILABLE:
                return "Position update is unavailable. Check GPS/location services and try again.";
            case error.TIMEOUT:
                return "Timed out while obtaining location. Move to an open area and retry.";
            default:
                return error.message || "Failed to get location.";
        }
    };

    const tryLowAccuracyLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                if (geofence) {
                    const d = haversineDistance(position.coords.latitude, position.coords.longitude, geofence.latitude, geofence.longitude);
                    const within = d <= geofence.radius;
                    setInRange(within);
                    setLastVerificationMessage(within ? "Within range" : "Outside work zone");
                }
                if (accessToken) {
                    setIsVerifyingLocation(true);
                    api
                        .verifyLocation(accessToken, position.coords.latitude, position.coords.longitude)
                        .then((res) => {
                            const withinRange = hasWithinRange(res) ? res.within_range : true;
                            setInRange(withinRange);
                            const message = hasWithinRange(res) && res.message ? res.message : withinRange ? "Within range" : "Outside work zone";
                            setLastVerificationMessage(message);
                            setLocationError(withinRange ? null : message);
                        })
                        .catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Location verification failed";
                            setLocationError(message);
                            setInRange(false);
                            setLastVerificationMessage(message);
                        })
                        .finally(() => setIsVerifyingLocation(false));
                }
            },
            (error) => {
                const msg = geoErrorMessage(error);
                setLocationError(msg);
                setInRange(false);
                setLastVerificationMessage(msg);
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
    };

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
                    accuracy: position.coords.accuracy,
                });
                // Compute quick geofence detection client-side
                if (geofence) {
                    const d = haversineDistance(position.coords.latitude, position.coords.longitude, geofence.latitude, geofence.longitude);
                    const within = d <= geofence.radius;
                    setInRange(within);
                    setLastVerificationMessage(within ? "Within range" : "Outside work zone");
                }
                // Verify via backend for authoritative check
                if (accessToken) {
                    setIsVerifyingLocation(true);
                    api
                        .verifyLocation(accessToken, position.coords.latitude, position.coords.longitude)
                        .then((res) => {
                            const withinRange = hasWithinRange(res) ? res.within_range : true;
                            setInRange(withinRange);
                            const message = hasWithinRange(res) && res.message ? res.message : withinRange ? "Within range" : "Outside work zone";
                            setLastVerificationMessage(message);
                            setLocationError(withinRange ? null : message);
                        })
                        .catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Location verification failed";
                            setLocationError(message);
                            setInRange(false);
                            setLastVerificationMessage(message);
                        })
                        .finally(() => setIsVerifyingLocation(false));
                }
            },
            (error) => {
                const msg = geoErrorMessage(error);
                setLocationError(msg);
                toast.error(`Failed to get location: ${msg}`);
                setInRange(false);
                setLastVerificationMessage(msg);
                // Fallback: attempt low-accuracy location with caching
                tryLowAccuracyLocation();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Get location on component mount and start watch for live updates
    useEffect(() => {
        getUserLocation();
        if (!("geolocation" in navigator)) return;
        let watchId: number | null = null;
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                if (geofence) {
                    const d = haversineDistance(position.coords.latitude, position.coords.longitude, geofence.latitude, geofence.longitude);
                    const within = d <= geofence.radius;
                    setInRange(within);
                    setLastVerificationMessage(within ? "Within range" : "Outside work zone");
                }
            },
            (error) => {
                const msg = geoErrorMessage(error);
                setLocationError(msg);
                setLastVerificationMessage(msg);
            },
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [geofence]);

    // Auto clock-out watcher: if outside geofence for consecutive readings
    useEffect(() => {
        const isClockedIn = !!currentSession && !currentSession?.clock_out_time;
        if (!isClockedIn || !accessToken) return;
        let outsideCount = 0;
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                try {
                    const verifyRes = await api.verifyLocation(accessToken!, latitude, longitude);
                    const withinRange = hasWithinRange(verifyRes) ? verifyRes.within_range : true;
                    if (!withinRange) {
                        outsideCount += 1;
                        if (outsideCount >= 2) {
                            clockOutMutation.mutate({ latitude, longitude, accuracy });
                            outsideCount = 0;
                        }
                    } else {
                        outsideCount = 0;
                    }
                } catch (e) {
                    // ignore verification errors
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [currentSession, accessToken]);

    const handleClockIn = () => {
        if (currentLocation) {
            clockInMutation.mutate(currentLocation);
            if (navigator.vibrate) navigator.vibrate(150);
        } else {
            toast.error("Location not available. Please enable location services.");
            getUserLocation();
        }
    };

    const handleClockOut = () => {
        if (currentLocation) {
            clockOutMutation.mutate(currentLocation);
            if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
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
    const readyToClockIn = inRange && scheduleActive && !isLoadingSession;

    // Helper component to recenter map when geofence changes
    const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
        const map = useMap();
        useEffect(() => {
            map.setView([lat, lng], 17);
        }, [lat, lng, map]);
        return null;
    };
    const isBreakActive = currentSession && currentSession.is_break && currentSession.break_start && !currentSession.break_end;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Time Clock</h1>
                    <p className="text-muted-foreground">Clock in when you’re at work.</p>
                </div>
            </div>

            {/* Split-screen: Live Map (Left) and Controls (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Map Section (50%) */}
                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle className="text-xl">Location Status</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {isLoadingSession ? (
                            <div>Loading status...</div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="rounded-2xl overflow-hidden border">
                                    <div className="relative h-64 w-full">
                                        <MapContainer center={[geofence?.latitude ?? currentLocation?.latitude ?? 0, geofence?.longitude ?? currentLocation?.longitude ?? 0]} zoom={geofence || currentLocation ? 17 : 2} className="h-full w-full">
                                            {geofence && <Recenter lat={geofence.latitude} lng={geofence.longitude} />}
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                            {/* Geofence circle */}
                                            {geofence && (
                                                <Circle center={[geofence.latitude, geofence.longitude]} radius={geofence.radius} pathOptions={{ color: inRange ? "#10b981" : "#ef4444", fillColor: inRange ? "#10b981" : "#ef4444", fillOpacity: 0.15 }} />
                                            )}
                                            {/* User location + accuracy halo */}
                                            {currentLocation && (
                                                <>
                                                    <CircleMarker center={[currentLocation.latitude, currentLocation.longitude]} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9 }} />
                                                    {typeof currentLocation.accuracy === "number" && currentLocation.accuracy > 0 && (
                                                        <Circle center={[currentLocation.latitude, currentLocation.longitude]} radius={currentLocation.accuracy} pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.1 }} />
                                                    )}
                                                </>
                                            )}
                                        </MapContainer>
                                        {/* Overlay status chip */}
                                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium shadow-md" style={{ background: inRange ? "#dcfce7" : "#fee2e2", color: inRange ? "#166534" : "#7f1d1d" }}>
                                            {geofence ? (inRange ? "Inside range" : "Outside range") : (currentLocation ? "GPS live" : "Waiting for GPS")}
                                        </div>
                                        {/* Permission / Retry controls */}
                                        {(!currentLocation || locationError) && (
                                            <div className="absolute bottom-3 left-3 right-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-white/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm">
                                                <span className="text-red-700">{locationError ?? (permissionState === "denied" ? "Location permission denied" : "Position update is unavailable")}</span>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={getUserLocation}>Retry</Button>
                                                    {permissionState === "denied" && (
                                                        <Button size="sm" onClick={() => toast.info("Please enable location in your browser settings and reload.")}>How to enable</Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="text-sm text-muted-foreground">{lastVerificationMessage ?? (inRange ? "Within range" : "Outside work zone")}</p>
                                        {locationError && (
                                            <p className="text-xs text-red-600 mt-1">{locationError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Control Section (50%) */}
                <Card className="shadow-soft flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl">Action</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="text-2xl font-semibold tracking-tight">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            {isClockedIn ? (
                                <p className="text-muted-foreground">You’re currently clocked in.</p>
                            ) : (
                                <p className="text-muted-foreground">Move into range during valid hours to enable clock-in.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Floating Clock In button — visible only when ready; mobile bottom-center, desktop bottom-right */}
            {!isClockedIn && readyToClockIn && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 z-50">
                    <Button
                        onClick={handleClockIn}
                        disabled={clockInMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold py-4 px-8 rounded-full shadow-lg"
                    >
                        {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                    </Button>
                </div>
            )}

            {/* History remains available for reference; layout is unaffected by split */}
            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="text-xl">Shift Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div>Loading history...</div>
                    ) : (attendanceHistory && attendanceHistory.length > 0 ? (
                        <div className="relative">
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted" />
                            <div className="space-y-4">
                                {attendanceHistory.map((event) => (
                                    <div key={event.id} className="pl-10 relative">
                                        <span className="absolute left-2 top-2 w-3 h-3 rounded-full bg-emerald-500" />
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium">{formatSafe(event.clock_in_time, "PPP")}</p>
                                            <Badge variant={event.clock_out_time ? "default" : "secondary"}>
                                                {event.clock_out_time ? "Completed" : "Ongoing"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Clock In: {formatSafe(event.clock_in_time, "p")}</p>
                                        {event.clock_out_time && (
                                            <p className="text-sm text-muted-foreground">Clock Out: {formatSafe(event.clock_out_time, "p")}</p>
                                        )}
                                        {event.is_break && event.break_start && (
                                            <p className="text-sm text-muted-foreground">Break: {formatSafe(event.break_start, "p")} - {event.break_end ? formatSafe(event.break_end, "p") : "Ongoing"}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                            Location Verified:
                                            {event.verified_location ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No attendance history available.</p>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

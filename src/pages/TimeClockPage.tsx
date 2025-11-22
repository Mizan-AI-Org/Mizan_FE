/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { format, parseISO, isValid } from "date-fns";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import ShiftReviewModal, { ShiftReviewPayload } from "@/components/ShiftReviewModal";
import { logError, logInfo } from "@/lib/logging";
import { enqueueClockPayloadSecure, dequeueAllSecure, initDeviceSecret } from "@/lib/offlineQueue";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";
const PRECISE_ACCURACY_M = 10;

// Narrowing helper for verify-location response without using 'any'
type VerifyLocationResponse = { within_range: boolean; message?: string };
const hasWithinRange = (x: unknown): x is VerifyLocationResponse => {
    if (typeof x !== "object" || x === null) return false;
    const record = x as Record<string, unknown>;
    return typeof record.within_range === "boolean";
};

// Safely extract a string message from unknown backend responses
const getMessageString = (x: unknown): string | undefined => {
    if (typeof x !== "object" || x === null) return undefined;
    const record = x as Record<string, unknown>;
    return typeof record.message === "string" ? (record.message as string) : undefined;
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
    const [cameraOpen, setCameraOpen] = useState<false | "in" | "out">(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [lastClockOutEvent, setLastClockOutEvent] = useState<ClockEvent | null>(null);
    // Reliable session id for submitting shift reviews
    const [sessionIdForReview, setSessionIdForReview] = useState<string>("");
    const [deviceSecret] = useState<string>(() => initDeviceSecret());
    const [timelineCollapsed, setTimelineCollapsed] = useState<boolean>(false);

    function TimelineToggle() {
        return (
            <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                aria-expanded={!timelineCollapsed}
                onClick={() => setTimelineCollapsed((v) => !v)}
            >
                {timelineCollapsed ? (
                    <span className="flex items-center"><ChevronDown className="mr-1 h-4 w-4" /> Expand</span>
                ) : (
                    <span className="flex items-center"><ChevronUp className="mr-1 h-4 w-4" /> Collapse</span>
                )}
            </Button>
        );
    }

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

    // Fetch current session for clock-in/out status (normalized shape)
    const { data: currentSession, isLoading: isLoadingSession } = useQuery<{ currentSession: ClockEvent | null; is_clocked_in: boolean }>({
        queryKey: ["currentSession", user?.id, accessToken],
        queryFn: () => api.getCurrentClockSession(accessToken!),
        enabled: !!accessToken && !!user?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });

    // Fetch only today's attendance history (used for daily hours calculation)
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: attendanceHistory, isLoading: isLoadingHistory } = useQuery<any[]>({
        queryKey: ["attendanceHistory", user?.id, accessToken, todayStr],
        queryFn: () => api.getAttendanceHistory(accessToken!, { start_date: todayStr, end_date: todayStr }),
        enabled: !!accessToken && !!user?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });

    const clockInMutation = useMutation({
        mutationFn: async (location: { latitude: number; longitude: number; accuracy?: number; photo?: string }) => {
            const verifyRes = await api.verifyLocation(accessToken!, location.latitude, location.longitude);
            const withinRange = hasWithinRange(verifyRes) ? verifyRes.within_range : true;
            if (!withinRange) {
                throw new Error("You must be within the restaurant geofence to clock in");
            }
            return api.webClockIn(accessToken!, location.latitude, location.longitude, location.accuracy, undefined, location.photo);
        },
        onSuccess: (data: any) => {
            // Capture session id from response shape: prefer event.id, then top-level session_id
            const sid: string | undefined = data?.event?.id || data?.session_id;
            if (typeof sid === "string" && sid.length > 0) {
                setSessionIdForReview(sid);
            }
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            toast.success("Clocked in successfully!");
            playSuccessTone();
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to clock in";
            toast.error(`Failed to clock in: ${message}`);
        },
    });

    const clockOutMutation = useMutation<{ message?: string; event?: ClockEvent; clock_out_time?: string }, unknown, { latitude?: number; longitude?: number; accuracy?: number; method?: "manual" | "automatic"; override?: boolean }>({
        mutationFn: (location: { latitude?: number; longitude?: number; accuracy?: number; method?: "manual" | "automatic"; override?: boolean } = {}) => {
            const lat = typeof location.latitude === "number" ? location.latitude : undefined;
            const lon = typeof location.longitude === "number" ? location.longitude : undefined;
            const acc = typeof location.accuracy === "number" ? location.accuracy : undefined;
            // Do not require location for clock-out; backend accepts optional coords
            return api.webClockOut(accessToken!, lat, lon, acc, { method: location.method, device_id: deviceSecret, override: location.override });
        },
        onSuccess: (data: { message?: string; event?: ClockEvent; clock_out_time?: string }) => {
            queryClient.invalidateQueries({ queryKey: ["currentSession"] });
            queryClient.invalidateQueries({ queryKey: ["attendanceHistory"] });
            const tsIso = data?.event?.clock_out_time || data?.clock_out_time;
            const ts = tsIso ? new Date(tsIso) : new Date();
            toast.success(`Clocked out at ${format(ts, "yyyy-MM-dd HH:mm")}`);
            playSuccessTone();
            // Open review modal with returned event details
            if (data?.event) {
                setLastClockOutEvent(data.event);
                if (data.event.id) setSessionIdForReview(data.event.id);
                setReviewOpen(true);
            } else {
                setReviewOpen(true);
            }
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to clock out";
            console.error("Clock out failed", { error: err });
            // Allow attempt anytime; if server reports no active session, inform without blocking
            if (message.includes("Not clocked in")) {
                toast.info("No active session to end. If incorrect, refresh and try again.");
                return;
            }
            if (message.includes("GPS accuracy too weak")) {
                toast.error("GPS too imprecise (>10m). Move to open area or enable precise GPS.");
                return;
            }
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
                : { within_range: false, message: getMessageString(res) ?? "Location verification unavailable" };
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

    const watchIdRef = useRef<number | null>(null);

    // Cleanup watcher on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    const startWatcher = (enableHighAccuracy: boolean) => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                console.warn("Watcher error", error);
                // If watcher fails, we don't necessarily want to kill the UI if we had a location.
                // But if it's a persistent failure, we might want to know.
                // For now, let's just log it. If the user moves and we lose track, 
                // the stale location might be an issue, but better than "Position unavailable" blocking everything.
            },
            { enableHighAccuracy, maximumAge: 5000, timeout: 20000 }
        );
    };

    // Check geofence whenever location or geofence changes
    useEffect(() => {
        if (currentLocation && geofence) {
            const d = haversineDistance(currentLocation.latitude, currentLocation.longitude, geofence.latitude, geofence.longitude);
            const within = d <= geofence.radius;
            setInRange(within);
            setLastVerificationMessage(within ? "Within range" : "Outside work zone");
        } else if (currentLocation && !geofence) {
            setLastVerificationMessage("GPS live");
        }
    }, [currentLocation, geofence]);

    const [locationSource, setLocationSource] = useState<"GPS (High Accuracy)" | "GPS (Low Accuracy)" | "IP (Approximate)" | null>(null);

    const tryLowAccuracyLocation = () => {
        console.log("Attempting low accuracy location...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Low accuracy location success");
                setLocationSource("GPS (Low Accuracy)");
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });

                // Start watching with low accuracy
                startWatcher(false);

                if (accessToken) {
                    setIsVerifyingLocation(true);
                    api
                        .verifyLocation(accessToken, position.coords.latitude, position.coords.longitude)
                        .then((res) => {
                            const withinRange = hasWithinRange(res) ? res.within_range : true;
                            // setInRange handled by useEffect
                            const message = hasWithinRange(res) && res.message ? res.message : withinRange ? "Within range" : "Outside work zone";
                            // setLastVerificationMessage handled by useEffect mostly, but backend message is authoritative
                            if (hasWithinRange(res) && res.message) setLastVerificationMessage(res.message);
                            setLocationError(withinRange ? null : message);
                        })
                        .catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Location verification failed";
                            setLocationError(message);
                            setLastVerificationMessage(message);
                        })
                        .finally(() => setIsVerifyingLocation(false));
                }
            },
            (error) => {
                console.warn("Low accuracy location failed", error);
                // If low accuracy fails, try IP location as last resort
                ipLocate();
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
    };

    // Last-resort approximate location via IP-based geolocation (CORS-safe)
    const ipLocate = async () => {
        // Clear watcher if we are falling back to IP
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        try {
            console.log("Attempting IP location...");
            const resp = await fetch("https://ipwho.is/", { mode: "cors", cache: "no-store" });
            if (!resp.ok) throw new Error("IP location unavailable");
            const data = await resp.json();
            const lat = Number(data?.latitude);
            const lon = Number(data?.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                console.log("IP location success");
                setLocationSource("IP (Approximate)");
                const approx = { latitude: lat, longitude: lon, accuracy: 5000 };
                setCurrentLocation(approx);

                setLastVerificationMessage("Approximate location detected via network");
                setLocationError(null);
                // Ask backend to authoritatively verify, which may allow clock-in
                if (accessToken) {
                    try {
                        setIsVerifyingLocation(true);
                        const res = await api.verifyLocation(accessToken, lat, lon);
                        const withinRange = hasWithinRange(res) ? res.within_range : true;
                        // setInRange handled by useEffect
                        const message = hasWithinRange(res) && res.message ? res.message : withinRange ? "Within range" : "Outside work zone";
                        if (hasWithinRange(res) && res.message) setLastVerificationMessage(res.message);
                        setLocationError(withinRange ? null : message);
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : "Location verification failed";
                        setLocationError(message);
                        setLastVerificationMessage(message);
                    } finally {
                        setIsVerifyingLocation(false);
                    }
                }
            } else {
                throw new Error("Invalid IP location data");
            }
        } catch (e) {
            console.debug("IP-based approximate geolocation failed", e);
            const msg = "Unable to determine location. Please enable Wi-Fi or GPS.";
            setLocationError(msg);
            setLastVerificationMessage(msg);
        }
    };

    const getUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            toast.error("Geolocation not supported.");
            // Try IP location if Geolocation API is missing
            ipLocate();
            return;
        }

        setLocationError(null);
        setLocationSource(null); // Reset source while fetching
        console.log("Attempting high accuracy location...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("High accuracy location success");
                setLocationSource("GPS (High Accuracy)");
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });

                // Start watching with high accuracy
                startWatcher(true);

                // Verify via backend for authoritative check
                if (accessToken) {
                    setIsVerifyingLocation(true);
                    api
                        .verifyLocation(accessToken, position.coords.latitude, position.coords.longitude)
                        .then((res) => {
                            const withinRange = hasWithinRange(res) ? res.within_range : true;
                            // setInRange handled by useEffect
                            const message = hasWithinRange(res) && res.message ? res.message : withinRange ? "Within range" : "Outside work zone";
                            if (hasWithinRange(res) && res.message) setLastVerificationMessage(res.message);
                            setLocationError(withinRange ? null : message);
                        })
                        .catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Location verification failed";
                            setLocationError(message);
                            setLastVerificationMessage(message);
                        })
                        .finally(() => setIsVerifyingLocation(false));
                }
            },
            (error) => {
                console.warn("High accuracy location failed", error);
                // Don't set error yet, try fallback first
                // Fallback: attempt low-accuracy location with caching
                tryLowAccuracyLocation();
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    // Get location on component mount
    useEffect(() => {
        getUserLocation();
    }, []);

    // Auto clock-out watcher: if outside geofence for consecutive readings
    useEffect(() => {
        const isClockedIn = currentSession?.is_clocked_in === true;
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
                            // If GPS is imprecise (>10m), clock out without location to avoid backend rejection
                            if (typeof accuracy === "number" && accuracy <= PRECISE_ACCURACY_M) {
                                clockOutMutation.mutate({ latitude, longitude, accuracy, method: "automatic" });
                            } else {
                                clockOutMutation.mutate({ method: "automatic" });
                            }
                            outsideCount = 0;
                        }
                    } else {
                        outsideCount = 0;
                    }
                } catch (e) {
                    // ignore verification errors
                }
            },
            () => { },
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [currentSession, accessToken]);

    const handleClockIn = () => {
        if (!currentLocation) {
            toast.error("Location not available. Please enable location services.");
            getUserLocation();
            return;
        }
        setCameraOpen("in");
    };

    const handleClockOut = () => {
        // Allow clock-out at any time; backend will decide if an event can be ended
        const acc = currentLocation?.accuracy;
        if (!currentLocation) {
            toast.info("Clocking out without location. Enable GPS for verification.");
            clockOutMutation.mutate({ method: "manual" });
            return;
        }
        if (typeof acc === "number" && acc <= PRECISE_ACCURACY_M) {
            clockOutMutation.mutate({ latitude: currentLocation.latitude, longitude: currentLocation.longitude, accuracy: acc, method: "manual" });
        } else {
            toast.info("GPS is imprecise (>10m). Clocking out without location.");
            clockOutMutation.mutate({ method: "manual" });
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

    const isClockedIn = currentSession?.is_clocked_in === true;
    // Allow clock-in when within geofence regardless of schedule window
    const readyToClockIn = inRange && !isLoadingSession;

    // Compute today's accumulated hours
    const todaysHours = (() => {
        const todayStr = formatSafe(new Date(), "yyyy-MM-dd");
        let totalMs = 0;
        (attendanceHistory || []).forEach((ev: any) => {
            const clockIn = ev.clock_in_time || ev.clock_in;
            const clockOut = ev.clock_out_time || ev.clock_out;
            const inDate = clockIn ? formatSafe(clockIn, "yyyy-MM-dd") : null;
            const outDate = clockOut ? formatSafe(clockOut, "yyyy-MM-dd") : null;
            if (inDate === todayStr || outDate === todayStr) {
                const start = clockIn ? new Date(clockIn).getTime() : NaN;
                const end = clockOut ? new Date(clockOut).getTime() : NaN;
                if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
                    totalMs += Math.max(0, end - start);
                }
            }
        });
        if (currentSession?.currentSession && currentSession.currentSession.clock_in_time && !currentSession.currentSession.clock_out_time) {
            const start = new Date(currentSession.currentSession.clock_in_time).getTime();
            totalMs += Math.max(0, Date.now() - start);
        }
        const hrs = Math.floor(totalMs / 3600000);
        const mins = Math.floor((totalMs % 3600000) / 60000);
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    })();

    // Audio feedback tone on success
    const playSuccessTone = () => {
        try {
            type AudioContextCtor = new () => AudioContext;
            const W = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
            const Ctx = W.AudioContext ?? W.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = 880;
            o.type = "sine";
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(0.001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
            o.start();
            o.stop(ctx.currentTime + 0.15);
        } catch {
            // ignore audio errors
        }
    };

    // Offline queue auto-sync when online
    useEffect(() => {
        const flush = async () => {
            if (!navigator.onLine || !accessToken) return;
            const items = await dequeueAllSecure(deviceSecret);
            for (const it of items) {
                try {
                    if (it.type === "clock_in") {
                        if (typeof it.latitude === "number" && typeof it.longitude === "number") {
                            await api.webClockIn(accessToken, it.latitude, it.longitude, typeof it.accuracy === "number" ? it.accuracy : undefined, undefined, it.photo);
                        } else {
                            // Missing coords; re-enqueue and skip
                            await enqueueClockPayloadSecure(it, deviceSecret);
                        }
                    } else {
                        if (typeof it.latitude === "number" && typeof it.longitude === "number") {
                            await api.webClockOut(accessToken, it.latitude, it.longitude, typeof it.accuracy === "number" ? it.accuracy : undefined);
                        } else {
                            await enqueueClockPayloadSecure(it, deviceSecret);
                        }
                    }
                } catch {
                    // re-enqueue on failure
                    await enqueueClockPayloadSecure(it, deviceSecret);
                }
            }
        };
        window.addEventListener("online", flush);
        flush();
        return () => window.removeEventListener("online", flush);
    }, [accessToken, deviceSecret]);

    // Camera photo capture handling
    const onPhotoCaptured = async (photoDataUrl: string) => {
        const employeeId = String(user?.id ?? "");
        const now = new Date();
        const timestampISO = now.toISOString();
        const dateStr = formatSafe(now, "yyyy-MM-dd");
        const coords = currentLocation ?? undefined;
        if (cameraOpen === "in") {
            if (navigator.onLine && accessToken && coords) {
                clockInMutation.mutate({ ...coords, photo: photoDataUrl });
            } else {
                await enqueueClockPayloadSecure({ type: "clock_in", employeeId, latitude: coords?.latitude, longitude: coords?.longitude, accuracy: coords?.accuracy, timestampISO, date: dateStr, photo: photoDataUrl }, deviceSecret);
                toast.info("Saved clock-in offline. Will sync when online.");
            }
        }
        setCameraOpen(false);
    };

    // Helper component to update map view dynamically
    const MapEffects = ({ geofence, currentLocation }: { geofence: any, currentLocation: any }) => {
        const map = useMap();

        useEffect(() => {
            if (!map) return;

            if (geofence && currentLocation) {
                // Create bounds that include both the geofence center and the user
                const bounds = [
                    [geofence.latitude, geofence.longitude],
                    [currentLocation.latitude, currentLocation.longitude]
                ] as [number, number][];

                // If user is very close to center, fitBounds might zoom too much, so we limit maxZoom
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
            } else if (geofence) {
                map.setView([geofence.latitude, geofence.longitude], 17);
            } else if (currentLocation) {
                map.setView([currentLocation.latitude, currentLocation.longitude], 17);
            }
        }, [geofence, currentLocation, map]);

        return null;
    };
    const isBreakActive = Boolean(currentSession?.currentSession && currentSession.currentSession.is_break && currentSession.currentSession.break_start && !currentSession.currentSession.break_end);

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
                                        <MapContainer center={[geofence?.latitude ?? currentLocation?.latitude ?? 0, geofence?.longitude ?? currentLocation?.longitude ?? 0]} zoom={geofence || currentLocation ? 17 : 2} className={`h-full w-full ${cameraOpen ? 'pointer-events-none' : ''}`}>
                                            <MapEffects geofence={geofence} currentLocation={currentLocation} />
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                            {/* Geofence circle */}
                                            {geofence && (
                                                <Circle center={[geofence.latitude, geofence.longitude]} radius={geofence.radius} pathOptions={{ color: inRange ? "#10b981" : "#ef4444", fillColor: inRange ? "#10b981" : "#ef4444", fillOpacity: 0.15 }} />
                                            )}
                                            {/* User location + accuracy halo */}
                                            {currentLocation && (
                                                <>
                                                    <CircleMarker
                                                        center={[currentLocation.latitude, currentLocation.longitude]}
                                                        radius={5}
                                                        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9, weight: 2, opacity: 0.8 }}
                                                    />
                                                    {typeof currentLocation.accuracy === "number" && currentLocation.accuracy > 0 && (
                                                        <Circle
                                                            center={[currentLocation.latitude, currentLocation.longitude]}
                                                            radius={currentLocation.accuracy}
                                                            pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.05, weight: 1 }}
                                                        />
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
                                        <p className="text-sm text-muted-foreground" aria-live="polite">{lastVerificationMessage ?? (inRange ? "Within range" : "Outside work zone")}</p>
                                        {locationSource && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Source: {locationSource}
                                                {currentLocation?.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
                                            </p>
                                        )}
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
                    <CardContent className="flex-1 flex flex-col items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="text-2xl font-semibold tracking-tight" aria-live="polite">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            {isClockedIn ? (
                                <p className="text-muted-foreground">You’re currently clocked in.</p>
                            ) : inRange ? (
                                <p className="text-muted-foreground">You’re within range. {scheduleActive ? "You can clock in." : "Outside scheduled hours — clock-in permitted."}</p>
                            ) : (
                                <p className="text-muted-foreground">Move into range to enable clock-in.</p>
                            )}
                            <div className="text-sm text-muted-foreground">Today’s hours: {todaysHours}</div>
                        </div>
                        {/* Responsive action buttons inside the card for stable layout */}
                        <div className="mt-4 w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                                onClick={handleClockIn}
                                disabled={isClockedIn || !readyToClockIn || clockInMutation.isPending}
                                aria-label="Clock In"
                                aria-busy={clockInMutation.isPending}
                                className="h-12 min-h-12 w-full px-6 transition-all duration-200 ease-out bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl shadow-lg"
                            >
                                {clockInMutation.isPending ? (
                                    <span className="flex items-center justify-center">
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Clocking In...
                                    </span>
                                ) : (
                                    "Clock In"
                                )}
                            </Button>
                            <Button
                                onClick={handleClockOut}
                                disabled={!isClockedIn || clockOutMutation.isPending}
                                aria-label="Clock Out"
                                aria-busy={clockOutMutation.isPending}
                                className="h-12 min-h-12 w-full px-6 transition-all duration-200 ease-out bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl shadow-lg"
                            >
                                {clockOutMutation.isPending ? (
                                    <span className="flex items-center justify-center">
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Clocking Out...
                                    </span>
                                ) : (
                                    "Clock Out"
                                )}
                            </Button>
                        </div>
                        {!readyToClockIn && !isClockedIn && (
                            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                                {inRange ? (scheduleActive ? "Loading status…" : "Outside scheduled hours. Clock-in is allowed.") : "Enter the work geofence to enable Clock In."}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Buttons moved into the Action card; remove floating overlays for stability */}

            {/* History remains available for reference; layout is unaffected by split */}
            <Card className="shadow-soft">
                <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-xl">Shift Timeline</CardTitle>
                    <TimelineToggle />
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div>Loading history...</div>
                    ) : (attendanceHistory && attendanceHistory.length > 0 ? (
                        <div className={`relative transition-all duration-200 ${timelineCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-80 overflow-y-auto pr-2'}`} aria-expanded={!timelineCollapsed}>
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted" />
                            <div className="space-y-4">
                                {([...attendanceHistory].sort((a: any, b: any) => {
                                    const aTime = new Date(a.clock_out_time ?? a.clock_in_time ?? a.clock_out ?? a.clock_in).getTime();
                                    const bTime = new Date(b.clock_out_time ?? b.clock_in_time ?? b.clock_out ?? b.clock_in).getTime();
                                    return bTime - aTime; // newest first
                                })).map((raw: any, idx: number) => {
                                    const clockIn = raw.clock_in_time || raw.clock_in;
                                    const clockOut = raw.clock_out_time || raw.clock_out;
                                    const verified = typeof raw.verified_location === "boolean" ? raw.verified_location : undefined;
                                    const isCompleted = Boolean(clockOut);
                                    const key = raw.id || `${raw.date || formatSafe(clockIn, "yyyy-MM-dd")}-${clockIn || idx}`;
                                    return (
                                        <div key={key} className="pl-10 relative">
                                            <span className="absolute left-2 top-2 w-3 h-3 rounded-full bg-emerald-500" />
                                            <div className="flex justify-between items-center">
                                                <p className="font-medium">{formatSafe(clockIn, "PPP")}</p>
                                                <Badge variant={isCompleted ? "default" : "secondary"}>
                                                    {isCompleted ? "Completed" : "Ongoing"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Clock In: {formatSafe(clockIn, "p")}</p>
                                            {clockOut && (
                                                <p className="text-sm text-muted-foreground">Clock Out: {formatSafe(clockOut, "p")}</p>
                                            )}
                                            {(() => {
                                                const startMs = clockIn ? new Date(clockIn).getTime() : NaN;
                                                const endMs = clockOut ? new Date(clockOut).getTime() : currentTime.getTime();
                                                if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;
                                                const totalMs = endMs - startMs;
                                                const hrs = Math.floor(totalMs / 3600000);
                                                const mins = Math.floor((totalMs % 3600000) / 60000);
                                                const label = clockOut ? "Duration" : "Duration (ongoing)";
                                                return (
                                                    <p className="text-sm text-muted-foreground">{label}: {String(hrs).padStart(2, "0")}:{String(mins).padStart(2, "0")}</p>
                                                );
                                            })()}
                                            {raw.is_break && raw.break_start && (
                                                <p className="text-sm text-muted-foreground">Break: {formatSafe(raw.break_start, "p")} - {raw.break_end ? formatSafe(raw.break_end, "p") : "Ongoing"}</p>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                                Location Verified:
                                                {verified === true ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : verified === false ? (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No attendance history available.</p>
                    ))}
                </CardContent>
            </Card>
            {/* Selfie capture only for clock-in */}
            <CameraCaptureModal open={cameraOpen === "in"} onClose={() => setCameraOpen(false)} onCaptured={onPhotoCaptured} />
            {/* Shift Review modal on clock-out */}
            {/** Derive sessionId for review: prefer stored sessionIdForReview, then current-session id, then lastClockOutEvent id */}
            {(() => {
                const activeSessionId = currentSession?.currentSession?.id;
                const endedSessionId = lastClockOutEvent?.id;
                const resolvedSessionId = sessionIdForReview || activeSessionId || endedSessionId || "";
                return (
                    <ShiftReviewModal
                        open={reviewOpen}
                        onOpenChange={setReviewOpen}
                        submitting={reviewSubmitting}
                        sessionId={resolvedSessionId}
                        completedAtISO={lastClockOutEvent?.clock_out_time || new Date().toISOString()}
                        hoursDecimal={(() => {
                            const inTime = lastClockOutEvent?.clock_in_time || currentSession?.currentSession?.clock_in_time;
                            const outTime = lastClockOutEvent?.clock_out_time || new Date().toISOString();
                            if (!inTime || !outTime) return undefined;
                            const start = new Date(inTime).getTime();
                            const end = new Date(outTime).getTime();
                            if (isNaN(start) || isNaN(end) || end <= start) return undefined;
                            return Number(((end - start) / 3600000).toFixed(2));
                        })()}
                        shiftTitle={(() => {
                            const r = user?.restaurant as unknown;
                            if (typeof r === "string") return r;
                            if (r && typeof r === "object") {
                                const name = (r as Record<string, unknown>)["name"];
                                if (typeof name === "string") return name;
                            }
                            return "Shift";
                        })()}
                        shiftTimeRange={(() => {
                            const inT = lastClockOutEvent?.clock_in_time || currentSession?.currentSession?.clock_in_time;
                            const outT = lastClockOutEvent?.clock_out_time || new Date().toISOString();
                            const day = inT ? formatSafe(inT, "EEE, MMM d") : formatSafe(new Date().toISOString(), "EEE, MMM d");
                            const range = `${formatSafe(inT, "p")} – ${formatSafe(outT, "p")}`;
                            return `${day} | ${range}`;
                        })()}
                        onSubmit={async (payload: ShiftReviewPayload) => {
                            try {
                                setReviewSubmitting(true);
                                const submission = {
                                    session_id: payload.session_id,
                                    rating: payload.rating,
                                    tags: payload.tags,
                                    comments: payload.comments,
                                    completed_at_iso: payload.completed_at_iso,
                                    hours_decimal: payload.hours_decimal,
                                };
                                const res = await api.submitShiftReview(accessToken!, submission as any);
                                toast.success("Shift feedback submitted");
                                logInfo({ feature: "shift-review", action: "submit" }, `id=${res?.id || "unknown"}`);
                                try {
                                    queryClient.invalidateQueries({ queryKey: ["shiftReviews"] });
                                    queryClient.invalidateQueries({ queryKey: ["shiftReviewStats"] });
                                } catch (err) {
                                    logInfo({ feature: "shift-review", action: "invalidate-queries" }, "handled");
                                }
                                try {
                                    const today = new Date();
                                    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
                                    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
                                    const list = await api.getShiftReviews(accessToken!, { date_from: start, date_to: end, staff_id: String(user?.id || "") } as any);
                                    const found = Array.isArray(list) && list.some((r: any) => String(r?.session_id || r?.shift_id || "") === String(payload.session_id));
                                    if (found) {
                                        toast.success("Feedback synced and visible to admins");
                                    } else {
                                        toast.message("Feedback saved; syncing to admin view shortly");
                                    }
                                } catch (err) {
                                    logError({ feature: "shift-review", action: "post-submit-verify" }, err as unknown);
                                }
                            } catch (e) {
                                logError({ feature: "shift-review", action: "submit-error" }, e as unknown);
                                const msg = (e as any)?.message || "Feedback submission failed";
                                toast.error(msg);
                            } finally {
                                setReviewSubmitting(false);
                            }
                        }}
                    />
                );
            })()}
        </div>
    );
}

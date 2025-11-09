import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { User } from '../contexts/AuthContext.types';
import { useQuery } from '@tanstack/react-query';
import { Clock, Calendar, Coffee, MapPin, Navigation, Wifi, WifiOff, PhoneCall } from 'lucide-react';
import CreateSwapRequest from '../components/CreateSwapRequest';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

// Calculate distance in meters between two coordinates using Haversine formula
const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
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

const StaffDashboard: React.FC = () => {
    const { user, logout } = useAuth() as { user: User | null; logout: () => void; };
    const [currentTime, setCurrentTime] = useState(new Date());
    const [locationError, setLocationError] = useState<string>('');
    const [isClocking, setIsClocking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [isOnBreak, setIsOnBreak] = useState(false); // New state for break status

    // Geolocation monitoring & gating
    const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
    const [distanceToWork, setDistanceToWork] = useState<number | null>(null);
    const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(false);
    const [gpsWeak, setGpsWeak] = useState<boolean>(false);
    const [scheduleActive, setScheduleActive] = useState<boolean>(false);
    const [accountGood, setAccountGood] = useState<boolean>(false);
    const [clockInReady, setClockInReady] = useState<boolean>(false);

    const testBackendConnection = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/me/`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            setConnectionStatus(response.ok ? 'connected' : 'disconnected');
        } catch (error) {
            setConnectionStatus('disconnected');
        }
    }, []);

    // Test backend connection on component mount
    useEffect(() => {
        testBackendConnection();
    }, [testBackendConnection]);

    // Fetch staff dashboard data
    const { data: staffData, isLoading, error, refetch } = useQuery({
        queryKey: ['staff-dashboard'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/timeclock/staff-dashboard/`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    throw new Error('Session expired');
                }
                throw new Error(`Failed to fetch dashboard: ${response.status}`);
            }

            return response.json();
        },
        retry: 3,
        retryDelay: 1000,
    });

    useEffect(() => {
        if (staffData) {
            setIsOnBreak(staffData.is_on_break);
        }
    }, [staffData]);

    // Derive account good standing from API response
    useEffect(() => {
        if (!staffData) return;
        const active = !!staffData.is_active;
        const goodStanding = (staffData.account_status?.toLowerCase?.() === 'good' || staffData.account_status === true);
        setAccountGood(active && goodStanding);
    }, [staffData]);

    // Fetch current session
    const { data: currentSession, refetch: refetchSession } = useQuery({
        queryKey: ['current-session'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/timeclock/current-session/`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch session');
            }

            return response.json();
        },
        refetchInterval: 30000,
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Watch device location continuously
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setLocationError('Geolocation is not supported by this browser');
            return;
        }

        let watchId: number | null = null;
        const startWatch = () => {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setDeviceLocation({ lat: latitude, lon: longitude, accuracy });
                    setGpsWeak(accuracy > 50); // weak if > 50m

                    // Compute distance if restaurant location known
                    const rl = staffData?.restaurant_location;
                    if (rl?.latitude && rl?.longitude) {
                        const dist = haversineDistance(latitude, longitude, rl.latitude, rl.longitude);
                        setDistanceToWork(dist);
                    } else {
                        setDistanceToWork(null);
                    }

                    // Verify geofence via backend for polygon/radius accuracy
                    try {
                        const resp = await fetch(`${API_BASE}/timeclock/verify-location/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                            },
                            credentials: 'include',
                            body: JSON.stringify({ latitude, longitude, accuracy }),
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            setIsWithinGeofence(!!data.within_range);
                        } else {
                            setIsWithinGeofence(false);
                        }
                    } catch {
                        setIsWithinGeofence(false);
                    }
                },
                (err) => {
                    let message = 'Failed to get location';
                    if (err.code === err.PERMISSION_DENIED) message = 'Location services disabled. Enable location to proceed.';
                    else if (err.code === err.POSITION_UNAVAILABLE) message = 'GPS signal weak or unavailable.';
                    else if (err.code === err.TIMEOUT) message = 'Location request timed out.';
                    setLocationError(message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 5000,
                }
            );
        };

        startWatch();
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [staffData]);

    // Determine if current time is within scheduled shift window
    useEffect(() => {
        const shift = staffData?.todaysShift;
        if (!shift) {
            setScheduleActive(false);
            return;
        }
        try {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            const now = currentTime;
            setScheduleActive(now >= start && now <= end);
        } catch {
            setScheduleActive(false);
        }
    }, [staffData, currentTime]);

    // Gate clock-in readiness
    useEffect(() => {
        setClockInReady(isWithinGeofence && scheduleActive && accountGood);
    }, [isWithinGeofence, scheduleActive, accountGood]);

    const getClockInDisableReason = (): string => {
        if (!accountGood) return 'Account not in good standing';
        if (!staffData?.todaysShift) return 'Schedule data unavailable';
        if (!scheduleActive) return 'Outside scheduled shift hours';
        if (locationError) return locationError;
        if (gpsWeak) return 'GPS signal weak';
        if (!isWithinGeofence) return 'Outside Work Zone';
        return 'Initializing...';
    };

    const getCurrentLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
            }

            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    let errorMessage = 'Failed to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please enable location services.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    const verifyLocation = async (latitude: number, longitude: number): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/timeclock/verify-location/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                    latitude,
                    longitude
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Location verification failed');
            }

            const data = await response.json();
            return data.within_range;
        } catch (error) {
            console.error('Location verification error:', error);
            throw error;
        }
    };

    const clockIn = async () => {
        setIsClocking(true);
        setLocationError('');

        try {
            // Get current location
            const position = await getCurrentLocation();
            const { latitude, longitude, accuracy } = position.coords;

            // Verify location is within restaurant premises
            const isWithinRange = await verifyLocation(latitude, longitude);

            if (!isWithinRange) {
                setLocationError('You must be within restaurant premises to clock in');
                setIsClocking(false);
                return;
            }

            // Perform clock in with location data
            const response = await fetch(`${API_BASE}/timeclock/web-clock-in/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                    latitude,
                    longitude,
                    accuracy
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Refetch data
                await refetch();
                await refetchSession();
            } else {
                throw new Error(data.message || data.error || 'Clock in failed');
            }
        } catch (error: unknown) {
            console.error('Clock in error:', error);
            setLocationError((error as Error).message || 'Failed to clock in');
        } finally {
            setIsClocking(false);
        }
    };

    const clockOut = async () => {
        setIsClocking(true);
        setLocationError('');

        try {
            // Get current location for clock out (optional but recommended)
            let locationData = {};
            try {
                const position = await getCurrentLocation();
                const { latitude, longitude, accuracy } = position.coords;
                locationData = { latitude, longitude, accuracy };
            } catch (locationError) {
                // Continue without location data for clock out
            }

            const response = await fetch(`${API_BASE}/timeclock/web-clock-out/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                credentials: 'include',
                body: JSON.stringify(locationData),
            });

            const data = await response.json();

            if (response.ok) {
                // Refetch data
                await refetch();
                await refetchSession();
            } else {
                throw new Error(data.message || data.error || 'Clock out failed');
            }
        } catch (error: unknown) {
            console.error('Clock out error:', error);
            const msg = (error as Error)?.message || 'Failed to clock out';
            if (msg.includes('Not clocked in')) {
                setLocationError('No active session to end. If incorrect, refresh and try again.');
            } else {
                setLocationError(msg);
            }
        } finally {
            setIsClocking(false);
        }
    };

    // Manual refresh button for cases of poor GPS signal
    const refreshLocation = async () => {
        try {
            const position = await getCurrentLocation();
            const { latitude, longitude, accuracy } = position.coords;
            setDeviceLocation({ lat: latitude, lon: longitude, accuracy });
            setGpsWeak(accuracy > 50);
            const rl = staffData?.restaurant_location;
            if (rl?.latitude && rl?.longitude) {
                const dist = haversineDistance(latitude, longitude, rl.latitude, rl.longitude);
                setDistanceToWork(dist);
            }
        } catch (error) {
            setLocationError((error as Error).message);
        }
    };

    const startBreak = async () => {
        setIsClocking(true);
        try {
            const response = await fetch(`${API_BASE}/timeclock/break/start/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                await refetch();
                await refetchSession();
                setIsOnBreak(true);
            } else {
                throw new Error(data.message || data.error || 'Failed to start break');
            }
        } catch (error: unknown) {
            console.error('Start break error:', error);
            setLocationError((error as Error).message || 'Failed to start break');
        } finally {
            setIsClocking(false);
        }
    };

    const endBreak = async () => {
        setIsClocking(true);
        try {
            const response = await fetch(`${API_BASE}/timeclock/break/end/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                await refetch();
                await refetchSession();
                setIsOnBreak(false);
            } else {
                throw new Error(data.message || data.error || 'Failed to end break');
            }
        } catch (error: unknown) {
            console.error('End break error:', error);
            setLocationError((error as Error).message || 'Failed to end break');
        } finally {
            setIsClocking(false);
        }
    };

    const requestLocationAccess = () => {
        getCurrentLocation().then(() => {
            setLocationError('');
        }).catch((error) => {
            setLocationError(error.message);
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <WifiOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    const isClockedIn = currentSession?.is_clocked_in || staffData?.currentSession;

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className={`p-4 rounded-lg ${connectionStatus === 'connected' ? 'bg-green-50 border border-green-200' :
                connectionStatus === 'disconnected' ? 'bg-red-50 border border-red-200' :
                    'bg-yellow-50 border border-yellow-200'
                }`}>
                <div className="flex items-center">
                    {connectionStatus === 'connected' ? (
                        <Wifi className="w-5 h-5 text-green-600 mr-2" />
                    ) : connectionStatus === 'disconnected' ? (
                        <WifiOff className="w-5 h-5 text-red-600 mr-2" />
                    ) : (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-2"></div>
                    )}
                    <span className={`text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-800' :
                        connectionStatus === 'disconnected' ? 'text-red-800' :
                            'text-yellow-800'
                        }`}>
                        {connectionStatus === 'connected' ? 'Connected to server' :
                            connectionStatus === 'disconnected' ? 'Disconnected from server' :
                                'Checking connection...'}
                    </span>
                </div>
            </div>

            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome back, {user?.first_name}!
                </h1>
                <p className="text-gray-600">
                    {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                    {currentTime.toLocaleTimeString('en-US')}
                </p>

                {/* Restaurant Location Info */}
                {staffData?.restaurant_location && (
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{user?.restaurant_data?.name}</span>
                    </div>
                )}
            </div>

            {/* Emergency Contacts */}
            {user?.profile?.emergency_contact_name && user?.profile?.emergency_contact_phone && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <PhoneCall className="w-5 h-5 mr-2" />
                        Emergency Contact
                    </h3>
                    <p className="text-gray-900 font-medium">{user.profile.emergency_contact_name}</p>
                    <a href={`tel:${user.profile.emergency_contact_phone}`} className="text-blue-600 hover:underline">
                        {user.profile.emergency_contact_phone}
                    </a>
                </div>
            )}

            {/* Location Error Banner */}
            {locationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <Navigation className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-red-700 text-sm">{locationError}</p>
                    </div>
                    {locationError.includes('denied') && (
                        <button
                            onClick={requestLocationAccess}
                            className="mt-2 text-sm text-red-600 underline hover:text-red-700"
                        >
                            Grant Location Access
                        </button>
                    )}
                </div>
            )}

            {/* Time Clock Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Time Clock
                    </h3>
                    <div className="space-y-4">
                        {isClockedIn ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="font-medium flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                                    Currently Clocked In
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Since: {new Date(
                                        currentSession?.currentSession?.clock_in ||
                                        staffData?.currentSession?.clock_in
                                    ).toLocaleTimeString()}
                                </p>
                                {currentSession?.currentSession?.duration_hours && (
                                    <p className="text-sm text-gray-600">
                                        Duration: {currentSession.currentSession.duration_hours} hours
                                    </p>
                                )}
                                {staffData?.current_break_duration_minutes > 0 && (
                                    <p className="text-sm text-gray-600">
                                        Current Break: {staffData.current_break_duration_minutes} minutes
                                    </p>
                                )}
                                <button
                                    onClick={clockOut}
                                    disabled={isClocking}
                                    className="mt-3 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isClocking ? 'Clocking Out...' : 'Clock Out'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-end">
                                    <button
                                        onClick={clockIn}
                                        disabled={isClocking || !clockInReady}
                                        title={clockInReady ? 'Ready to Clock In' : getClockInDisableReason()}
                                        className={`py-4 px-6 rounded-lg transition-colors font-bold text-lg shadow-md flex items-center ${clockInReady ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                                    >
                                    {isClocking ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Getting Location...
                                        </>
                                    ) : (
                                        <>
                                            <Navigation className="w-4 h-4 mr-2" />
                                            {clockInReady ? 'Ready to Clock In' : 'Outside Work Zone'}
                                        </>
                                    )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    {clockInReady ? 'All conditions met' : getClockInDisableReason()}
                                </p>
                                <button
                                    onClick={clockOut}
                                    disabled={isClocking}
                                    className="mt-3 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isClocking ? 'Clocking Out...' : 'Clock Out'}
                                </button>
                            </div>
                        )}
                        {isClockedIn && isOnBreak ? (
                            <button
                                onClick={endBreak}
                                disabled={isClocking}
                                className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isClocking ? 'Ending Break...' : 'End Break'}
                            </button>
                        ) : isClockedIn ? (
                            <button
                                onClick={startBreak}
                                disabled={isClocking}
                                className="mt-3 w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isClocking ? 'Starting Break...' : 'Start Break'}
                            </button>
                        ) : null}
                        <CreateSwapRequest onSuccess={refetch} />
                    </div>
                </div>

                {/* Today's Schedule */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Today's Schedule
                    </h3>
                    {staffData?.todaysShift ? (
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="font-medium">Shift:</span>
                                <span className="capitalize">{staffData.todaysShift.shift_type?.replace('_', ' ') || 'Regular'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Time:</span>
                                <span>
                                    {new Date(
                                        staffData.todaysShift.start_time
                                    ).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })} -
                                    {new Date(staffData.todaysShift.end_time).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            {staffData.todaysShift.section && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Section:</span>
                                    <span className="capitalize">{staffData.todaysShift.section}</span>
                                </div>
                            )}
                            {staffData.todaysShift.notes && (
                                <div>
                                    <span className="font-medium">Notes:</span>
                                    <p className="text-sm text-gray-600 mt-1">{staffData.todaysShift.notes}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No shift scheduled for today</p>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Coffee className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {staffData?.stats?.hoursThisWeek || 0}
                            </p>
                            <p className="text-sm text-gray-600">Hours This Week</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {staffData?.stats?.shiftsThisWeek || 0}
                            </p>
                            <p className="text-sm text-gray-600">Shifts This Week</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Clock className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                ${staffData?.stats?.earningsThisWeek || 0}
                            </p>
                            <p className="text-sm text-gray-600">Earnings This Week</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location & Readiness Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Navigation className="w-4 h-4 mr-2" />
                    Location & Readiness
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Distance to work: {distanceToWork !== null ? `${Math.round(distanceToWork)} m` : '—'}</li>
                    <li>• Geofence status: {isWithinGeofence ? 'Inside perimeter' : 'Outside perimeter'}</li>
                    <li>• GPS accuracy: {deviceLocation ? `${Math.round(deviceLocation.accuracy)} m${gpsWeak ? ' (weak)' : ''}` : '—'}</li>
                    <li>• Shift window: {scheduleActive ? 'Active now' : (staffData?.todaysShift ? 'Outside shift time' : 'No shift today')}</li>
                    <li>• Account status: {accountGood ? 'Good standing' : 'Restricted'}</li>
                </ul>
                <div className="mt-3">
                    <button onClick={refreshLocation} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                        Refresh Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase-config'; // Import the Firebase app instance
import { useAuth } from './use-auth'; // Assuming you have an AuthContext to get user info
import { toast } from 'sonner'; // For displaying notifications

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface PushNotificationHook {
    requestPermissionAndGetToken: () => Promise<void>;
    deleteToken: () => Promise<void>;
    currentDeviceToken: string | null;
    permissionGranted: boolean;
}

const usePushNotifications = (): PushNotificationHook => {
    const { user, logout } = useAuth();
    const [currentDeviceToken, setCurrentDeviceToken] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState<boolean>(Notification.permission === 'granted');

    const registerDeviceToken = useCallback(async (token: string) => {
        if (!user) return;

        try {
            const response = await fetch(`${API_BASE}/notifications/device-token/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                if (response.status === 401) logout();
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to register device token');
            }
            console.log('Device token registered successfully');
        } catch (error) {
            console.error('Error registering device token:', error);
            toast.error((error as Error).message || 'Failed to register device for push notifications.');
        }
    }, [user, logout]);

    const unregisterDeviceToken = useCallback(async (token: string) => {
        if (!user) return;

        try {
            const response = await fetch(`${API_BASE}/notifications/device-token/unregister/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                if (response.status === 401) logout();
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to unregister device token');
            }
            console.log('Device token unregistered successfully');
        } catch (error) {
            console.error('Error unregistering device token:', error);
            toast.error((error as Error).message || 'Failed to unregister device from push notifications.');
        }
    }, [user, logout]);

    const requestPermissionAndGetToken = useCallback(async () => {
        if (Notification.permission === 'granted') {
            setPermissionGranted(true);
            console.log('Notification permission already granted.');
        } else if (Notification.permission === 'denied') {
            setPermissionGranted(false);
            console.warn('Notification permission denied by user.');
            toast.warning('Notification permissions are blocked. Please enable them in your browser settings to receive push notifications.');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionGranted(permission === 'granted');

            if (permission === 'granted') {
                const messaging = getMessaging(app);
                const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
                if (token) {
                    setCurrentDeviceToken(token);
                    await registerDeviceToken(token);
                    console.log('FCM device token:', token);
                    toast.success('You will now receive push notifications.');
                } else {
                    console.warn('No FCM registration token available. Request permission to generate one.');
                    toast.info('Failed to get a push notification token. Please ensure your browser supports it.');
                }
            } else {
                console.warn('Notification permission not granted.');
                toast.warning('Push notification permission was not granted.');
            }
        } catch (error) {
            console.error('Error requesting notification permission or getting token:', error);
            toast.error('An error occurred while setting up push notifications.');
        }
    }, [registerDeviceToken]);

    const deleteToken = useCallback(async () => {
        if (currentDeviceToken) {
            const messaging = getMessaging(app);
            try {
                await unregisterDeviceToken(currentDeviceToken);
                // await deleteToken(messaging);
                setCurrentDeviceToken(null);
                console.log('FCM device token deleted.');
            } catch (error) {
                console.error('Error deleting FCM token:', error);
                toast.error('Failed to delete push notification token.');
            }
        }
    }, [currentDeviceToken, unregisterDeviceToken]);

    useEffect(() => {
        if (user && Notification.permission === 'granted') {
            // Attempt to get or refresh token when user logs in or app starts with granted permission
            requestPermissionAndGetToken();
        }

        // Handle incoming messages while the app is in the foreground
        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            toast.info(payload.notification.title || 'New Notification', {
                description: payload.notification.body,
                duration: 5000,
                action: {
                    label: 'View',
                    onClick: () => { /* Handle notification click, e.g., navigate to a specific page */ }
                }
            });
        });

        // Cleanup token on logout or component unmount
        return () => {
            unsubscribe();
            // No need to explicitly delete token here if it's handled by unregisterDeviceToken on logout
        };
    }, [user, requestPermissionAndGetToken]);

    return {
        requestPermissionAndGetToken,
        deleteToken,
        currentDeviceToken,
        permissionGranted,
    };
};

export default usePushNotifications;

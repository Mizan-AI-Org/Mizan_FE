import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Notification {
    id: string;
    recipient: string;
    message: string;
    created_at: string;
    is_read: boolean;
    notification_type: string;
}

interface WebSocketMessage {
    type: string;
    message: Notification;
}

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';
const WS_BASE = import.meta.env.VITE_REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export const useNotifications = () => {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch initial notifications
    const { data: notifications = [], refetch } = useQuery<Notification[]>({ // Ensure type matches backend
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/notifications/notifications/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            });

            if (!response.ok) {
                // Do not log the user out for notifications failures
                if (response.status === 401) return [];
                return [];
            }
            return response.json();
        },
        enabled: !!user, // Only fetch if user is logged in
    });

    // Mutation to mark a single notification as read
    const markAsReadMutation = useMutation<Notification, Error, string>({ // Adjust return type
        mutationFn: async (notificationId: string) => {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/notifications/notifications/${notificationId}/mark-read/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            });
            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        },
    });

    // Mutation to mark all notifications as read
    const markAllAsReadMutation = useMutation<void, Error>({ // Adjust return type
        mutationFn: async () => {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/notifications/notifications/mark-all-read/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            });
            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        },
    });

    const markAsRead = useCallback((notificationId: string) => {
        markAsReadMutation.mutate(notificationId);
    }, [markAsReadMutation]);

    const markAllAsRead = useCallback(() => {
        markAllAsReadMutation.mutate();
    }, [markAllAsReadMutation]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!user) {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!ws.current && token) {
            // Avoid double /ws in path; WS_BASE already ends with /ws
            ws.current = new WebSocket(`${WS_BASE}/notifications/?token=${token}`);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
            };

            ws.current.onmessage = (event) => {
                const data: WebSocketMessage = JSON.parse(event.data);
                if (data.type === 'notification_message') {
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setIsConnected(false);
            };

            ws.current.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);
                // Attempt to reconnect after a delay
                setTimeout(() => {
                    if (user) {
                        ws.current = null; // Clear existing WebSocket to force a new connection
                        refetch(); // Refetch notifications and re-establish WebSocket
                    }
                }, 5000);
            };
        }

        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [user, queryClient, refetch]);

    return {
        notifications: notifications.map(n => ({
            ...n,
            read: n.is_read, // Map backend 'is_read' to frontend 'read'
            timestamp: n.created_at, // Map backend 'created_at' to frontend 'timestamp'
            verb: n.notification_type.replace(/_/g, ' ').toLowerCase(), // Derive verb from type
            description: n.message, // Map backend 'message' to frontend 'description'
        })),
        unreadCount: notifications.filter(n => !n.is_read).length,
        isConnected,
        markAsRead,
        markAllAsRead,
    };
};

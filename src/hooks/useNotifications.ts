/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE, WS_BASE } from "@/lib/api";

interface Notification {
    id: string;
    recipient: string;
    message: string;
    created_at: string;
    is_read: boolean;
    notification_type: string;
    title?: string;
    attachments?: Array<{
        original_name?: string;
        url?: string;
        content_type?: string;
        size?: number;
        uploaded_at?: string;
    }>;
}

interface WebSocketMessage {
    type: string;
    message: Notification;
}

// WS_BASE imported from @/lib/api
const WS_ENABLED = String(import.meta.env.VITE_ENABLE_NOTIFICATIONS_WS || 'false').toLowerCase() === 'true';

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
            const response = await fetch(`${API_BASE}/notifications/`, {
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
            const data = await response.json();
            // Normalize possible response shapes to an array
            if (Array.isArray(data)) return data as Notification[];
            if (data && Array.isArray(data.results)) return data.results as Notification[];
            if (data && Array.isArray(data.notifications)) return data.notifications as Notification[];
            return [];
        },
        enabled: !!user, // Only fetch if user is logged in
    });

    // Mutation to mark a single notification as read
    const markAsReadMutation = useMutation<Notification, Error, string>({ // Adjust return type
        mutationFn: async (notificationId: string) => {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/notifications/${notificationId}/read/`, {
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
    const markAllAsReadMutation = useMutation<void, Error>({
        mutationFn: async () => {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/notifications/mark-all-read/`, {
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
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
            const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id]);
            queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old) => {
                const list = Array.isArray(old) ? old : (old && typeof old === 'object' && 'results' in old ? (old as { results: Notification[] }).results : []);
                return list.map((n) => ({ ...n, is_read: true }));
            });
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous != null) {
                queryClient.setQueryData(['notifications', user?.id], context.previous);
            }
        },
        onSettled: () => {
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
        if (!user?.id) {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            return;
        }

        if (!WS_ENABLED) {
            return;
        }

        const token = localStorage.getItem('access_token');

        const connectWs = () => {
            if (ws.current) return; // Already connected or connecting

            try {
                // Ensure unique connection per instance
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
                    console.warn('WebSocket warning:', error);
                    // Don't modify isConnected here, let onclose handle it
                };

                ws.current.onclose = () => {
                    console.log('WebSocket Disconnected');
                    setIsConnected(false);
                    ws.current = null;

                    // Attempt to reconnect after a delay
                    setTimeout(() => {
                        if (user?.id) {
                            connectWs();
                        }
                    }, 5000);
                };
            } catch (err) {
                console.error('WebSocket initialization failed:', err);
                setIsConnected(false);
                ws.current = null;
            }
        };

        connectWs();

        return () => {
            if (ws.current) {
                // Remove listener to prevent reconnect attempt on unmount
                ws.current.onclose = null;
                ws.current.close();
                ws.current = null;
            }
        };
        // Use user.id to prevent re-running on user object identity change
    }, [user?.id, queryClient]);


    // Ensure notifications is an array before mapping to prevent runtime errors
    const normalized = Array.isArray(notifications) ? notifications : [];

    return {
        notifications: normalized.map(n => ({
            ...n,
            read: n.is_read, // Map backend 'is_read' to frontend 'read'
            timestamp: n.created_at, // Map backend 'created_at' to frontend 'timestamp'
            verb: (n.notification_type || '').replace(/_/g, ' ').toLowerCase(), // Derive verb from type safely
            description: n.message, // Map backend 'message' to frontend 'description'
            title: (n as any).title,
            attachments: (n as any).attachments || [],
        })),
        unreadCount: normalized.filter(n => !n.is_read).length,
        isConnected,
        markAsRead,
        markAllAsRead,
    };
};

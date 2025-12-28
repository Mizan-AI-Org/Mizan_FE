import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellRing, CheckCircle, AlertTriangle, Calendar, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '../../hooks/use-media-query';
import { API_BASE } from "@/lib/api";


interface Notification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  // Optional fields if backend provides them later
  title?: string;
  type?: 'task' | 'checklist' | 'concern' | 'recognition' | 'schedule';
  priority?: 'low' | 'medium' | 'high';
}

const SafetyNotifications: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Fetch notifications from the API
  const { data: notifications = [], isLoading, error, refetch } = useQuery<Notification[]>({
    queryKey: ['safety-notifications'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      // If no token, treat as no notifications instead of showing an error
      if (!token) {
        return [];
      }
      const response = await fetch(`${API_BASE}/staff/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      // Gracefully handle auth errors by returning empty list
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return; // No-op if not authenticated
      const response = await fetch(`${API_BASE}/staff/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      // Refetch notifications to update the UI
      refetch();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return; // No-op if not authenticated
      const response = await fetch(`${API_BASE}/staff/notifications/mark_all_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      // Refetch notifications to update the UI
      refetch();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'task':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'checklist':
        return <ClipboardCheck className="h-4 w-4 text-purple-500" />;
      case 'concern':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'recognition':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const NotificationList = () => (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading notifications...
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Failed to load notifications</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No notifications
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors ${!notification.is_read ? 'bg-muted/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type || 'schedule')}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{notification.title || 'Notification'}</p>
                          <Badge variant="outline" className={`text-xs ${getPriorityClass(notification.priority || 'medium')}`}>
                            {notification.priority || 'medium'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
              <BellRing className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <NotificationList />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="relative">
          <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative">
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
            <BellRing className="h-5 w-5" />
          </Button>
          {isOpen && (
            <Card className="absolute right-0 mt-2 w-80 z-50 shadow-lg">
              <CardContent className="p-4">
                <NotificationList />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
};

export default SafetyNotifications;
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellRing, CheckCircle, AlertTriangle, Calendar, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '../../hooks/use-media-query';

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'task' | 'checklist' | 'concern' | 'recognition';
  status: 'unread' | 'read';
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

// Mock data for notifications
const mockNotifications: Notification[] = [
  {
    id: 1,
    title: 'New Safety Task Assigned',
    message: 'You have been assigned a new safety task: "Kitchen Equipment Inspection"',
    type: 'task',
    status: 'unread',
    created_at: new Date().toISOString(),
    priority: 'high'
  },
  {
    id: 2,
    title: 'Safety Checklist Due Today',
    message: 'Daily opening safety checklist needs to be completed before 10:00 AM',
    type: 'checklist',
    status: 'unread',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    priority: 'medium'
  },
  {
    id: 3,
    title: 'Safety Concern Reported',
    message: 'A new safety concern has been reported regarding the back entrance door',
    type: 'concern',
    status: 'read',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    priority: 'high'
  },
  {
    id: 4,
    title: 'Safety Recognition',
    message: 'You received recognition for following safety protocols during the busy weekend shift',
    type: 'recognition',
    status: 'read',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    priority: 'low'
  }
];

const SafetyNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // In a real implementation, we would fetch notifications from the API
  // const { data: notifications = [] } = useQuery<Notification[]>({
  //   queryKey: ['safety-notifications'],
  //   queryFn: async () => {
  //     const response = await fetch(`${API_BASE}/staff/safety-notifications/`, {
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  //       },
  //     });
  //     if (!response.ok) throw new Error('Failed to fetch notifications');
  //     return response.json();
  //   },
  // });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, status: 'read' } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, status: 'read' }))
    );
  };

  const getNotificationIcon = (type: string) => {
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

  const getPriorityClass = (priority: string) => {
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
      {notifications.length === 0 ? (
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
                  className={`cursor-pointer transition-colors ${notification.status === 'unread' ? 'bg-muted/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <Badge variant="outline" className={`text-xs ${getPriorityClass(notification.priority)}`}>
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                      {notification.status === 'unread' && (
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
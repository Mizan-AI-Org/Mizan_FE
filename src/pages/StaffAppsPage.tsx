import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock,
  Calendar,
  Shield,
  MessageSquare,
  ClipboardList,
  Users,
  ChefHat,
  FileText,
} from "lucide-react";

type LayoutContext = { query: string };

type AppItem = {
  key: string;
  name: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  roles?: string[]; // if provided, restrict access
  external?: boolean; // links outside staff route
  category: 'Operations' | 'Communication' | 'Safety' | 'Management';
};

const StaffAppsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { query } = useOutletContext<LayoutContext>();
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const apps: AppItem[] = useMemo(() => [
    { key: 'time', name: 'Time Tracking', description: 'Clock in/out and breaks', icon: Clock, href: '/timeclock', roles: ['SUPER_ADMIN','ADMIN','CHEF','WAITER','CLEANER','CASHIER'], external: true, category: 'Operations' },
    { key: 'schedule', name: 'My Schedule', description: 'View weekly shifts', icon: Calendar, href: '/staff-dashboard/schedule', category: 'Operations' },
    { key: 'kitchen', name: 'Kitchen Display', description: 'Orders view', icon: ChefHat, href: '/staff-dashboard/kitchen', roles: ['SUPER_ADMIN','ADMIN','CHEF'], category: 'Operations' },
    { key: 'chat', name: 'Team Chat', description: 'Team messaging', icon: MessageSquare, href: '/staff-dashboard/chat', category: 'Communication' },
    { key: 'cleaning', name: 'Cleaning Tasks', description: 'Assigned tasks', icon: ClipboardList, href: '/staff-dashboard/cleaning-tasks', roles: ['CLEANER'], category: 'Operations' },
    { key: 'safety', name: 'Safety Center', description: 'Checklist & reports', icon: Shield, href: '/staff-dashboard/safety', category: 'Safety' },
    { key: 'attendance', name: 'Attendance', description: 'History & records', icon: FileText, href: '/staff-dashboard/attendance', category: 'Management' },
    { key: 'supervisor', name: 'Supervisor Tools', description: 'Manager tools', icon: Users, href: '/supervisor', roles: ['SUPER_ADMIN','ADMIN','MANAGER'], external: true, category: 'Management' },
  ], []);

  // Per-app icon colors to match reference design
  const iconStyles: Record<string, { bg: string; color: string }> = {
    time: { bg: '#E8F5E9', color: '#00C853' },
    schedule: { bg: '#E3F2FD', color: '#2196F3' },
    kitchen: { bg: '#FFF3E0', color: '#FB8C00' },
    chat: { bg: '#F3E5F5', color: '#8E24AA' },
    cleaning: { bg: '#E0F2F1', color: '#26A69A' },
    safety: { bg: '#FFEBEE', color: '#E53935' },
    attendance: { bg: '#E8EAF6', color: '#3F51B5' },
    supervisor: { bg: '#FFF3E0', color: '#F57C00' },
  };

  const categories = ['All', 'Operations', 'Communication', 'Safety', 'Management'] as const;
  type Category = typeof categories[number];
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchFiltered = q
      ? apps.filter(a => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q))
      : apps;
    const categoryFiltered = activeCategory === 'All' ? searchFiltered : searchFiltered.filter(a => a.category === activeCategory);
    return categoryFiltered;
  }, [apps, query, activeCategory]);

  const canAccess = (item: AppItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(user?.role ?? '');
  };

  const onOpen = async (item: AppItem) => {
    if (!canAccess(item)) {
      toast({ title: 'Access denied', description: 'You do not have permissions to open this application.', variant: 'destructive' });
      return;
    }
    try {
      setIsNavigating(item.key);
      // Simulate loading state for UX; navigation itself is synchronous
      setTimeout(() => {
        if (item.external) {
          navigate(item.href);
        } else {
          navigate(item.href);
        }
        setIsNavigating(null);
      }, 150);
    } catch (err) {
      setIsNavigating(null);
      toast({ title: 'Navigation error', description: 'Failed to open the application. Please try again.' });
    }
  };

  // Format date like "Wednesday, October 29, 2025"
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  }, []);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Welcome back, {user?.first_name ?? 'User'}!</h1>
          <p className="text-sm text-[#607D8B]">{formattedDate}</p>
        </div>
        <Badge
          className="rounded-full px-3 py-1 text-xs"
          style={{ backgroundColor: navigator.onLine ? '#E8F5E9' : '#FFEBEE', color: navigator.onLine ? '#00C853' : '#C62828' }}
          aria-live="polite"
          aria-label={navigator.onLine ? 'Online' : 'Offline'}
        >
          {navigator.onLine ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Responsive grid: 2–4 per row depending on size */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((item) => {
          const Icon = item.icon;
          const disabled = !canAccess(item);
          const isActive = isNavigating === item.key;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onOpen(item)}
                  disabled={disabled}
                  aria-label={item.name}
                  className={`group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-transform active:scale-95 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Card className={`relative p-4 h-full transition-all rounded-xl border hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 ${isActive ? 'ring-2 ring-primary' : ''}`}>
                    {/* Online dot indicator */}
                    {!disabled && (
                      <span className="absolute top-3 right-3 inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#00C853' }} aria-hidden="true"></span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconStyles[item.key]?.bg }}>
                        <Icon className="w-5 h-5" style={{ color: iconStyles[item.key]?.color }} aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{disabled ? 'Not available for your role' : 'Open application'}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default StaffAppsPage;
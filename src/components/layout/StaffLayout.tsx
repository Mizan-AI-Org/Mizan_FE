import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/use-auth';
import { Clock, Calendar, LogOut, User, ShoppingCart, UtensilsCrossed, LayoutDashboard, MessageSquare, Shield } from "lucide-react";
import SafetyNotifications from "@/components/safety/SafetyNotifications";

const StaffLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: "Dashboard", href: "/staff-dashboard", icon: User },
        {
            name: "Time Tracking",
            href: "/staff-dashboard/time-tracking",
            icon: Clock,
        },
        { name: "Schedule", href: "/staff-dashboard/schedule", icon: Calendar },
        { name: "Safety", href: "/staff-dashboard/safety", icon: Shield },
        { name: "Chat", href: "/staff-dashboard/chat", icon: MessageSquare },
    ];

    if (user?.role === 'CLEANER') {
        navigation.push({ name: "Cleaning Tasks", href: "/staff-dashboard/cleaning-tasks", icon: UtensilsCrossed });
    }

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        navigation.push({ name: "Supervisor", href: "/staff-dashboard/supervisor", icon: LayoutDashboard });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-sm">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">
                                Mizan Staff
                            </h1>
                            <p className="text-sm text-gray-500">
                                {user?.restaurant_data?.name}
                            </p>
                        </div>
                        <div>
                            <SafetyNotifications />
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info and logout */}
                    <div className="p-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                    {user?.role?.toLowerCase().replace("_", " ")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="pl-64">
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default StaffLayout;

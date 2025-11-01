import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/use-auth';
import { Clock, Calendar, LogOut, User, ShoppingCart, UtensilsCrossed, LayoutDashboard, MessageSquare, Shield, Menu, X } from "lucide-react";
import SafetyNotifications from "@/components/safety/SafetyNotifications";
import BackLink from "@/components/BackLink";
import BrandLogo from "@/components/BrandLogo";

const StaffLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        {/* Mobile menu button */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                        <BrandLogo size="sm" />
                        <h1 className="text-lg font-semibold text-gray-900 select-none cursor-default">
                            Mizan Staff
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-sm transform transition-transform duration-300 ease-in-out z-50 ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <BrandLogo size="sm" />
                            <h1 className="text-lg font-semibold text-gray-900 select-none cursor-default">
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
                                    onClick={() => setIsMobileMenuOpen(false)}
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
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">
                                        {user?.first_name} {user?.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{user?.role}</p>
                                </div>
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
            <div className="lg:pl-64 pt-16 lg:pt-0">
                <main className="p-4 sm:p-6">
                    {location.pathname !== '/staff-dashboard' && (
                        <div className="mb-2">
                            <BackLink fallbackPath="/staff-dashboard">Back to Dashboard</BackLink>
                        </div>
                    )}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default StaffLayout;

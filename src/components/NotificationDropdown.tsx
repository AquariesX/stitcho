"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    Check,
    CheckCheck,
    User,
    Scissors,
    Store,
    ShoppingBag,
    Package,
    AlertTriangle,
    Settings,
    Clock,
    Trash2,
    X,
    ChevronDown,
} from "lucide-react";
import {
    getNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    type SerializedNotification,
} from "@/app/actions/notification-actions";

const POLL_INTERVAL = 8000; // Poll every 8 seconds for new notifications

// Icon & color mapping per notification type
const typeConfig: Record<
    string,
    { icon: React.ReactNode; bgColor: string; iconColor: string; accentColor: string }
> = {
    TAILOR_SIGNUP: {
        icon: <Scissors size={16} />,
        bgColor: "bg-violet-50",
        iconColor: "text-violet-600",
        accentColor: "border-l-violet-500",
    },
    CUSTOMER_SIGNUP: {
        icon: <User size={16} />,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        accentColor: "border-l-blue-500",
    },
    PROFILE_UPDATE: {
        icon: <Settings size={16} />,
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
        accentColor: "border-l-amber-500",
    },
    SHOP_UPDATE: {
        icon: <Store size={16} />,
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-600",
        accentColor: "border-l-emerald-500",
    },
    ORDER_STATUS: {
        icon: <ShoppingBag size={16} />,
        bgColor: "bg-indigo-50",
        iconColor: "text-indigo-600",
        accentColor: "border-l-indigo-500",
    },
    INVENTORY_ALERT: {
        icon: <Package size={16} />,
        bgColor: "bg-red-50",
        iconColor: "text-red-600",
        accentColor: "border-l-red-500",
    },
    SYSTEM: {
        icon: <AlertTriangle size={16} />,
        bgColor: "bg-gray-50",
        iconColor: "text-gray-600",
        accentColor: "border-l-gray-500",
    },
};

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 30) return "Just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<SerializedNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [animateBell, setAnimateBell] = useState(false);
    const prevUnreadRef = useRef(0);

    // Fetch unread count (lightweight polling)
    const fetchUnreadCount = useCallback(async () => {
        try {
            const result = await getUnreadCount();
            if (result.success) {
                // Trigger bell animation if new notifications arrived
                if (result.count > prevUnreadRef.current && prevUnreadRef.current >= 0) {
                    setAnimateBell(true);
                    setTimeout(() => setAnimateBell(false), 1000);
                }
                prevUnreadRef.current = result.count;
                setUnreadCount(result.count);
            }
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    }, []);

    // Fetch full notifications list
    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getNotifications(showAll ? 50 : 15);
            if (result.success && result.data) {
                setNotifications(result.data);
                setUnreadCount(result.unreadCount ?? 0);
                prevUnreadRef.current = result.unreadCount ?? 0;
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setIsLoading(false);
        }
    }, [showAll]);

    // Initial load & polling
    useEffect(() => {
        fetchUnreadCount();

        pollingRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [fetchUnreadCount]);

    // When dropdown opens, fetch full list
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: number) => {
        await markNotificationAsRead(id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-[#223943] hover:text-white transition-colors relative"
            >
                <motion.div
                    animate={animateBell ? {
                        rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                        transition: { duration: 0.6 }
                    } : {}}
                >
                    <Bell size={20} />
                </motion.div>

                {/* Unread Badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                        className="absolute right-0 top-full mt-3 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 origin-top-right overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 bg-gradient-to-r from-[#223943] to-[#2c4a57] text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell size={18} className="opacity-80" />
                                    <h3 className="font-bold text-lg">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                            {isLoading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-[#223943] border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-sm text-gray-500">Loading notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                                        <Bell size={28} className="text-gray-300" />
                                    </div>
                                    <p className="font-semibold text-gray-700 text-sm">No notifications yet</p>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        You&apos;ll see notifications for new signups, profile changes, and order updates here.
                                    </p>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {notifications.map((notification, index) => {
                                        const config = typeConfig[notification.type] || typeConfig.SYSTEM;
                                        return (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                onClick={() => {
                                                    if (!notification.isRead) {
                                                        handleMarkAsRead(notification.id);
                                                    }
                                                }}
                                                className={`
                                                    px-4 py-3 mx-2 my-1 rounded-xl cursor-pointer transition-all duration-200
                                                    border-l-[3px] ${config.accentColor}
                                                    ${notification.isRead
                                                        ? "bg-white hover:bg-gray-50/80"
                                                        : "bg-blue-50/40 hover:bg-blue-50/70"
                                                    }
                                                `}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-9 h-9 rounded-xl ${config.bgColor} flex items-center justify-center ${config.iconColor} shrink-0 mt-0.5`}>
                                                        {config.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm leading-tight ${notification.isRead ? "text-gray-700" : "text-gray-900 font-semibold"}`}>
                                                                {notification.title}
                                                            </p>
                                                            {!notification.isRead && (
                                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                            {notification.message}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            <Clock size={10} className="text-gray-400" />
                                                            <p className="text-[10px] text-gray-400 font-medium">
                                                                {getRelativeTime(notification.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        setShowAll(!showAll);
                                    }}
                                    className="flex items-center gap-1 text-xs font-semibold text-[#223943] hover:text-[#2c4a57] transition-colors"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
                                    {showAll ? "Show less" : "Show all notifications"}
                                </button>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#223943] transition-colors"
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

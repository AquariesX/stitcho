"use client";

import React, { useState } from "react";
import { Bell, LogOut, Search, Menu, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
    const { logout, user, role } = useAuth();
    const router = useRouter();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login"); // Redirect to login page
    };

    return (
        <header className="sticky top-0 z-20 px-6 py-4 bg-[#F3F4F6]/80 backdrop-blur-md">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-2xl shadow-sm border border-white/50 px-6 py-3 flex items-center justify-between"
            >
                {/* Left Section: Welcome / Title */}
                <div className="flex items-center gap-4">
                    {/* Mobile menu trigger could go here if we moved it from Sidebar, 
                         but Sidebar handles its own mobile trigger for now. 
                         We can add a welcome message instead. */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Dashboard
                        </h2>
                        <p className="text-xs text-gray-500 hidden md:block">
                            Welcome back, <span className="font-semibold text-[#223943]">{user?.name}</span>
                        </p>
                    </div>
                </div>

                {/* Center Section: Search Bar */}
                <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
                    <div className={`
                        flex items-center w-full bg-gray-50 rounded-xl border transition-all duration-300
                        ${isSearchFocused ? 'border-[#223943] ring-2 ring-[#223943]/10 bg-white' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <Search size={18} className="ml-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders, customers..."
                            className="w-full bg-transparent px-4 py-2.5 outline-none text-sm text-gray-700 placeholder-gray-400"
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-3">
                    {/* Notification Bell */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-[#223943] hover:text-white transition-colors relative"
                        >
                            <Bell size={20} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </motion.button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 origin-top-right"
                                >
                                    <h3 className="font-semibold text-gray-800 mb-3">Notifications</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mt-1">
                                                <Bell size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">New Order Received</p>
                                                <p className="text-xs text-gray-500">2 minutes ago</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500 mt-1">
                                                <UserIcon size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">New Customer: Ali Khan</p>
                                                <p className="text-xs text-gray-500">1 hour ago</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                                        <button className="text-xs font-semibold text-[#223943] hover:underline">Mark all as read</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Logout Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-medium text-sm border border-red-100"
                    >
                        <LogOut size={18} />
                        <span className="hidden md:inline">Logout</span>
                    </motion.button>
                </div>
            </motion.div>
        </header>
    );
}

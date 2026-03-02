"use client";

import React, { useState } from "react";
import { LogOut, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Header() {
    const { logout, user, role } = useAuth();
    const router = useRouter();
    const [isSearchFocused, setIsSearchFocused] = useState(false);

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
                    {/* Notification Dropdown */}
                    <NotificationDropdown />

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

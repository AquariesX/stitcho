"use client";

import React, { useState, useEffect } from "react";
import { LogOut, Search, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Header() {
    const { logout, user, role } = useAuth();
    const router = useRouter();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        if (document.documentElement.classList.contains("dark")) {
            setTheme("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        if (newTheme === "dark") {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
        }
        localStorage.setItem("theme", newTheme);
        setTheme(newTheme);
    };

    const handleLogout = () => {
        logout();
        router.push("/login"); // Redirect to login page
    };

    return (
        <header className="sticky top-0 z-20 px-6 py-4 bg-[#F3F4F6]/80 dark:bg-[#0c1418]/80 backdrop-blur-md transition-colors duration-300">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white dark:bg-[#16252c] rounded-2xl shadow-sm border border-white/50 dark:border-white/5 px-6 py-3 flex items-center justify-between transition-colors duration-300"
            >
                {/* Left Section: Welcome / Title */}
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            Dashboard
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                            Welcome back, <span className="font-semibold text-[#223943] dark:text-white">{user?.name}</span>
                        </p>
                    </div>
                </div>

                {/* Center Section: Search Bar */}
                <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
                    <div className={`
                        flex items-center w-full bg-gray-50 dark:bg-[#0c1418] rounded-xl border transition-all duration-300
                        ${isSearchFocused ? 'border-[#223943] dark:border-[#C8A96A] ring-2 ring-[#223943]/10 dark:ring-[#C8A96A]/20 bg-white dark:bg-[#111c21]' : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'}
                    `}>
                        <Search size={18} className="ml-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search orders, customers..."
                            className="w-full bg-transparent px-4 py-2.5 outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600"
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#223943] text-gray-600 dark:text-[#C8A96A] transition-colors border border-transparent dark:border-[#C8A96A]/20 shadow-sm md:shadow-none bg-white dark:bg-[#111c21]"
                        title="Toggle dark theme"
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-[#C8A96A]" /> : <Moon size={20} className="text-slate-800" />}
                    </button>

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

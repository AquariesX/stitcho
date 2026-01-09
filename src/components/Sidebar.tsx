"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    Shirt,
    ShoppingBag,
    CreditCard,
    Scissors,
    BarChart2,
    Settings,
    ChevronDown,
    ChevronRight,
    Circle,
    Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

// Types for our menu items
type MenuItem = {
    title: string;
    href?: string;
    icon?: React.ReactNode;
    submenu?: { title: string; href: string }[];
    allowedRoles?: string[]; // Added for role-based access
};

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { role, user } = useAuth();

    // Define the menu structure here
    // Ideally this could come from a database or API, but for now hardcoding is fine
    const allMenuItems: MenuItem[] = [
        // --- ADMIN ITEMS ---
        {
            title: "Dashboard",
            href: "/dashboard",
            icon: <LayoutDashboard size={20} />,
            // Accessible by all, but mainly admin dashboard
            allowedRoles: ["admin"],
        },
        {
            title: "Users Management",
            icon: <Users size={20} />,
            submenu: [
                { title: "All Users", href: "/dashboard/users" },
                { title: "Customers", href: "/dashboard/users/customers" },
                { title: "Tailors", href: "/dashboard/users/tailors" },
                { title: "Admin Accounts", href: "/dashboard/users/admins" },
            ],
            allowedRoles: ["admin"],
        },
        {
            title: "Categories & Dresses",
            icon: <Shirt size={20} />,
            submenu: [
                { title: "Categories", href: "/dashboard/categories" },
                { title: "Products", href: "/dashboard/products" },
                { title: "Fabrics", href: "/dashboard/fabrics" },
                { title: "Color", href: "/dashboard/colors" },
                { title: "Style", href: "/dashboard/styles" },
                { title: "Designs", href: "/dashboard/designs" },
            ],
            allowedRoles: ["admin", "tailor"],
        },
        {
            title: "Orders (Admin)",
            icon: <ShoppingBag size={20} />,
            submenu: [
                { title: "All Orders", href: "/dashboard/orders" },
                { title: "Order Status Tracking", href: "/dashboard/orders/tracking" },
            ],
            allowedRoles: ["admin"],
        },
        {
            title: "Payments",
            icon: <CreditCard size={20} />,
            submenu: [
                { title: "Transactions", href: "/dashboard/payments/transactions" },
                { title: "Stripe Payments Logs", href: "/dashboard/payments/logs" },
            ],
            allowedRoles: ["admin"],
        },
        {
            title: "Tailor Management",
            icon: <Scissors size={20} />,
            submenu: [
                { title: "Tailor Profiles", href: "/dashboard/tailors/profiles" },
                { title: "Tailor Shops", href: "/dashboard/tailors/shops" },
                { title: "Ratings & Reviews", href: "/dashboard/tailors/reviews" },
            ],
            allowedRoles: ["admin"],
        },
        {
            title: "Analytics",
            icon: <BarChart2 size={20} />,
            submenu: [
                { title: "Sales Reports", href: "/dashboard/analytics/sales" },
                { title: "User Growth", href: "/dashboard/analytics/growth" },
            ],
            allowedRoles: ["admin"],
        },
        {
            title: "Settings",
            icon: <Settings size={20} />,
            submenu: [
                { title: "Admin Profile", href: "/dashboard/settings/profile" },
                { title: "System Settings", href: "/dashboard/settings/system" },
            ],
            allowedRoles: ["admin"],
        },

        // --- TAILOR ITEMS ---
        {
            title: "Dashboard",
            href: "/dashboard",
            icon: <LayoutDashboard size={20} />,
            allowedRoles: ["tailor"],
        },
        {
            title: "Orders",
            icon: <ShoppingBag size={20} />,
            submenu: [
                { title: "My Orders", href: "/dashboard/tailor/orders" },
                { title: "Pending Orders", href: "/dashboard/tailor/orders/pending" },
                { title: "In Progress", href: "/dashboard/tailor/orders/progress" },
                { title: "Completed", href: "/dashboard/tailor/orders/completed" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "My Products / Designs",
            icon: <Shirt size={20} />,
            submenu: [
                { title: "Manage My Designs", href: "/dashboard/tailor/designs" },
                { title: "Upload New Dress Designs", href: "/dashboard/tailor/designs/new" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "Measurements",
            icon: <Users size={20} />, // Ruler icon not in default imports, using Users/Shirt or appropriate 
            submenu: [
                { title: "Customer Measurements", href: "/dashboard/tailor/measurements" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "Shop Profile",
            icon: <LayoutDashboard size={20} />, // Store icon alternative
            submenu: [
                { title: "My Shop Profile", href: "/dashboard/tailor/profile" },
                { title: "Update Address / Info", href: "/dashboard/tailor/profile/edit" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "Earnings",
            icon: <CreditCard size={20} />,
            submenu: [
                { title: "My Payments", href: "/dashboard/tailor/earnings/payments" },
                { title: "Earnings Summary", href: "/dashboard/tailor/earnings/summary" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "Reviews",
            icon: <BarChart2 size={20} />, // Star icon alternative
            submenu: [
                { title: "Customer Reviews & Ratings", href: "/dashboard/tailor/reviews" },
            ],
            allowedRoles: ["tailor"],
        },
        {
            title: "Settings",
            icon: <Settings size={20} />,
            submenu: [
                { title: "Profile Settings", href: "/dashboard/tailor/settings/profile" },
                { title: "Change Password", href: "/dashboard/tailor/settings/password" },
            ],
            allowedRoles: ["tailor"],
        },
    ];
    // Filter items based on role
    const menuItems = allMenuItems.filter(item => {
        // If no allowedRoles specified, accessible by all
        if (!item.allowedRoles) return true;
        return item.allowedRoles.includes(role);
    });



    // ... items definition ...

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <LayoutDashboard size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-wider">Dashboard</h1>
            </div>

            <nav className="p-4 space-y-2">
                {menuItems.map((item, index) => (
                    <MenuItemComponent key={index} item={item} pathname={pathname} />
                ))}
            </nav>

            {/* User Profile Snippet (Bottom) */}
            <div className="p-4 border-t border-white/10 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold">
                        {user?.name?.[0] || "U"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-white/50 truncate max-w-[150px]">{user?.email}</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-4 right-4 z-50">
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 bg-[#223943] text-white rounded-md shadow-lg"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Desktop Sidebar (Static) */}
            <aside className="hidden md:flex flex-col w-72 bg-[#223943] text-white shadow-2xl h-screen sticky top-0 overflow-y-auto custom-scrollbar">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar (Animated Drawer) */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-[#223943] text-white shadow-2xl overflow-y-auto custom-scrollbar md:hidden flex flex-col"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Sub-component for individual menu items to handle state nicely
function MenuItemComponent({ item, pathname }: { item: MenuItem; pathname: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = item.href === pathname || item.submenu?.some((sub) => sub.href === pathname);

    // Auto-open if a child is active
    React.useEffect(() => {
        if (isActive && item.submenu) {
            setIsOpen(true);
        }
    }, [isActive, item.submenu]);

    const hasSubmenu = item.submenu && item.submenu.length > 0;

    return (
        <div className="mb-1">
            {item.href && !hasSubmenu ? (
                <Link
                    href={item.href}
                    className={clsx(
                        "flex items-center p-3 rounded-xl transition-all duration-300",
                        isActive
                            ? "bg-[#2c4a57] text-white shadow-md border-l-4 border-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <span className="mr-3">{item.icon}</span>
                    <span className="font-medium text-sm">{item.title}</span>
                </Link>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300",
                        isActive
                            ? "bg-[#2c4a57] text-white shadow-md"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <div className="flex items-center">
                        <span className="mr-3">{item.icon}</span>
                        <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    {hasSubmenu && (
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown size={16} />
                        </motion.div>
                    )}
                </button>
            )}

            {/* Submenu Animation */}
            <AnimatePresence>
                {hasSubmenu && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="ml-4 mt-1 pl-4 border-l border-white/10 space-y-1">
                            {item.submenu!.map((sub, index) => {
                                const isSubActive = sub.href === pathname;
                                return (
                                    <Link
                                        key={index}
                                        href={sub.href}
                                        className={clsx(
                                            "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                                            isSubActive ? "text-white bg-white/10 font-semibold" : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        {/* Tiny dot for active state visual aid */}
                                        {isSubActive && <Circle size={6} className="mr-2 fill-current" />}
                                        {sub.title}
                                    </Link>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

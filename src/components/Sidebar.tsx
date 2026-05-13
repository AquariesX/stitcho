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
  Circle,
  Menu,
  Bell,
  Shield,
  Star,
  Ruler,
  Package,
  Palette,
  Store,
  Tag,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

type MenuItem = {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  submenu?: { title: string; href: string }[];
  allowedRoles?: string[];
};

/** All menu items keyed by role — Admin then Tailor */
const allMenuItems: MenuItem[] = [
  // ══════════════ ADMIN ══════════════
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    allowedRoles: ["admin"],
  },
  {
    title: "Users",
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
    title: "Shop Approvals",
    icon: <Store size={20} />,
    submenu: [
      { title: "Tailor Profiles", href: "/dashboard/tailors/profiles" },
      { title: "Tailor Shops", href: "/dashboard/tailors/shops" },
      { title: "Ratings & Reviews", href: "/dashboard/tailors/reviews" },
    ],
    allowedRoles: ["admin"],
  },
  {
    title: "Categories & Catalog",
    icon: <Shirt size={20} />,
    submenu: [
      { title: "Categories", href: "/dashboard/categories" },
      { title: "Products", href: "/dashboard/products" },
      { title: "Designs", href: "/dashboard/designs" },
      { title: "Fabrics", href: "/dashboard/fabrics" },
      { title: "Colors", href: "/dashboard/colors" },
      { title: "Styles", href: "/dashboard/styles" },
    ],
    allowedRoles: ["admin"],
  },
  {
    title: "Orders",
    icon: <ShoppingBag size={20} />,
    submenu: [
      { title: "All Orders", href: "/dashboard/orders" },
      { title: "Order Tracking", href: "/dashboard/orders/tracking" },
    ],
    allowedRoles: ["admin"],
  },
  {
    title: "Payments",
    icon: <CreditCard size={20} />,
    submenu: [
      { title: "Transactions", href: "/dashboard/payments/transactions" },
      { title: "Payment Logs", href: "/dashboard/payments/logs" },
    ],
    allowedRoles: ["admin"],
  },
  {
    title: "Notifications",
    icon: <Bell size={20} />,
    href: "/dashboard/notifications",
    allowedRoles: ["admin"],
  },
  {
    title: "Reports & Analytics",
    icon: <BarChart2 size={20} />,
    href: "/dashboard/reports",
    allowedRoles: ["admin"],
  },
  {
    title: "Audit Logs",
    icon: <Shield size={20} />,
    href: "/dashboard/audit-logs",
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

  // ══════════════ TAILOR ══════════════
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    allowedRoles: ["tailor"],
  },
  {
    title: "My Shop",
    icon: <Store size={20} />,
    submenu: [
      { title: "Shop Profile", href: "/dashboard/tailor/profile" },
      { title: "Edit Shop Info", href: "/dashboard/tailor/profile/edit" },
    ],
    allowedRoles: ["tailor"],
  },
  {
    title: "My Catalog",
    icon: <Shirt size={20} />,
    submenu: [
      { title: "My Designs", href: "/dashboard/tailor/designs" },
      { title: "Upload Design", href: "/dashboard/tailor/designs/new" },
    ],
    allowedRoles: ["tailor"],
  },
  {
    title: "Fabrics Inventory",
    icon: <Package size={20} />,
    href: "/dashboard/fabrics",
    allowedRoles: ["tailor"],
  },
  {
    title: "My Orders",
    icon: <ShoppingBag size={20} />,
    submenu: [
      { title: "All My Orders", href: "/dashboard/tailor/orders" },
      { title: "Pending", href: "/dashboard/tailor/orders/pending" },
      { title: "In Progress", href: "/dashboard/tailor/orders/progress" },
      { title: "Completed", href: "/dashboard/tailor/orders/completed" },
    ],
    allowedRoles: ["tailor"],
  },
  {
    title: "Measurements",
    icon: <Ruler size={20} />,
    href: "/dashboard/tailor/measurements",
    allowedRoles: ["tailor"],
  },
  {
    title: "Payments",
    icon: <CreditCard size={20} />,
    submenu: [
      { title: "My Payments", href: "/dashboard/tailor/earnings/payments" },
      { title: "Earnings Summary", href: "/dashboard/tailor/earnings/summary" },
    ],
    allowedRoles: ["tailor"],
  },
  {
    title: "Reviews",
    icon: <Star size={20} />,
    href: "/dashboard/tailor/reviews",
    allowedRoles: ["tailor"],
  },
  {
    title: "Analytics",
    icon: <BarChart2 size={20} />,
    href: "/dashboard/tailor/analytics",
    allowedRoles: ["tailor"],
  },
  {
    title: "Notifications",
    icon: <Bell size={20} />,
    href: "/dashboard/notifications",
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

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { role, user } = useAuth();

  const menuItems = allMenuItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(role);
  });

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#C8A96A]/20 rounded-full flex items-center justify-center">
          <Scissors size={22} className="text-[#C8A96A]" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">Stitcho</h1>
          <p className="text-xs text-white/40 capitalize">{role} Panel</p>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <MenuItemComponent
            key={`${role}-${index}`}
            item={item}
            pathname={pathname}
            onNavigate={() => setIsMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User profile snippet */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#C8A96A]/20 flex items-center justify-center text-[#C8A96A] font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-white/40 truncate max-w-[150px]">{user?.email}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-[#223943] text-white rounded-xl shadow-lg border border-white/10"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#223943] dark:bg-[#0c1418] border-r border-white/5 text-white shadow-2xl h-screen sticky top-0 overflow-hidden transition-colors duration-300">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#223943] dark:bg-[#0c1418] text-white shadow-2xl flex flex-col border-r border-white/5 md:hidden overflow-hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItemComponent({
  item,
  pathname,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive =
    item.href === pathname ||
    item.submenu?.some((sub) => pathname.startsWith(sub.href));
  const [isOpen, setIsOpen] = useState(false);
  const hasSubmenu = !!item.submenu?.length;

  React.useEffect(() => {
    if (isActive && hasSubmenu) setIsOpen(true);
  }, [isActive, hasSubmenu]);

  const baseClass =
    "w-full flex items-center p-3 rounded-xl transition-all duration-200";
  const activeClass =
    "bg-[#C8A96A]/20 text-[#C8A96A] border-l-4 border-[#C8A96A] shadow-sm";
  const inactiveClass =
    "text-white/65 hover:bg-white/8 hover:text-white border-l-4 border-transparent";

  return (
    <div className="mb-0.5">
      {item.href && !hasSubmenu ? (
        <Link
          href={item.href}
          onClick={onNavigate}
          className={clsx(baseClass, isActive ? activeClass : inactiveClass)}
        >
          <span className="mr-3 shrink-0">{item.icon}</span>
          <span className="font-medium text-sm">{item.title}</span>
        </Link>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            baseClass,
            "justify-between",
            isActive ? activeClass : inactiveClass
          )}
        >
          <div className="flex items-center">
            <span className="mr-3 shrink-0">{item.icon}</span>
            <span className="font-medium text-sm">{item.title}</span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={15} />
          </motion.div>
        </button>
      )}

      <AnimatePresence>
        {hasSubmenu && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-0.5 pl-4 border-l border-white/10 space-y-0.5">
              {item.submenu!.map((sub, i) => {
                const isSubActive = pathname.startsWith(sub.href);
                return (
                  <Link
                    key={i}
                    href={sub.href}
                    onClick={onNavigate}
                    className={clsx(
                      "flex items-center py-2 px-3 rounded-lg text-xs transition-colors",
                      isSubActive
                        ? "text-[#C8A96A] bg-[#C8A96A]/10 font-semibold"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {isSubActive && <Circle size={5} className="mr-2 fill-current shrink-0" />}
                    {sub.title}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

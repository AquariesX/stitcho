"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, ShoppingBag, Users, Scissors, TrendingUp,
  Clock, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAdminSummary, getOrdersByStatus, getTailorAnalytics } from "@/app/actions/reportActions";

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-yellow-400",
  PROCESSING: "bg-blue-400",
  CUTTING: "bg-orange-400",
  STITCHING: "bg-purple-400",
  READY: "bg-green-400",
  DELIVERED: "bg-indigo-400",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
  CANCEL_REQUESTED: "bg-rose-400",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { role, user } = useAuth();
  const [adminStats, setAdminStats] = useState<any>(null);
  const [tailorStats, setTailorStats] = useState<any>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (role === "admin") {
          const [s, obs] = await Promise.all([getAdminSummary(), getOrdersByStatus()]);
          setAdminStats(s);
          setOrdersByStatus(obs);
        } else if (role === "tailor" && user?.id) {
          const s = await getTailorAnalytics(user.id);
          setTailorStats(s);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [role, user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── ADMIN Dashboard ────────────────────────────────────────────
  if (role === "admin" && adminStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Platform-wide summary — last updated just now
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard icon={DollarSign} label="Total Revenue" value={`Rs ${adminStats.totalRevenue.toLocaleString()}`} color="bg-emerald-500" delay={0} />
          <StatCard icon={ShoppingBag} label="Total Orders" value={adminStats.totalOrders} color="bg-blue-500" delay={0.05} />
          <StatCard icon={Users} label="Customers" value={adminStats.totalCustomers} color="bg-purple-500" delay={0.1} />
          <StatCard icon={Scissors} label="Tailors" value={adminStats.totalTailors} color="bg-[#C8A96A]" delay={0.15} />
        </div>

        {/* Orders by status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#C8A96A]" />
            Orders by Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {ordersByStatus.map((o) => (
              <div
                key={o.status}
                className="flex flex-col items-center p-3 bg-gray-50 dark:bg-[#111c21] rounded-xl border border-gray-100 dark:border-white/5"
              >
                <span className={`w-3 h-3 rounded-full mb-2 ${STATUS_DOT[o.status] ?? "bg-gray-400"}`} />
                <span className="text-2xl font-black text-gray-900 dark:text-white">{o.count}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight mt-1">
                  {o.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: "View All Orders", href: "/dashboard/orders", color: "bg-blue-500" },
            { label: "Reports & Analytics", href: "/dashboard/reports", color: "bg-[#C8A96A]" },
            { label: "Audit Logs", href: "/dashboard/audit-logs", color: "bg-gray-700 dark:bg-gray-600" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`${l.color} text-white rounded-2xl p-4 flex items-center justify-between hover:opacity-90 transition-opacity`}
            >
              <span className="font-semibold">{l.label}</span>
              <span className="text-white/70">→</span>
            </a>
          ))}
        </motion.div>
      </div>
    );
  }

  // ── TAILOR Dashboard ──────────────────────────────────────────
  if (role === "tailor" && tailorStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            My Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard icon={ShoppingBag} label="Total Orders" value={tailorStats.totalOrders} color="bg-blue-500" delay={0} />
          <StatCard icon={Clock} label="Active / Pending" value={tailorStats.pendingOrders} color="bg-yellow-500" delay={0.05} />
          <StatCard icon={CheckCircle} label="Completed" value={tailorStats.completedOrders} color="bg-emerald-500" delay={0.1} />
          <StatCard icon={DollarSign} label="Total Revenue" value={`Rs ${tailorStats.totalRevenue.toLocaleString()}`} color="bg-[#C8A96A]" delay={0.15} />
        </div>

        {tailorStats.cancelledOrders > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl"
          >
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              You have <strong>{tailorStats.cancelledOrders}</strong> cancelled order(s). Review them in My Orders.
            </p>
          </motion.div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "View My Orders", href: "/dashboard/tailor/orders", color: "bg-blue-500" },
            { label: "My Analytics", href: "/dashboard/tailor/analytics", color: "bg-[#C8A96A]" },
            { label: "My Shop Profile", href: "/dashboard/tailor/profile", color: "bg-[#223943]" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`${l.color} text-white rounded-2xl p-4 flex items-center justify-between hover:opacity-90 transition-opacity`}
            >
              <span className="font-semibold">{l.label}</span>
              <span className="text-white/70">→</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading dashboard data...</p>
    </div>
  );
}

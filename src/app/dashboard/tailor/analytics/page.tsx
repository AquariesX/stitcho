"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, CheckCircle, XCircle, DollarSign, Package, Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getTailorAnalytics, getTailorFabricUsage } from "@/app/actions/reportActions";
import { estimateDelivery } from "@/lib/delivery-estimation";

function Card({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function TailorAnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [s, f] = await Promise.all([
          getTailorAnalytics(user.id),
          getTailorFabricUsage(user.id),
        ]);
        setStats(s);
        setFabrics(f);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5" />
        ))}
      </div>
    );
  }

  const maxFabric = Math.max(...fabrics.map((f) => f.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
          My Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your personal shop performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} color="bg-blue-500" />
        <Card icon={Clock} label="Pending / Active" value={stats.pendingOrders} color="bg-yellow-500" />
        <Card
          icon={CheckCircle}
          label="Completed"
          value={stats.completedOrders}
          sub={`${stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}% completion rate`}
          color="bg-emerald-500"
        />
        <Card icon={XCircle} label="Cancelled" value={stats.cancelledOrders} color="bg-red-400" />
        <Card
          icon={DollarSign}
          label="Total Revenue"
          value={`Rs ${stats.totalRevenue.toLocaleString()}`}
          sub="From completed paid orders"
          color="bg-[#C8A96A]"
        />
        <Card icon={Package} label="Fabric Varieties Used" value={fabrics.length} color="bg-purple-500" />
      </div>

      {/* Fabric usage */}
      {fabrics.length > 0 && (
        <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Top Fabrics Used</h2>
          <div className="space-y-2">
            {fabrics.map((f) => (
              <div key={f.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300 w-40 truncate">{f.name}</span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((f.count / maxFabric) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-[#C8A96A] rounded-full"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">
                  {f.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

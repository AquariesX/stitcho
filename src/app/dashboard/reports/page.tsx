"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ShoppingBag, Users, Scissors, DollarSign,
  BarChart2, Download, Calendar, RefreshCw,
} from "lucide-react";
import {
  getAdminSummary,
  getOrdersByStatus,
  getDailyRevenue,
  getTopProducts,
  getTopFabrics,
  getTailorPerformance,
  getCustomerGrowth,
} from "@/app/actions/reportActions";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: "bg-yellow-400",
  PROCESSING: "bg-blue-400",
  CUTTING: "bg-orange-400",
  STITCHING: "bg-purple-400",
  READY: "bg-green-400",
  DELIVERED: "bg-indigo-400",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
  CANCEL_REQUESTED: "bg-rose-300",
  REFUND_PENDING: "bg-pink-400",
  REFUNDED: "bg-gray-400",
};

function SummaryCard({
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
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-32 text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-[#C8A96A] rounded-full"
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">
        {count}
      </span>
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────────

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topFabrics, setTopFabrics] = useState<any[]>([]);
  const [tailorPerf, setTailorPerf] = useState<any[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, obs, dr, tp, tf, tperf, cg] = await Promise.all([
        getAdminSummary(),
        getOrdersByStatus(),
        getDailyRevenue(days),
        getTopProducts(8),
        getTopFabrics(8),
        getTailorPerformance(),
        getCustomerGrowth(days),
      ]);
      setSummary(s);
      setOrdersByStatus(obs);
      setDailyRevenue(dr);
      setTopProducts(tp);
      setTopFabrics(tf);
      setTailorPerf(tperf);
      setCustomerGrowth(cg);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const maxOrder = Math.max(...ordersByStatus.map((o) => o.count), 1);
  const maxProduct = Math.max(...topProducts.map((p) => p.orderCount), 1);
  const maxFabric = Math.max(...topFabrics.map((f) => f.orderCount), 1);
  const totalRevenue = dailyRevenue.reduce((s, d) => s + d.revenue, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Reports &amp; Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Platform-wide insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#16252c] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
            <Calendar size={15} className="text-gray-400" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <button
            onClick={load}
            className="p-2 bg-white dark:bg-[#16252c] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <SummaryCard
            icon={DollarSign}
            label="Total Revenue"
            value={`Rs ${(summary.totalRevenue ?? 0).toLocaleString()}`}
            sub="All-time paid orders"
            color="bg-emerald-500"
          />
          <SummaryCard
            icon={ShoppingBag}
            label="Total Orders"
            value={summary.totalOrders}
            sub={`${summary.recentOrders} in last 30 days`}
            color="bg-blue-500"
          />
          <SummaryCard
            icon={Users}
            label="Total Customers"
            value={summary.totalCustomers}
            color="bg-purple-500"
          />
          <SummaryCard
            icon={Scissors}
            label="Total Tailors"
            value={summary.totalTailors}
            color="bg-[#C8A96A]"
          />
        </div>
      )}

      {/* ── Revenue over time (text-based bars) ── */}
      <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#C8A96A]" />
              Revenue Trend ({days}-day)
            </h2>
            <p className="text-2xl font-black text-[#C8A96A] mt-1">
              Rs {totalRevenue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => exportCSV("revenue.csv", dailyRevenue)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-600 dark:text-gray-300"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        {dailyRevenue.length === 0 ? (
          <p className="text-gray-400 text-sm">No revenue data for this period.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {dailyRevenue.map((d) => {
              const maxRev = Math.max(...dailyRevenue.map((x) => x.revenue), 1);
              return (
                <div key={d.date} className="flex items-center gap-3 py-1">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{d.date}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((d.revenue / maxRev) * 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-[#C8A96A] rounded-full"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-28 text-right">
                    Rs {d.revenue.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Orders by status + top products/fabrics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by status */}
        <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <ShoppingBag size={18} className="text-blue-400" />
            Orders by Status
          </h2>
          <div className="space-y-0.5">
            {ordersByStatus.map((o) => (
              <div key={o.status} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLOR_MAP[o.status] ?? "bg-gray-400"}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{o.status}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-400" />
              Top Products
            </h2>
            <button
              onClick={() => exportCSV("top-products.csv", topProducts.map((p) => ({ name: p.name, orders: p.orderCount })))}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Download size={13} />
            </button>
          </div>
          <div className="space-y-0.5">
            {topProducts.map((p) => (
              <BarRow key={p.productId} label={p.name} count={p.orderCount} max={maxProduct} />
            ))}
            {topProducts.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
          </div>
        </div>

        {/* Top Fabrics */}
        <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-[#C8A96A]" />
              Top Fabrics
            </h2>
            <button
              onClick={() => exportCSV("top-fabrics.csv", topFabrics.map((f) => ({ name: f.name, orders: f.orderCount })))}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Download size={13} />
            </button>
          </div>
          <div className="space-y-0.5">
            {topFabrics.map((f) => (
              <BarRow key={f.fabricId} label={f.name} count={f.orderCount} max={maxFabric} />
            ))}
            {topFabrics.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* ── Tailor performance ── */}
      <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scissors size={18} className="text-[#C8A96A]" />
            Tailor Performance
          </h2>
          <button
            onClick={() => exportCSV("tailor-performance.csv", tailorPerf)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-600 dark:text-gray-300"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        {tailorPerf.length === 0 ? (
          <p className="text-gray-400 text-sm">No tailor data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Tailor</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Total</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Completed</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Cancelled</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Pending</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Rate</th>
                </tr>
              </thead>
              <tbody>
                {tailorPerf.map((t) => (
                  <tr
                    key={t.tailorId}
                    className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{t.total}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {t.completed}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        {t.cancelled}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-300">{t.pending}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.completionRate >= 70 ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300"}`}>
                        {t.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Customer growth ── */}
      <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-purple-400" />
            Customer Growth ({days}-day)
          </h2>
          <span className="text-sm font-bold text-gray-500 dark:text-gray-300">
            +{customerGrowth.reduce((s, d) => s + d.count, 0)} new
          </span>
        </div>
        {customerGrowth.length === 0 ? (
          <p className="text-gray-400 text-sm">No new customers in this period.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {customerGrowth.map((d) => {
              const maxC = Math.max(...customerGrowth.map((x) => x.count), 1);
              return (
                <div key={d.date} className="flex items-center gap-3 py-1">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{d.date}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((d.count / maxC) * 100)}%` }}
                      className="h-full bg-purple-400 rounded-full"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

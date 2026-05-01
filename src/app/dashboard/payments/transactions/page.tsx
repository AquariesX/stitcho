"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Loader2,
  ArrowUpRight,
  Download,
  RefreshCw,
  Filter,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { getAdminPayments, AdminPaymentRow, AdminPaymentStats } from "@/app/actions/adminPaymentActions";
import { PaymentStatus } from "@prisma/client";

// ─── animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = value;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <span>
      {prefix}{display.toFixed(decimals)}
    </span>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  prefix,
  decimals,
  icon,
  accent,
  delay,
  sub,
}: {
  title: string;
  value: number;
  prefix?: string;
  decimals?: number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300"
    >
      {/* watermark */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.04] pointer-events-none transition-transform duration-500 group-hover:scale-110">
        <DollarSign size={110} className="text-gray-900 dark:text-white" />
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-2 tabular-nums">
            <AnimatedNumber value={value} prefix={prefix} decimals={decimals} />
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{sub}</p>
        </div>
        <div className={`p-3 rounded-xl ${accent}`}>{icon}</div>
      </div>
    </motion.div>
  );
}

// ─── status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    PAID: { label: "Paid", cls: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300" },
    REQUIRES_PAYMENT: { label: "Pending", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300" },
    FAILED: { label: "Failed", cls: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
type FilterTab = "ALL" | PaymentStatus;

export default function TransactionsPage() {
  const [data, setData] = useState<{ payments: AdminPaymentRow[]; stats: AdminPaymentStats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [copied, setCopied] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await getAdminPayments();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ["Order ID", "Customer", "Email", "Product", "Amount (USD)", "Currency", "Status", "Order Status", "Stripe PI", "Date"];
    const rows = data.payments.map((p) => [
      `ORD-${p.orderId.toString().padStart(4, "0")}`,
      p.customerName,
      p.customerEmail ?? "",
      p.productName,
      p.amount.toFixed(2),
      p.currency,
      p.status,
      p.orderStatus,
      p.stripePaymentIntentId,
      new Date(p.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── filtered list ──
  const filtered = (data?.payments ?? []).filter((p) => {
    const matchTab = activeTab === "ALL" || p.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.customerName.toLowerCase().includes(q) ||
      p.productName.toLowerCase().includes(q) ||
      p.orderId.toString().includes(q) ||
      p.stripePaymentIntentId.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // ── loading ──
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 size={40} className="text-[#C8A96A]" />
        </motion.div>
      </div>
    );
  }

  const { stats } = data!;

  const tabs: { label: string; value: FilterTab; count: number }[] = [
    { label: "All", value: "ALL", count: stats.totalCount },
    { label: "Paid", value: PaymentStatus.PAID, count: stats.paidCount },
    { label: "Pending", value: PaymentStatus.REQUIRES_PAYMENT, count: stats.pendingCount },
    { label: "Failed", value: PaymentStatus.FAILED, count: stats.failedCount },
  ];

  return (
    <div className="space-y-6">

      {/* ── header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Transactions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Complete ledger of all payment activity across the platform
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
          className="flex gap-2"
        >
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16252c] text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8, ease: "linear" }}>
              <RefreshCw size={15} />
            </motion.div>
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C8A96A] text-white text-sm font-semibold hover:bg-[#b8964f] transition-colors shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
        </motion.div>
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          prefix="$"
          decimals={2}
          icon={<TrendingUp size={20} />}
          accent="bg-green-50 dark:bg-green-500/10 text-green-500"
          delay={0}
          sub="From all completed payments"
        />
        <StatCard
          title="Transactions"
          value={stats.totalCount}
          icon={<CreditCard size={20} />}
          accent="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
          delay={0.08}
          sub="Total payment records"
        />
        <StatCard
          title="Paid"
          value={stats.paidCount}
          icon={<CheckCircle2 size={20} />}
          accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
          delay={0.16}
          sub="Successfully cleared"
        />
        <StatCard
          title="Pending / Failed"
          value={stats.pendingCount + stats.failedCount}
          icon={<Clock size={20} />}
          accent="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500"
          delay={0.24}
          sub={`${stats.pendingCount} pending · ${stats.failedCount} failed`}
        />
      </div>

      {/* ── progress bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#16252c] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Payment Clearance Rate</p>
          <p className="text-xs font-bold text-[#C8A96A]">
            {stats.totalCount > 0 ? ((stats.paidCount / stats.totalCount) * 100).toFixed(1) : 0}% cleared
          </p>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-gray-100 dark:bg-[#111c21]">
          {stats.totalCount > 0 && (
            <>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.paidCount / stats.totalCount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                className="bg-green-500 h-full rounded-l-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.pendingCount / stats.totalCount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="bg-yellow-400 h-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.failedCount / stats.totalCount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                className="bg-red-400 h-full rounded-r-full"
              />
            </>
          )}
        </div>
        <div className="flex gap-4 mt-3">
          {[
            { label: "Paid", color: "bg-green-500" },
            { label: "Pending", color: "bg-yellow-400" },
            { label: "Failed", color: "bg-red-400" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── table card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
      >
        {/* toolbar */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {/* tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#111c21] rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === tab.value
                    ? "bg-white dark:bg-[#16252c] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.value
                    ? "bg-[#C8A96A]/20 text-[#C8A96A]"
                    : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customer, product, order, PI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#111c21] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/40 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4"
            >
              <Filter size={30} className="text-gray-300 dark:text-gray-600" />
            </motion.div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No transactions found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {search ? "Try a different search term." : "No payment records match this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#111c21] border-b border-gray-100 dark:border-white/5">
                  {["Order", "Customer", "Product", "Amount", "Status", "Date", "Stripe ID"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((p, idx) => (
                    <motion.tr
                      key={p.paymentId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                      className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* order */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            p.status === PaymentStatus.PAID
                              ? "bg-green-50 dark:bg-green-500/10 text-green-500"
                              : p.status === PaymentStatus.FAILED
                              ? "bg-red-50 dark:bg-red-500/10 text-red-400"
                              : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {p.status === PaymentStatus.PAID ? (
                              <ArrowUpRight size={14} />
                            ) : p.status === PaymentStatus.FAILED ? (
                              <XCircle size={14} />
                            ) : (
                              <Clock size={14} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-white">
                              ORD-{p.orderId.toString().padStart(4, "0")}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                              {p.orderStatus}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#C8A96A]/20 dark:bg-[#C8A96A]/10 flex items-center justify-center text-[#C8A96A] font-bold text-sm shrink-0">
                            {p.customerName[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              {p.customerName}
                            </div>
                            {p.customerEmail && (
                              <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                                {p.customerEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* product */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{p.productName}</span>
                      </td>

                      {/* amount */}
                      <td className="px-5 py-4">
                        <span className="font-black text-sm text-[#C8A96A] tabular-nums whitespace-nowrap">
                          ${p.amount.toFixed(2)} {p.currency}
                        </span>
                      </td>

                      {/* status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>

                      {/* date */}
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          {new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* stripe id */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                          <span>{p.stripePaymentIntentId.substring(0, 16)}…</span>
                          <button
                            onClick={() => copyToClipboard(p.stripePaymentIntentId)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C8A96A] hover:text-[#b8964f] flex items-center gap-1"
                          >
                            {copied === p.stripePaymentIntentId ? (
                              <span className="text-green-500 text-[10px] font-bold">Copied!</span>
                            ) : (
                              <>Copy <ArrowRight size={9} className="inline" /></>
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* footer count */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing <span className="font-bold text-gray-600 dark:text-gray-300">{filtered.length}</span> of{" "}
              <span className="font-bold text-gray-600 dark:text-gray-300">{stats.totalCount}</span> transactions
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Revenue in view:{" "}
              <span className="font-bold text-[#C8A96A]">
                ${filtered.filter((p) => p.status === PaymentStatus.PAID).reduce((s, p) => s + p.amount, 0).toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

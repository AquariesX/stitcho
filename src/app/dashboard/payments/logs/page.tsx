"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Hash,
} from "lucide-react";
import { getAdminPayments, AdminPaymentRow, AdminPaymentStats } from "@/app/actions/adminPaymentActions";
import { PaymentStatus } from "@prisma/client";

// ─── animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 800;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * ease));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{display}</>;
}

// ─── stripe status config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [PaymentStatus.PAID]: {
    label: "Succeeded",
    stripeEvent: "payment_intent.succeeded",
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
    row: "border-l-2 border-l-green-400",
    dot: "bg-green-400",
    glow: "shadow-green-500/20",
  },
  [PaymentStatus.REQUIRES_PAYMENT]: {
    label: "Requires Payment",
    stripeEvent: "payment_intent.created",
    icon: Clock,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    row: "border-l-2 border-l-amber-400",
    dot: "bg-amber-400",
    glow: "shadow-amber-500/20",
  },
  [PaymentStatus.FAILED]: {
    label: "Failed",
    stripeEvent: "payment_intent.payment_failed",
    icon: XCircle,
    badge: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
    row: "border-l-2 border-l-red-400",
    dot: "bg-red-400",
    glow: "shadow-red-500/20",
  },
};

// ─── metric card ──────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  sub: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white dark:bg-[#16252c] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{sub}</p>
    </motion.div>
  );
}

// ─── PI row detail drawer ─────────────────────────────────────────────────────
function PIDetailDrawer({ payment, onClose }: { payment: AdminPaymentRow; onClose: () => void }) {
  const cfg = STATUS_CONFIG[payment.status];
  const StatusIcon = cfg.icon;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(payment.stripePaymentIntentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-[#111c21]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${cfg.badge}`}>
              <StatusIcon size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Payment Intent Details</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">ORD-{payment.orderId.toString().padStart(4, "0")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          {/* PI ID */}
          <div className="bg-gray-50 dark:bg-[#111c21] rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              Payment Intent ID
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
                {payment.stripePaymentIntentId}
              </code>
              <button
                onClick={copy}
                className={`shrink-0 p-2 rounded-lg transition-colors ${
                  copied
                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-white dark:bg-white/5 text-gray-500 hover:text-[#C8A96A] border border-gray-200 dark:border-white/10"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Amount", value: `$${payment.amount.toFixed(2)} ${payment.currency}` },
              { label: "Status", value: cfg.label },
              { label: "Customer", value: payment.customerName },
              { label: "Product", value: payment.productName },
              { label: "Order Status", value: payment.orderStatus },
              { label: "Stripe Event", value: cfg.stripeEvent },
              {
                label: "Created",
                value: new Date(payment.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
              },
              {
                label: "Last Updated",
                value: new Date(payment.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-[#111c21] rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">{value}</p>
              </div>
            ))}
          </div>

          {/* open in stripe */}
          <a
            href={`https://dashboard.stripe.com/test/payment_intents/${payment.stripePaymentIntentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#635bff] hover:bg-[#5750e8] text-white text-sm font-bold transition-colors shadow-sm"
          >
            <ExternalLink size={15} />
            View in Stripe Dashboard
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
type LogFilter = "ALL" | PaymentStatus;

export default function StripePaymentLogsPage() {
  const [data, setData] = useState<{ payments: AdminPaymentRow[]; stats: AdminPaymentStats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogFilter>("ALL");
  const [selected, setSelected] = useState<AdminPaymentRow | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await getAdminPayments();
      setData(result);
      if (isRefresh) setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copyPI = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = (data?.payments ?? []).filter((p) => {
    const matchFilter = filter === "ALL" || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.stripePaymentIntentId.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.orderId.toString().includes(q);
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 size={40} className="text-[#635bff]" />
        </motion.div>
      </div>
    );
  }

  const { stats } = data!;

  return (
    <>
      <AnimatePresence>
        {selected && <PIDetailDrawer payment={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <div className="space-y-6">

        {/* ── header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-3 mb-1">
              {/* stripe-branded dot */}
              <div className="w-8 h-8 rounded-lg bg-[#635bff] flex items-center justify-center shadow-md shadow-[#635bff]/30">
                <Zap size={16} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Stripe Payment Logs
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm ml-11">
              Raw PaymentIntent event log · Last refreshed{" "}
              <span className="text-[#C8A96A] font-semibold">
                {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635bff] hover:bg-[#5750e8] text-white text-sm font-bold transition-colors shadow-sm shadow-[#635bff]/30 disabled:opacity-50"
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ repeat: refreshing ? Infinity : 0, duration: 0.7, ease: "linear" }}
              >
                <RefreshCw size={15} />
              </motion.div>
              {refreshing ? "Refreshing…" : "Refresh Logs"}
            </button>
          </motion.div>
        </div>

        {/* ── metric cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Intents"
            value={stats.totalCount}
            icon={Hash}
            accent="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
            sub="All payment intents logged"
            delay={0}
          />
          <MetricCard
            label="Succeeded"
            value={stats.paidCount}
            icon={CheckCircle2}
            accent="bg-green-50 dark:bg-green-500/10 text-green-500"
            sub="payment_intent.succeeded"
            delay={0.08}
          />
          <MetricCard
            label="Requires Payment"
            value={stats.pendingCount}
            icon={Clock}
            accent="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
            sub="Awaiting payment method"
            delay={0.16}
          />
          <MetricCard
            label="Failed / Canceled"
            value={stats.failedCount}
            icon={XCircle}
            accent="bg-red-50 dark:bg-red-500/10 text-red-400"
            sub="payment_intent.payment_failed"
            delay={0.24}
          />
        </div>

        {/* ── live activity strip ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex items-center gap-3 bg-white dark:bg-[#16252c] border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-3 shadow-sm"
        >
          <div className="relative flex items-center justify-center w-6 h-6">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-30 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Webhook listener active ·{" "}
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              Events route to <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">/api/payments/webhook</code>
            </span>
          </p>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Activity size={13} />
            {stats.totalCount} events
          </div>
        </motion.div>

        {/* ── logs table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
        >
          {/* toolbar */}
          <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            {/* filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {(["ALL", PaymentStatus.PAID, PaymentStatus.REQUIRES_PAYMENT, PaymentStatus.FAILED] as LogFilter[]).map((f) => {
                const labels: Record<LogFilter, string> = {
                  ALL: "All Events",
                  PAID: "Succeeded",
                  REQUIRES_PAYMENT: "Requires Payment",
                  FAILED: "Failed",
                };
                const colors: Record<LogFilter, string> = {
                  ALL: "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                  PAID: "bg-green-500 text-white",
                  REQUIRES_PAYMENT: "bg-amber-500 text-white",
                  FAILED: "bg-red-500 text-white",
                };
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      filter === f
                        ? colors[f] + " shadow-sm"
                        : "bg-gray-100 dark:bg-[#111c21] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>

            {/* search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search PI ID, customer, order…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#111c21] text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]/40 transition-all dark:text-white font-mono"
              />
            </div>
          </div>

          {/* log rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4"
              >
                <Zap size={30} className="text-gray-300 dark:text-gray-600" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">No logs found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {search ? "No PaymentIntents match your query." : "No events recorded for this filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {filtered.map((p, idx) => {
                  const cfg = STATUS_CONFIG[p.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <motion.div
                      key={p.paymentId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: idx * 0.025, duration: 0.3 }}
                      onClick={() => setSelected(p)}
                      className={`px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors ${cfg.row}`}
                    >
                      {/* status icon + event */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <div className={`p-2 rounded-lg shrink-0 ${cfg.badge}`}>
                          <StatusIcon size={15} />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500">
                            {cfg.stripeEvent}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge} mt-0.5`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* PI ID */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                          {p.stripePaymentIntentId}
                        </code>
                        <button
                          onClick={(e) => copyPI(p.stripePaymentIntentId, e)}
                          className={`shrink-0 p-1.5 rounded-md transition-colors ${
                            copiedId === p.stripePaymentIntentId
                              ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                              : "text-gray-400 hover:text-[#C8A96A] hover:bg-gray-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {copiedId === p.stripePaymentIntentId ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* amount */}
                      <div className="shrink-0 text-right">
                        <p className="font-black text-sm text-[#C8A96A] tabular-nums">
                          ${p.amount.toFixed(2)} {p.currency}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          ORD-{p.orderId.toString().padStart(4, "0")}
                        </p>
                      </div>

                      {/* customer */}
                      <div className="hidden lg:flex items-center gap-2 shrink-0 min-w-[140px]">
                        <div className="w-7 h-7 rounded-full bg-[#635bff]/10 flex items-center justify-center text-[#635bff] font-bold text-xs shrink-0">
                          {p.customerName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[110px]">
                            {p.customerName}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[110px]">
                            {p.productName}
                          </p>
                        </div>
                      </div>

                      {/* timestamp */}
                      <div className="hidden xl:block shrink-0 text-right min-w-[120px]">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          {new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </div>

                      {/* chevron hint */}
                      <div className="hidden md:flex items-center text-gray-300 dark:text-gray-600 shrink-0">
                        <ExternalLink size={14} />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* footer */}
          {filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#111c21]/50">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                <span className="font-bold text-gray-600 dark:text-gray-300">{filtered.length}</span> events shown
                {filter !== "ALL" && (
                  <> · <span className="text-[#635bff] font-semibold cursor-pointer hover:underline" onClick={() => setFilter("ALL")}>Clear filter</span></>
                )}
              </p>
              <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                Click any row for full details
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

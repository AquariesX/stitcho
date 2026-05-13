"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { getAuditLogs, getAuditModules } from "@/app/actions/auditLogActions";

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  APPROVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  REJECT: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  STRIPE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  REQUEST: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
};

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLOR).find((k) => action.includes(k));
  return key ? ACTION_COLOR[key] : "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Filters
  const [searchAction, setSearchAction] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [result, mods] = await Promise.all([
      getAuditLogs({
        module: filterModule || undefined,
        action: searchAction || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
      getAuditModules(),
    ]);
    setLogs(result.data ?? []);
    setTotalCount(result.totalCount ?? 0);
    setModules(mods);
    setLoading(false);
  }, [filterModule, searchAction, filterDateFrom, filterDateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Audit Logs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track all admin and tailor actions — {totalCount} records
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-white dark:bg-[#16252c] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-600 dark:text-gray-300"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search action..."
            value={searchAction}
            onChange={(e) => { setSearchAction(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111c21] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/40"
          />
        </div>
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <select
            value={filterModule}
            onChange={(e) => { setFilterModule(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111c21] text-gray-800 dark:text-white focus:outline-none"
          >
            <option value="">All Modules</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
            className="py-2 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111c21] text-gray-800 dark:text-white focus:outline-none"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
            className="py-2 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111c21] text-gray-800 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse h-14 bg-white dark:bg-[#16252c] rounded-xl border border-gray-100 dark:border-white/5" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5"
        >
          <Shield size={48} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-gray-500">No audit logs found for the selected filters.</p>
        </motion.div>
      ) : (
        <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#111c21]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Module</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entity</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {logs.map((log, idx) => (
                  <React.Fragment key={log.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">
                        {log.userId ?? <span className="text-gray-400 italic">system</span>}
                      </td>
                      <td className="py-3 px-4">
                        {log.userRole && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${log.userRole === "ADMIN" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"}`}>
                            {log.userRole}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{log.module}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {log.entityId ? `#${log.entityId}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {(log.oldValue || log.newValue) && (
                          <span className="text-xs underline text-blue-400 cursor-pointer">
                            {expanded === log.id ? "less" : "details"}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                    {expanded === log.id && (log.oldValue || log.newValue) && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={`exp-${log.id}`}
                      >
                        <td colSpan={7} className="bg-gray-50 dark:bg-[#111c21] px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.oldValue && (
                              <div>
                                <p className="text-gray-400 mb-1 font-sans font-semibold">Before:</p>
                                <pre className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg overflow-auto max-h-32">
                                  {JSON.stringify(log.oldValue, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValue && (
                              <div>
                                <p className="text-gray-400 mb-1 font-sans font-semibold">After:</p>
                                <pre className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 p-2 rounded-lg overflow-auto max-h-32">
                                  {JSON.stringify(log.newValue, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-500">
                Page {page + 1} of {totalPages} — {totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/20 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/20 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
    Wallet, TrendingUp, Clock, CreditCard, Loader2, ArrowUpRight 
} from "lucide-react";
import { getTailorFinances } from "@/app/actions/financeActions";

export default function EarningsSummaryPage() {
    const { user } = useAuth();
    const [finances, setFinances] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) fetchFinances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchFinances = async () => {
        setLoading(true);
        try {
            const data = await getTailorFinances(user!.id);
            setFinances(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[#C8A96A]" size={40} />
            </div>
        );
    }

    const { totalEarnings, pendingEarnings, payments } = finances;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Earnings Summary
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Capital flow and financial health metrics</p>
                </div>
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Wallet size={120} className="text-[#C8A96A]" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-green-50 dark:bg-green-500/10 text-green-500 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">
                                Rs {totalEarnings.toLocaleString()}
                            </h2>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 relative z-10">
                        <span className="flex items-center gap-1 text-green-500">
                            <ArrowUpRight size={14} /> Lifelong verified capital
                        </span>
                        <span>100% Cleared</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Clock size={120} className="text-[#C8A96A]" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500 rounded-xl">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Escrow</p>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">
                                Rs {pendingEarnings.toLocaleString()}
                            </h2>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 relative z-10">
                        <span className="flex items-center gap-1 text-yellow-500">
                            Awaiting customer clear
                        </span>
                        <span>Linked to active active queues</span>
                    </div>
                </motion.div>
            </div>

            {/* Visual Bar Logic */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm"
            >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">Aggregate Capital Flow</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Total Liquidated</span>
                            <span className="text-green-500">{(totalEarnings / ((totalEarnings + pendingEarnings) || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#111c21] rounded-full h-2 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${(totalEarnings / ((totalEarnings + pendingEarnings) || 1) * 100)}%` }} 
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-green-500 h-full rounded-full"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Locked in Pipeline</span>
                            <span className="text-yellow-500">{(pendingEarnings / ((totalEarnings + pendingEarnings) || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#111c21] rounded-full h-2 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${(pendingEarnings / ((totalEarnings + pendingEarnings) || 1) * 100)}%` }} 
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-yellow-500 h-full rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

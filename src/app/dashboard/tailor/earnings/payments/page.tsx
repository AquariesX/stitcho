"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
    CreditCard, ArrowUpRight, Search, Loader2, ArrowRight
} from "lucide-react";
import { getTailorFinances } from "@/app/actions/financeActions";
import { PaymentStatus } from "@prisma/client";

export default function MyPaymentsPage() {
    const { user } = useAuth();
    const [finances, setFinances] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

    const { payments } = finances;

    const filteredPayments = payments.filter((p: any) => 
        p.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.orderId.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        My Payments
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Immutable ledger of incoming capital clearing events</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by customer, product, or Order ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#16252c] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/50 transition-all dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Payments Ledger */}
            <div className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                {filteredPayments.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-16">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4">
                            <CreditCard size={32} className="text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white text-gray-800 text-center">No Transactions Record</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
                            {searchTerm ? "No payments match your search criteria." : "Capital flow ledger is completely empty. Accept orders to stream revenue."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#111c21]">
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction Route</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client Context</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Blockchain Status</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Txs Signature</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {filteredPayments.map((p: any, idx: number) => (
                                        <motion.tr 
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${p.status === PaymentStatus.PAID ? 'bg-green-50 dark:bg-green-500/10 text-green-500' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500'}`}>
                                                        {p.status === PaymentStatus.PAID ? <ArrowUpRight size={16} /> : <CreditCard size={16} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-900 dark:text-white">ORD-{p.orderId.toString().padStart(4, '0')}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(p.date).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{p.customer}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{p.product}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-black text-sm text-[#C8A96A]">{p.amount.toLocaleString()} {p.currency}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                    ${p.status === PaymentStatus.PAID 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' 
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'
                                                    }`}
                                                >
                                                    {p.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-mono text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                                    {p.stripeId.substring(0, 14)}...
                                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C8A96A] hover:underline">
                                                        View <ArrowRight size={10} className="inline" />
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
            </div>
        </div>
    );
}

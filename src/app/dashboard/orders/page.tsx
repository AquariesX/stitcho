"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag, Search, Loader2
} from "lucide-react";
import { getAllOrders } from "@/app/actions/adminOrdersActions";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    PAID: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    CUTTING: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    STITCHING: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    READY: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
    DELIVERED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const fetchedOrders = await getAllOrders();
            setOrders(fetchedOrders);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const filteredOrders = orders.filter(o => 
        o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Global Orders Overview
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Centralized view of all platform orders</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search orders..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#16252c] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/50 transition-all dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="animate-pulse bg-white dark:bg-[#16252c] h-48 rounded-2xl border border-gray-100 dark:border-white/5"></div>
                    ))}
                </div>
            ) : filteredOrders.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm min-h-[400px]"
                >
                    <div className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white text-gray-800">No Orders Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                        {searchTerm ? "No orders match your search criteria." : "There are currently no orders placed on the platform."}
                    </p>
                </motion.div>
            ) : (
                <div className="overflow-x-auto bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#111c21]">
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Value</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Master Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredOrders.map((order, idx) => (
                                    <motion.tr 
                                        key={order.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                                            ORD-{order.id.toString().padStart(4, '0')}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">
                                            <div className="font-semibold text-sm">{order.customer.name}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">
                                            {order.product.name}
                                        </td>
                                        <td className="p-4 font-black text-[#C8A96A]">
                                            Rs {order.totalPrice.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || STATUS_COLORS.PENDING}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

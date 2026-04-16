"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
    ShoppingBag, Trash2, Search, Loader2, ChevronDown, Check
} from "lucide-react";
import { 
    getTailorOrders, updateOrderStatus, deleteOrder 
} from "@/app/actions/tailorOrdersActions";
import { OrderStatus } from "@prisma/client";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    PAID: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    CUTTING: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    STITCHING: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    READY: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
    DELIVERED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
};

const STATUS_OPTIONS = ["PENDING", "PAID", "CUTTING", "STITCHING", "READY", "DELIVERED", "CANCELLED"] as OrderStatus[];

export default function PendingOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const fetchedOrders = await getTailorOrders(user!.id);
            setOrders(fetchedOrders);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
        const previousOrders = [...orders];
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        
        const res = await updateOrderStatus(orderId, newStatus);
        if (!res.success) {
            setOrders(previousOrders);
            alert("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setLoadingSubmit(true);
        const res = await deleteOrder(deletingId);
        if (res.success) {
            setOrders(orders.filter(o => o.id !== deletingId));
            setIsDeleteOpen(false);
        } else {
            alert("Failed to delete");
        }
        setLoadingSubmit(false);
    };

    const openDeleteModal = (id: number) => {
        setDeletingId(id);
        setIsDeleteOpen(true);
    };

    // FILTER SPECIFIC: Only Pending & Paid
    const relevantOrders = orders.filter(o => o.status === "PENDING" || o.status === "PAID");

    const filteredOrders = relevantOrders.filter(o => 
        o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Pending Orders
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Awaiting initiation into the production pipeline</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search pending..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#16252c] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/50 transition-all dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-white dark:bg-[#16252c] h-64 rounded-2xl border border-gray-100 dark:border-white/5"></div>
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
                    <h3 className="text-xl font-bold dark:text-white text-gray-800">No Pending Orders</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                        {searchTerm ? "No results match your search." : "You have successfully cleared your incoming queue."}
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredOrders.map((order, idx) => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                className="group bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm hover:shadow-xl hover:border-[#C8A96A]/30 dark:hover:border-[#C8A96A]/30 transition-all duration-300 flex flex-col relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#f3f4f6] dark:bg-[#111c21] flex items-center justify-center text-[#223943] dark:text-[#C8A96A] font-bold shadow-sm">
                                            {order.customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{order.customer.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                ORD-{order.id.toString().padStart(4, '0')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="relative group/dropdown">
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_COLORS[order.status] || STATUS_COLORS.PENDING}`}>
                                            {order.status} <ChevronDown size={12} />
                                        </div>
                                        <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-[#1a2b33] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 overflow-hidden">
                                            {STATUS_OPTIONS.map(statusOption => (
                                                <button
                                                    key={statusOption}
                                                    onClick={() => handleStatusChange(order.id, statusOption)}
                                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between
                                                        ${order.status === statusOption ? 'font-bold text-[#223943] dark:text-[#C8A96A]' : 'text-gray-600 dark:text-gray-300'}
                                                    `}
                                                >
                                                    {statusOption}
                                                    {order.status === statusOption && <Check size={12} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-white/5">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Design Flow</span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{order.product.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-white/5">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Fabric</span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">{order.fabric.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-white/5">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Measurements</span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">{order.measurement.label}</span>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-end">
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Total Bill</span>
                                        <span className="text-xl font-black text-[#C8A96A]">Rs {order.totalPrice.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openDeleteModal(order.id)}
                                            className="p-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AnimatePresence>
                {isDeleteOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setIsDeleteOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed z-50 bg-white dark:bg-[#16252c] rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-red-500/20"
                        >
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h2 className="text-xl font-bold dark:text-white mb-2">Delete Record?</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This strict pipeline destruction action cannot be seamlessly undone. Proceed immediately?</p>
                            
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                                <button disabled={loadingSubmit} onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                                    {loadingSubmit ? <Loader2 size={16} className="animate-spin" /> : "Destroy"}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

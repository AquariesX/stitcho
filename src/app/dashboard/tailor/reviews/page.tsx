"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
    Star, MessageSquareQuote, Search, Loader2, Quote, User
} from "lucide-react";
import { getTailorReviews } from "@/app/actions/reviewActions";

export default function CustomerReviewsPage() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (user?.id) fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const data = await getTailorReviews(user!.id);
            setReviews(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const filteredReviews = reviews.filter(r => 
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calc metrics
    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
        : 0;
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Customer Reception
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Verified reviews and post-delivery experiences</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search feedback..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#16252c] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/50 transition-all dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Overview */}
            {!loading && reviews.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row gap-6"
                >
                    <div className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-6 min-w-[250px]">
                        <div className="p-4 bg-yellow-50 dark:bg-[#C8A96A]/10 text-yellow-500 dark:text-[#C8A96A] rounded-2xl">
                            <Star size={32} className="fill-current" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average Rating</p>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {averageRating} <span className="text-lg text-gray-400">/ 5.0</span>
                            </h2>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-[#16252c] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-6 flex-1">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-2xl">
                            <MessageSquareQuote size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Received</p>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {reviews.length} Verified
                            </h2>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Reviews Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="animate-pulse bg-white dark:bg-[#16252c] h-56 rounded-2xl border border-gray-100 dark:border-white/5"></div>
                    ))}
                </div>
            ) : filteredReviews.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm min-h-[400px]"
                >
                    <div className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4">
                        <Quote size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white text-gray-800 text-center">No Reviews Available</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
                        {searchTerm ? "No feedback matches your exact search criteria." : "Once you start completing and delivering orders, customer feedback will strictly aggregate here."}
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredReviews.map((r, idx) => (
                            <motion.div
                                key={r.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm hover:shadow-xl hover:border-[#C8A96A]/30 transition-all duration-300 flex flex-col relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none text-gray-900 dark:text-white">
                                    <Quote size={120} />
                                </div>
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-black/20 flex items-center justify-center text-[#223943] dark:text-[#C8A96A] font-black outline outline-2 outline-gray-50 dark:outline-[#111c21]">
                                            {r.customerPhoto ? (
                                                <img src={r.customerPhoto} alt={r.customerName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">{r.customerName}</h3>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                                                {new Date(r.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-0.5 bg-yellow-50 dark:bg-[#C8A96A]/10 px-2 py-1 rounded-full">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} className={i < r.rating ? "text-yellow-500 dark:text-[#C8A96A] fill-current" : "text-gray-300 dark:text-gray-600"} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 mb-4 relative z-10">
                                    <div className="pl-3 border-l-2 border-[#C8A96A]/30">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                            "{r.comment}"
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-white/5 relative z-10 flex items-center justify-between">
                                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        Product Context
                                    </div>
                                    <div className="text-xs font-black text-gray-800 dark:text-[#C8A96A] truncate max-w-[150px]">
                                        {r.productName}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
    Ruler, Search, Plus, Trash2, Edit3, X, Eye, 
    Save, ShieldCheck, UserCheck, Loader2
} from "lucide-react";
import { 
    getMeasurements, createMeasurement, updateMeasurement, deleteMeasurement 
} from "@/app/actions/measurementsActions";

export default function MeasurementsPage() {
    const { user } = useAuth();
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<"STANDARD" | "CUSTOM">("STANDARD");

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Form payload
    const [formData, setFormData] = useState({
        label: "",
        neck: 15,
        chest: 38,
        stomach: 36,
        length: 28,
        shoulder: 18,
        sleeve: 24,
        scale: "INCH",
        type: "STANDARD"
    });

    useEffect(() => {
        if (user?.id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getMeasurements(user!.id);
            setMeasurements(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({
            label: "", neck: 15, chest: 38, stomach: 36, length: 28, shoulder: 18, sleeve: 24, scale: "INCH", type: activeTab
        });
        setIsFormOpen(true);
    };

    const openEdit = (m: any) => {
        setEditingId(m.id);
        setFormData({
            label: m.label, neck: m.neck, chest: m.chest, stomach: m.stomach, 
            length: m.length, shoulder: m.shoulder, sleeve: m.sleeve, 
            scale: m.scale, type: m.type
        });
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            if (editingId) {
                const res = await updateMeasurement(editingId, formData);
                if (res.success) {
                    setMeasurements(measurements.map(m => m.id === editingId ? { ...m, ...formData } : m));
                    setIsFormOpen(false);
                } else {
                    alert(res.error);
                }
            } else {
                const res = await createMeasurement(user!.id, formData);
                if (res.success) {
                    setMeasurements([{ id: res.id, ...formData, createdAt: new Date() }, ...measurements]);
                    setIsFormOpen(false);
                } else {
                    alert(res.error);
                }
            }
        } catch (err) {
            console.error(err);
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setIsSubmitting(true);
        const res = await deleteMeasurement(deletingId);
        if (res.success) {
            setMeasurements(measurements.filter(m => m.id !== deletingId));
            setIsDeleteOpen(false);
        } else {
            alert(res.error);
        }
        setIsSubmitting(false);
    };

    const filteredMeasurements = measurements.filter(m => 
        m.type === activeTab && m.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        Measurements Matrix
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage global standard sizes and precise custom fits.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search profiles..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#16252c] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A96A]/50 transition-all dark:text-white"
                        />
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={openCreate}
                        className="bg-[#C8A96A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-[#C8A96A]/20 hover:bg-[#b09255] transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Add Layout</span>
                    </motion.button>
                </div>
            </div>

            {/* Smart Navigation Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-[#111c21] rounded-2xl w-full max-w-sm border border-gray-200 dark:border-white/5 shadow-inner">
                <button 
                    onClick={() => setActiveTab("STANDARD")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'STANDARD' ? 'bg-white dark:bg-[#1a2b33] text-gray-900 dark:text-[#C8A96A] shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <ShieldCheck size={16} /> Global Standards
                </button>
                <button 
                    onClick={() => setActiveTab("CUSTOM")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'CUSTOM' ? 'bg-white dark:bg-[#1a2b33] text-gray-900 dark:text-[#C8A96A] shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <UserCheck size={16} /> Custom Client Profiles
                </button>
            </div>

            {/* Matrix Viewer */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="animate-pulse bg-white dark:bg-[#16252c] h-56 rounded-2xl border border-gray-100 dark:border-white/5"></div>
                    ))}
                </div>
            ) : filteredMeasurements.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm min-h-[400px]"
                >
                    <div className="w-20 h-20 bg-gray-50 dark:bg-[#111c21] rounded-full flex items-center justify-center mb-4">
                        <Ruler size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white text-gray-800 text-center">
                        No {activeTab === "STANDARD" ? "Standard Size Keys" : "Custom Profiles"} Found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
                        Create layout keys to streamline measuring workflow.
                    </p>
                    <button onClick={openCreate} className="mt-6 text-[#C8A96A] font-medium hover:underline text-sm">
                        + Initialize First Layout
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredMeasurements.map((m, idx) => (
                            <motion.div 
                                key={m.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white dark:bg-[#16252c] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-[#C8A96A]/30 transition-all group overflow-hidden"
                            >
                                <div className="p-5 border-b border-gray-50 dark:border-white/5 relative bg-gradient-to-br from-transparent to-gray-50/50 dark:to-black/20">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-extrabold text-xl font-sans text-gray-900 dark:text-white flex items-center gap-2">
                                            {m.label} 
                                            {activeTab === "STANDARD" && <span className="text-[10px] uppercase tracking-wider bg-black dark:bg-[#C8A96A] text-white dark:text-[#111c21] px-2 py-0.5 rounded-md">Auth</span>}
                                        </h3>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button onClick={() => openEdit(m)} className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-500 hover:text-white transition">
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => { setDeletingId(m.id); setIsDeleteOpen(true); }} className="p-1.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">Scale: {m.scale}</p>
                                </div>
                                
                                <div className="p-5 space-y-3 relative">
                                    {/* Blueprint mapping overlay */}
                                    <div className="absolute right-[-20px] bottom-[-20px] opacity-5 pointer-events-none text-gray-900 dark:text-white">
                                        <Ruler size={120} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 z-10 relative">
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Neck</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.neck}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Chest</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.chest}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Shoulder</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.shoulder}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Sleeve</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.sleeve}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Stomach</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.stomach}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Length</p>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{m.length}</p>
                                        </div>
                                    </div>
                                </div>
                                {m.orders && m.orders.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-white/5 px-5 py-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <ShieldCheck size={12} /> Linked to {m.orders.length} Order{m.orders.length > 1 ? 's' : ''}
                                        </div>
                                        <Eye size={12} className="text-[#C8A96A]" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            <AnimatePresence>
                {isFormOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setIsFormOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed z-50 bg-white dark:bg-[#16252c] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-gray-100 dark:border-white/10"
                        >
                            <div className="sticky top-0 bg-white/80 dark:bg-[#16252c]/80 backdrop-blur-md px-6 py-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {editingId ? "Update Layout Matrix" : "Configure New Layout"}
                                </h2>
                                <button onClick={() => setIsFormOpen(false)} className="p-2 bg-gray-100 dark:bg-[#111c21] rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-6">
                                <div className="space-y-6">
                                    {/* Core Meta */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Display Label (e.g. Medium / John Doe)</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={formData.label}
                                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-[#111c21] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#C8A96A] focus:outline-none transition-all"
                                                placeholder={formData.type === "STANDARD" ? "Large (L)" : "Customer Profile"}
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Measurement Unit Structure</label>
                                            <select 
                                                value={formData.scale}
                                                onChange={e => setFormData({ ...formData, scale: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-[#111c21] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#C8A96A] focus:outline-none transition-all appearance-none"
                                            >
                                                <option value="INCH">Imperial (Inches)</option>
                                                <option value="CM">Metric (Centimeters)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Matrix Grid */}
                                    <div className="bg-gray-50 dark:bg-[#111c21] p-6 rounded-2xl border border-gray-100 dark:border-white/5 space-y-6">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/5 pb-2">Body Geometry (Upper & Extent)</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {/* Iterator mapping for sliders to save UI logic */}
                                            {[
                                                { id: 'neck', name: 'Neck Circumference', max: 25 },
                                                { id: 'chest', name: 'Chest Width', max: 60 },
                                                { id: 'shoulder', name: 'Shoulder Drop', max: 30 },
                                                { id: 'sleeve', name: 'Sleeve Extension', max: 40 },
                                                { id: 'stomach', name: 'Waist / Stomach', max: 60 },
                                                { id: 'length', name: 'Total Drop Length', max: 60 }
                                            ].map(field => (
                                                <div key={field.id} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 capitalize">{field.name}</label>
                                                        <span className="text-xs font-black text-[#C8A96A]">{(formData as any)[field.id]}</span>
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="1" max={field.max} step="0.5"
                                                        value={(formData as any)[field.id]}
                                                        onChange={(e) => setFormData({ ...formData, [field.id]: parseFloat(e.target.value) })}
                                                        className="w-full accent-[#C8A96A] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="mt-8 flex gap-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsFormOpen(false)}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-[#111c21] hover:bg-gray-200 dark:hover:bg-white/5 text-gray-800 dark:text-white rounded-xl font-semibold transition-colors"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-[#C8A96A] hover:bg-[#b09255] text-white rounded-xl font-bold shadow-lg shadow-[#C8A96A]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Serialize to Database</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* DELETE MODAL */}
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
                            <h2 className="text-xl font-bold dark:text-white mb-2">Delete Blueprint?</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This strict pipeline destruction action cannot be seamlessly undone. Proceed immediately?</p>
                            
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                                <button disabled={isSubmitting} onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Destroy"}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateAdmin, getAdminById } from "@/app/actions/admin-actions";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Mail, Phone, Save, Loader2, CheckCircle2,
    AlertCircle, ShieldCheck, Lock, Camera
} from "lucide-react";
import clsx from "clsx";

export default function AdminProfilePage() {
    const { user: authUser } = useAuth(); // Use authUser as the context user
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
    });

    // Fetch latest user data from server
    useEffect(() => {
        const fetchAdminProfile = async () => {
            if (authUser?.id) {
                try {
                    const res = await getAdminById(authUser.id);
                    if (res.success && res.data) {
                        setFormData({
                            name: res.data.name || "",
                            email: res.data.email || "",
                            phoneNumber: res.data.phoneNumber || "",
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch admin profile:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchAdminProfile();
    }, [authUser]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser?.id) return;

        setSaving(true);
        setMessage(null);

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("phoneNumber", formData.phoneNumber);

            const result = await updateAdmin(authUser.id, data);

            if (result.success) {
                setMessage({ type: "success", text: "Profile updated successfully!" });
            } else {
                setMessage({ type: "error", text: result.error || "Failed to update profile." });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: "error", text: "An unexpected error occurred." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#223943]" size={40} />
            </div>
        );
    }

    if (!authUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="text-red-500" size={48} />
                <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-500">Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#223943] via-[#2c4a57] to-[#1a3540] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-4xl font-bold uppercase">
                            {formData.name ? formData.name.charAt(0) : (authUser.name?.charAt(0) || "A")}
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-white text-[#223943] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50" disabled title="Photo upload not available">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">{formData.name || authUser.name}</h1>
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            <span>Administrator Account</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Profile Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <User className="text-[#223943]" size={20} />
                                Personal Information
                            </h2>
                            <AnimatePresence>
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                                            message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                        )}
                                    >
                                        {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        {message.text}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Admin Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 ml-1">Changes to email will require re-verification.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className={clsx(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl active:scale-95",
                                    saving ? "bg-gray-400 cursor-wait" : "bg-[#223943] hover:bg-[#1b2d35]"
                                )}
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? "Saving Changes..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    {/* Account Security Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Lock className="text-[#223943]" size={18} />
                            Security
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Protect your account with a strong password and two-factor authentication.
                        </p>
                        <button className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-colors text-sm border border-gray-200 flex items-center justify-center gap-2">
                            Change Password
                        </button>
                    </div>

                    {/* Role Info Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="text-emerald-600 mt-1" size={24} />
                            <div>
                                <h3 className="text-lg font-bold text-emerald-900">Admin Role</h3>
                                <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
                                    You have full access to manage users, settings, and system configurations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

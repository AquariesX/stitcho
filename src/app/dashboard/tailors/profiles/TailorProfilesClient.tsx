"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    User,
    Mail,
    Phone,
    CheckCircle2,
    XCircle,
    Calendar,
    Shield,
    ShieldAlert,
    Eye,
    X,
    Scissors,
    Store,
    MapPin,
    Clock,
    Award,
    ChevronRight,
    Users,
    Filter,
} from "lucide-react";
import { TailorWithShop } from "@/app/actions/tailor-management-actions";

interface TailorProfilesClientProps {
    initialTailors: TailorWithShop[];
}

export default function TailorProfilesClient({ initialTailors }: TailorProfilesClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [selectedTailor, setSelectedTailor] = useState<TailorWithShop | null>(null);

    const filteredTailors = initialTailors.filter((tailor) => {
        const matchesSearch =
            tailor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tailor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tailor.phoneNumber?.includes(searchQuery);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && tailor.isActive) ||
            (statusFilter === "inactive" && !tailor.isActive);

        return matchesSearch && matchesStatus;
    });

    const activeCount = initialTailors.filter((t) => t.isActive).length;
    const inactiveCount = initialTailors.filter((t) => !t.isActive).length;
    const withShopCount = initialTailors.filter((t) => t.shopProfile).length;

    return (
        <>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#223943] to-[#2c4a57] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
                                <Scissors className="opacity-80" size={36} />
                                Tailor Profiles
                            </h1>
                            <p className="text-white/70 max-w-xl text-lg">
                                View and manage all registered tailor profiles. Monitor their account status and personal information.
                            </p>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex flex-wrap gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Users size={20} className="text-white/70" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Total Tailors</p>
                                <p className="text-2xl font-bold">{initialTailors.length}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-emerald-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Active</p>
                                <p className="text-2xl font-bold">{activeCount}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <XCircle size={20} className="text-red-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Inactive</p>
                                <p className="text-2xl font-bold">{inactiveCount}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Store size={20} className="text-amber-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">With Shop</p>
                                <p className="text-2xl font-bold">{withShopCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Search & Filter Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223943]/30 focus:border-[#223943] text-gray-800 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223943]/30 focus:border-[#223943] text-gray-700 bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Tailor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredTailors.length > 0 ? (
                        filteredTailors.map((tailor, index) => (
                            <motion.div
                                key={tailor.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 group"
                            >
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
                                    <div className="relative z-10 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl border border-white/10 shrink-0">
                                            {tailor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-white font-bold text-lg truncate">{tailor.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${tailor.isActive
                                                        ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                                                        : "bg-red-400/20 text-red-200 border border-red-400/30"
                                                    }`}>
                                                    {tailor.isActive ? "Active" : "Inactive"}
                                                </span>
                                                {tailor.shopProfile && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-400/30">
                                                        <Store size={10} className="mr-1" /> Shop
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5 space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Mail size={14} className="text-blue-500" />
                                            </div>
                                            <span className="text-sm truncate">{tailor.email || "No email"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                <Phone size={14} className="text-green-500" />
                                            </div>
                                            <span className="text-sm">{tailor.phoneNumber || "No phone"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                                {tailor.emailVerified ? (
                                                    <Shield size={14} className="text-purple-500" />
                                                ) : (
                                                    <ShieldAlert size={14} className="text-amber-500" />
                                                )}
                                            </div>
                                            <span className={`text-sm font-medium ${tailor.emailVerified ? "text-green-600" : "text-amber-600"}`}>
                                                {tailor.emailVerified ? "Email Verified" : "Email Unverified"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                                <Calendar size={14} className="text-slate-500" />
                                            </div>
                                            <span className="text-sm">
                                                Joined {new Date(tailor.createdAt).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* View Details Button */}
                                    <button
                                        onClick={() => setSelectedTailor(tailor)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-[#223943] text-gray-600 hover:text-white rounded-xl transition-all duration-300 font-medium text-sm group/btn border border-gray-100 hover:border-[#223943]"
                                    >
                                        <Eye size={16} />
                                        View Full Profile
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full"
                        >
                            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Scissors size={56} className="text-gray-200 mb-4" />
                                <p className="font-semibold text-gray-800 text-lg">No tailors found</p>
                                <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedTailor && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTailor(null)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: "100%" }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: "100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] p-6 sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-white">Tailor Profile</h2>
                                    <button
                                        onClick={() => setSelectedTailor(null)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border border-white/10">
                                        {selectedTailor.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-xl">{selectedTailor.name}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${selectedTailor.isActive
                                                    ? "bg-emerald-400/20 text-emerald-200"
                                                    : "bg-red-400/20 text-red-200"
                                                }`}>
                                                {selectedTailor.isActive ? "● Active" : "● Inactive"}
                                            </span>
                                            <span className="text-white/50 text-xs">
                                                ID: #{selectedTailor.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Personal Information */}
                                <div className="bg-gray-50 rounded-2xl p-5">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <User size={16} className="text-[#223943]" />
                                        Personal Information
                                    </h4>
                                    <div className="space-y-4">
                                        <DetailRow icon={<User size={16} />} label="Full Name" value={selectedTailor.name} />
                                        <DetailRow icon={<Mail size={16} />} label="Email" value={selectedTailor.email || "Not provided"} />
                                        <DetailRow icon={<Phone size={16} />} label="Phone" value={selectedTailor.phoneNumber || "Not provided"} />
                                        <DetailRow
                                            icon={selectedTailor.emailVerified ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                            label="Email Status"
                                            value={selectedTailor.emailVerified ? "Verified" : "Unverified"}
                                            valueColor={selectedTailor.emailVerified ? "text-emerald-600" : "text-amber-600"}
                                        />
                                        <DetailRow
                                            icon={<Calendar size={16} />}
                                            label="Joined"
                                            value={new Date(selectedTailor.createdAt).toLocaleDateString("en-US", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        />
                                        <DetailRow
                                            icon={<Shield size={16} />}
                                            label="Firebase UID"
                                            value={selectedTailor.firebaseUid}
                                            mono
                                        />
                                    </div>
                                </div>

                                {/* Shop Info Preview */}
                                {selectedTailor.shopProfile ? (
                                    <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100">
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Store size={16} className="text-amber-600" />
                                            Shop Profile
                                        </h4>
                                        <div className="space-y-4">
                                            <DetailRow icon={<Store size={16} />} label="Shop Name" value={selectedTailor.shopProfile.shopName} />
                                            <DetailRow icon={<MapPin size={16} />} label="Address" value={selectedTailor.shopProfile.shopAddress} />
                                            {selectedTailor.shopProfile.city && (
                                                <DetailRow icon={<MapPin size={16} />} label="City" value={selectedTailor.shopProfile.city} />
                                            )}
                                            <DetailRow icon={<Clock size={16} />} label="Working Hours" value={selectedTailor.shopProfile.workingHours} />
                                            <DetailRow icon={<Scissors size={16} />} label="Specialization" value={selectedTailor.shopProfile.specialization} />
                                            <DetailRow icon={<Award size={16} />} label="Experience" value={`${selectedTailor.shopProfile.yearsOfExperience} years`} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                                        <Store size={40} className="text-gray-300 mx-auto mb-3" />
                                        <p className="font-semibold text-gray-700">No Shop Profile</p>
                                        <p className="text-sm text-gray-500 mt-1">This tailor hasn&apos;t set up their shop yet.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

function DetailRow({
    icon,
    label,
    value,
    valueColor = "text-gray-800",
    mono = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-gray-500 shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-medium ${valueColor} ${mono ? "font-mono text-xs break-all" : ""} mt-0.5`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

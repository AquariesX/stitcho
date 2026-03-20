"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Store,
    MapPin,
    Clock,
    Scissors,
    Award,
    Phone,
    Mail,
    Globe,
    Truck,
    Eye,
    X,
    ChevronRight,
    Filter,
    Image as ImageIcon,
    MessageCircle,
    Facebook,
    Instagram,
    User,
    ExternalLink,
    AlertCircle,
} from "lucide-react";
import { TailorWithShop } from "@/app/actions/tailor-management-actions";

interface TailorShopsClientProps {
    initialTailors: TailorWithShop[];
}

export default function TailorShopsClient({ initialTailors }: TailorShopsClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [specializationFilter, setSpecializationFilter] = useState<string>("all");
    const [selectedShop, setSelectedShop] = useState<TailorWithShop | null>(null);

    // Only tailors with shop profiles
    const tailorsWithShops = initialTailors.filter((t) => t.shopProfile !== null);
    const tailorsWithoutShops = initialTailors.filter((t) => t.shopProfile === null);

    // Get unique specializations for filter
    const specializations = Array.from(
        new Set(tailorsWithShops.map((t) => t.shopProfile?.specialization).filter(Boolean))
    );

    const filteredTailors = tailorsWithShops.filter((tailor) => {
        const shop = tailor.shopProfile!;
        const matchesSearch =
            tailor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shop.shopAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shop.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            false;

        const matchesSpec =
            specializationFilter === "all" || shop.specialization === specializationFilter;

        return matchesSearch && matchesSpec;
    });

    const deliveryCount = tailorsWithShops.filter((t) => t.shopProfile?.deliveryAvailable).length;

    return (
        <>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#1a3a2a] to-[#223943] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
                                <Store className="opacity-80" size={36} />
                                Tailor Shops
                            </h1>
                            <p className="text-white/70 max-w-xl text-lg">
                                Browse and manage all tailor shop profiles. View their shop details, specializations, and contact information.
                            </p>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex flex-wrap gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Store size={20} className="text-white/70" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Total Shops</p>
                                <p className="text-2xl font-bold">{tailorsWithShops.length}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <AlertCircle size={20} className="text-amber-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">No Shop Set</p>
                                <p className="text-2xl font-bold">{tailorsWithoutShops.length}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Truck size={20} className="text-emerald-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Delivery Available</p>
                                <p className="text-2xl font-bold">{deliveryCount}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                            <Scissors size={20} className="text-blue-300" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider">Specializations</p>
                                <p className="text-2xl font-bold">{specializations.length}</p>
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
                            placeholder="Search by tailor name, shop name, address, or city..."
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223943]/30 focus:border-[#223943] text-gray-800 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={specializationFilter}
                            onChange={(e) => setSpecializationFilter(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223943]/30 focus:border-[#223943] text-gray-700 bg-white transition-all cursor-pointer"
                        >
                            <option value="all">All Specializations</option>
                            {specializations.map((s) => (
                                <option key={s} value={s!}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Shop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredTailors.length > 0 ? (
                        filteredTailors.map((tailor, index) => {
                            const shop = tailor.shopProfile!;
                            return (
                                <motion.div
                                    key={tailor.id}
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 group"
                                >
                                    {/* Shop Header with Logo */}
                                    <div className="relative h-36 bg-gradient-to-br from-[#1a3a2a] via-[#223943] to-[#2c5a4a] overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />

                                        {/* Shop Logo */}
                                        <div className="absolute bottom-4 left-5 flex items-end gap-3">
                                            {shop.shopLogoUrl ? (
                                                <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg border-2 border-white/50">
                                                    <img
                                                        src={shop.shopLogoUrl}
                                                        alt={shop.shopName}
                                                        className="w-full h-full object-cover rounded-xl"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                                    <Store size={28} className="text-white/70" />
                                                </div>
                                            )}
                                            <div className="pb-1">
                                                <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{shop.shopName}</h3>
                                                <p className="text-white/60 text-xs mt-0.5">by {tailor.name}</p>
                                            </div>
                                        </div>

                                        {/* Delivery Badge */}
                                        {shop.deliveryAvailable && (
                                            <div className="absolute top-3 right-3">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-200 backdrop-blur-sm border border-emerald-400/30">
                                                    <Truck size={12} /> Delivery
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5 space-y-4">
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                                <Scissors size={12} /> {shop.specialization}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                                <Award size={12} /> {shop.yearsOfExperience} yrs
                                            </span>
                                            {shop.priceRange && (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                                                    <span className="text-[10px] font-bold">PKR</span> {shop.priceRange}
                                                </span>
                                            )}
                                        </div>

                                        {/* Key Details */}
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3 text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin size={14} className="text-red-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-800 line-clamp-2">{shop.shopAddress}</p>
                                                    {shop.city && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{[shop.city, shop.state, shop.country].filter(Boolean).join(", ")}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <Clock size={14} className="text-indigo-500" />
                                                </div>
                                                <span className="text-sm">{shop.workingHours}</span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {shop.description && (
                                            <p className="text-sm text-gray-500 line-clamp-2 bg-gray-50 rounded-xl px-4 py-3 italic">
                                                &ldquo;{shop.description}&rdquo;
                                            </p>
                                        )}

                                        {/* View Details Button */}
                                        <button
                                            onClick={() => setSelectedShop(tailor)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-[#223943] text-gray-600 hover:text-white rounded-xl transition-all duration-300 font-medium text-sm group/btn border border-gray-100 hover:border-[#223943]"
                                        >
                                            <Eye size={16} />
                                            View Full Details
                                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full"
                        >
                            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Store size={56} className="text-gray-200 mb-4" />
                                <p className="font-semibold text-gray-800 text-lg">No shops found</p>
                                <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tailors Without Shops Section */}
            {tailorsWithoutShops.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-amber-50/50 rounded-2xl border border-amber-100 p-6"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-600" />
                        Tailors Without Shop Profiles ({tailorsWithoutShops.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {tailorsWithoutShops.map((tailor) => (
                            <div
                                key={tailor.id}
                                className="bg-white rounded-xl p-4 border border-amber-100 flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0">
                                    {tailor.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{tailor.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{tailor.email || "No email"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Full Detail Slide-over Modal */}
            <AnimatePresence>
                {selectedShop && selectedShop.shopProfile && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedShop(null)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: "100%" }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: "100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#1a3a2a] to-[#223943] p-6 sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-white">Shop Details</h2>
                                    <button
                                        onClick={() => setSelectedShop(null)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    {selectedShop.shopProfile.shopLogoUrl ? (
                                        <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg">
                                            <img
                                                src={selectedShop.shopProfile.shopLogoUrl}
                                                alt={selectedShop.shopProfile.shopName}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                                            <Store size={28} className="text-white/70" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-bold text-xl">{selectedShop.shopProfile.shopName}</h3>
                                        <p className="text-white/60 text-sm mt-0.5">Owned by {selectedShop.name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Owner Info */}
                                <div className="bg-slate-50 rounded-2xl p-5">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <User size={16} className="text-[#223943]" />
                                        Shop Owner
                                    </h4>
                                    <div className="space-y-3">
                                        <ShopDetailRow icon={<User size={16} />} label="Owner Name" value={selectedShop.name} />
                                        <ShopDetailRow icon={<Mail size={16} />} label="Owner Email" value={selectedShop.email || "Not provided"} />
                                        <ShopDetailRow icon={<Phone size={16} />} label="Owner Phone" value={selectedShop.phoneNumber || "Not provided"} />
                                    </div>
                                </div>

                                {/* Basic Shop Info */}
                                <div className="bg-green-50/50 rounded-2xl p-5 border border-green-100">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Store size={16} className="text-green-600" />
                                        Shop Information
                                    </h4>
                                    <div className="space-y-3">
                                        <ShopDetailRow icon={<Store size={16} />} label="Shop Name" value={selectedShop.shopProfile.shopName} />
                                        <ShopDetailRow icon={<Scissors size={16} />} label="Specialization" value={selectedShop.shopProfile.specialization} />
                                        <ShopDetailRow icon={<Award size={16} />} label="Experience" value={`${selectedShop.shopProfile.yearsOfExperience} years`} />
                                        <ShopDetailRow icon={<Clock size={16} />} label="Working Hours" value={selectedShop.shopProfile.workingHours} />
                                        {selectedShop.shopProfile.priceRange && (
                                            <ShopDetailRow icon={<span className="text-xs font-bold font-sans">PKR</span>} label="Price Range" value={`${selectedShop.shopProfile.priceRange} (${selectedShop.shopProfile.currency})`} />
                                        )}
                                        {selectedShop.shopProfile.description && (
                                            <div className="pt-2">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                                                <p className="text-sm text-gray-700 bg-white rounded-xl p-4 border border-gray-100 italic leading-relaxed">
                                                    &ldquo;{selectedShop.shopProfile.description}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address Info */}
                                <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <MapPin size={16} className="text-red-600" />
                                        Location & Address
                                    </h4>
                                    <div className="space-y-3">
                                        <ShopDetailRow icon={<MapPin size={16} />} label="Address" value={selectedShop.shopProfile.shopAddress} />
                                        {selectedShop.shopProfile.city && <ShopDetailRow icon={<MapPin size={16} />} label="City" value={selectedShop.shopProfile.city} />}
                                        {selectedShop.shopProfile.state && <ShopDetailRow icon={<MapPin size={16} />} label="State / Province" value={selectedShop.shopProfile.state} />}
                                        {selectedShop.shopProfile.postalCode && <ShopDetailRow icon={<MapPin size={16} />} label="Postal Code" value={selectedShop.shopProfile.postalCode} />}
                                        <ShopDetailRow icon={<MapPin size={16} />} label="Country" value={selectedShop.shopProfile.country || "Not specified"} />
                                        {selectedShop.shopProfile.landmark && <ShopDetailRow icon={<MapPin size={16} />} label="Landmark" value={selectedShop.shopProfile.landmark} />}
                                    </div>
                                </div>

                                {/* Contact & Social */}
                                <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Phone size={16} className="text-indigo-600" />
                                        Contact & Social
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedShop.shopProfile.phoneNumber && <ShopDetailRow icon={<Phone size={16} />} label="Shop Phone" value={selectedShop.shopProfile.phoneNumber} />}
                                        {selectedShop.shopProfile.whatsappNumber && <ShopDetailRow icon={<MessageCircle size={16} />} label="WhatsApp" value={selectedShop.shopProfile.whatsappNumber} />}
                                        {selectedShop.shopProfile.shopEmail && <ShopDetailRow icon={<Mail size={16} />} label="Shop Email" value={selectedShop.shopProfile.shopEmail} />}
                                        {selectedShop.shopProfile.website && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-gray-500 shadow-sm">
                                                    <Globe size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Website</p>
                                                    <a href={selectedShop.shopProfile.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                                                        {selectedShop.shopProfile.website} <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {selectedShop.shopProfile.facebookUrl && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-gray-500 shadow-sm">
                                                    <Facebook size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Facebook</p>
                                                    <a href={selectedShop.shopProfile.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-0.5 break-all">
                                                        {selectedShop.shopProfile.facebookUrl} <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {selectedShop.shopProfile.instagramUrl && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-gray-500 shadow-sm">
                                                    <Instagram size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Instagram</p>
                                                    <a href={selectedShop.shopProfile.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-0.5 break-all">
                                                        {selectedShop.shopProfile.instagramUrl} <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {!selectedShop.shopProfile.phoneNumber &&
                                            !selectedShop.shopProfile.whatsappNumber &&
                                            !selectedShop.shopProfile.shopEmail &&
                                            !selectedShop.shopProfile.website &&
                                            !selectedShop.shopProfile.facebookUrl &&
                                            !selectedShop.shopProfile.instagramUrl && (
                                                <p className="text-sm text-gray-500 italic text-center py-4">No contact or social information added yet.</p>
                                            )}
                                    </div>
                                </div>

                                {/* Delivery Info */}
                                <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Truck size={16} className="text-emerald-600" />
                                        Delivery
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${selectedShop.shopProfile.deliveryAvailable ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
                                                <Truck size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Delivery Status</p>
                                                <p className={`text-sm font-semibold mt-0.5 ${selectedShop.shopProfile.deliveryAvailable ? "text-emerald-600" : "text-red-600"}`}>
                                                    {selectedShop.shopProfile.deliveryAvailable ? "Available" : "Not Available"}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedShop.shopProfile.deliveryRadius && (
                                            <ShopDetailRow icon={<MapPin size={16} />} label="Delivery Radius" value={selectedShop.shopProfile.deliveryRadius} />
                                        )}
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="bg-gray-50 rounded-2xl p-5">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Clock size={16} className="text-gray-600" />
                                        Timestamps
                                    </h4>
                                    <div className="space-y-3">
                                        <ShopDetailRow
                                            icon={<Clock size={16} />}
                                            label="Profile Created"
                                            value={new Date(selectedShop.shopProfile.createdAt).toLocaleDateString("en-US", {
                                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                                            })}
                                        />
                                        <ShopDetailRow
                                            icon={<Clock size={16} />}
                                            label="Last Updated"
                                            value={new Date(selectedShop.shopProfile.updatedAt).toLocaleDateString("en-US", {
                                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

function ShopDetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 text-gray-500 shadow-sm">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

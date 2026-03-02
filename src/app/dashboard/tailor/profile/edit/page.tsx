"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getShopProfile, updateShopAddressInfo } from "@/app/actions/shop-profile-actions";
import { useAddressData } from "@/hooks/useAddressData";
import { motion, AnimatePresence } from "framer-motion";
import {
    Save, MapPin, Phone, Globe, Mail, Truck, Navigation,
    Loader2, CheckCircle2, AlertCircle, Building2, Hash,
    MessageCircle, Facebook, Instagram, MapPinned, ArrowLeft,
    ChevronDown, Search
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface AddressInfoData {
    shopAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark: string;
    phoneNumber: string;
    whatsappNumber: string;
    shopEmail: string;
    website: string;
    facebookUrl: string;
    instagramUrl: string;
    deliveryAvailable: boolean;
    deliveryRadius: string;
}


export default function UpdateAddressInfoPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"address" | "contact" | "social" | "delivery">("address");
    const [initialLoaded, setInitialLoaded] = useState(false);

    // International address data
    const {
        countries,
        states: availableStates,
        cities: availableCities,
        loadingCountries,
        loadingStates,
        loadingCities,
        fetchStates,
        fetchCities,
    } = useAddressData();

    const [formData, setFormData] = useState<AddressInfoData>({
        shopAddress: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Pakistan",
        landmark: "",
        phoneNumber: "",
        whatsappNumber: "",
        shopEmail: "",
        website: "",
        facebookUrl: "",
        instagramUrl: "",
        deliveryAvailable: false,
        deliveryRadius: "",
    });

    useEffect(() => {
        if (user?.id) {
            fetchProfile(user.id);
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchProfile = async (userId: number) => {
        try {
            const res = await getShopProfile(userId);
            if (res.success && res.data) {
                setHasProfile(true);
                const d = res.data;
                const savedCountry = d.country || "Pakistan";
                const savedState = d.state || "";
                const savedCity = d.city || "";

                setFormData({
                    shopAddress: d.shopAddress || "",
                    city: savedCity,
                    state: savedState,
                    postalCode: d.postalCode || "",
                    country: savedCountry,
                    landmark: d.landmark || "",
                    phoneNumber: d.phoneNumber || "",
                    whatsappNumber: d.whatsappNumber || "",
                    shopEmail: d.shopEmail || "",
                    website: d.website || "",
                    facebookUrl: d.facebookUrl || "",
                    instagramUrl: d.instagramUrl || "",
                    deliveryAvailable: d.deliveryAvailable || false,
                    deliveryRadius: d.deliveryRadius || "",
                });

                // Auto-load states and cities for existing profile data
                if (savedCountry) {
                    await fetchStates(savedCountry);
                    if (savedState) {
                        await fetchCities(savedCountry, savedState);
                    }
                }
                setInitialLoaded(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // Cascading country change handler
    const handleCountryChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const country = e.target.value;
        setFormData((prev) => ({ ...prev, country, state: "", city: "" }));
        if (country) {
            await fetchStates(country);
        }
    }, [fetchStates]);

    // Cascading state change handler
    const handleStateChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const state = e.target.value;
        setFormData((prev) => ({ ...prev, state, city: "" }));
        if (formData.country && state) {
            await fetchCities(formData.country, state);
        }
    }, [fetchCities, formData.country]);

    // City change handler
    const handleCityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, city: e.target.value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setSaving(true);
        const fd = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            fd.append(key, String(value));
        });

        try {
            const res = await updateShopAddressInfo(user.id, fd);
            if (res.success) {
                setToast({ type: "success", message: "Address & info updated successfully!" });
            } else {
                setToast({ type: "error", message: res.error || "Failed to update." });
            }
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "An unexpected error occurred." });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { key: "address" as const, label: "Address", icon: MapPin },
        { key: "contact" as const, label: "Contact", icon: Phone },
        { key: "social" as const, label: "Social Media", icon: Globe },
        { key: "delivery" as const, label: "Delivery", icon: Truck },
    ];

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin text-[#223943] mx-auto mb-4" size={48} />
                    <p className="text-gray-500 text-sm">Loading your info...</p>
                </div>
            </div>
        );
    }

    if (!hasProfile) {
        return (
            <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto"
                >
                    <AlertCircle className="text-amber-600" size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800">No Shop Profile Found</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    You need to set up your basic shop profile first before you can update your address and contact information.
                </p>
                <Link
                    href="/dashboard/tailor/profile"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#223943] text-white rounded-xl font-semibold hover:bg-[#1b2d35] transition-all"
                >
                    <ArrowLeft size={18} />
                    Go to Shop Profile
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -30, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -30, x: "-50%" }}
                        className={clsx(
                            "fixed top-6 left-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-medium min-w-[320px]",
                            toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
                        )}
                    >
                        {toast.type === "success" ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#223943] via-[#2c4a57] to-[#1a3540] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10">
                    <Link
                        href="/dashboard/tailor/profile"
                        className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Shop Profile
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                        Update Address & Info
                    </h1>
                    <p className="text-white/60 text-lg max-w-xl">
                        Keep your shop location, contact details, and social presence up to date for customers.
                    </p>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex gap-1 overflow-x-auto"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all flex-1 justify-center whitespace-nowrap",
                                isActive
                                    ? "bg-[#223943] text-white shadow-lg"
                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            )}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </motion.div>

            {/* Form Content */}
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <AnimatePresence mode="wait">
                    {/* ── ADDRESS TAB ── */}
                    {activeTab === "address" && (
                        <motion.div
                            key="address"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
                        >
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <MapPin className="text-[#223943]" size={24} />
                                Shop Address
                            </h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Street Address <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        name="shopAddress"
                                        required
                                        rows={3}
                                        value={formData.shopAddress}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400 resize-none"
                                        placeholder="e.g. Shop #12, Block C, Main Bazaar, Model Town"
                                    />
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Country <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute top-3.5 left-4 text-gray-400 z-10" size={18} />
                                        {loadingCountries ? (
                                            <div className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2 text-gray-400">
                                                <Loader2 className="animate-spin" size={16} />
                                                Loading countries...
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    name="country"
                                                    value={formData.country}
                                                    onChange={handleCountryChange}
                                                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select Country</option>
                                                    {countries.map(c => (
                                                        <option key={c.iso2} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute top-3.5 right-4 text-gray-400 pointer-events-none" size={18} />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* State / Province */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Province / State</label>
                                        <div className="relative">
                                            <Navigation className="absolute top-3.5 left-4 text-gray-400 z-10" size={18} />
                                            {loadingStates ? (
                                                <div className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2 text-gray-400">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Loading states...
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        name="state"
                                                        value={formData.state}
                                                        onChange={handleStateChange}
                                                        disabled={!formData.country || availableStates.length === 0}
                                                        className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white appearance-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                                    >
                                                        <option value="">
                                                            {!formData.country
                                                                ? "Select country first"
                                                                : availableStates.length === 0
                                                                    ? "No states available"
                                                                    : "Select State / Province"}
                                                        </option>
                                                        {availableStates.map(s => (
                                                            <option key={s.state_code || s.name} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute top-3.5 right-4 text-gray-400 pointer-events-none" size={18} />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <div className="relative">
                                            <Building2 className="absolute top-3.5 left-4 text-gray-400 z-10" size={18} />
                                            {loadingCities ? (
                                                <div className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2 text-gray-400">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Loading cities...
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleCityChange}
                                                        disabled={!formData.state || availableCities.length === 0}
                                                        className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white appearance-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                                    >
                                                        <option value="">
                                                            {!formData.state
                                                                ? "Select state first"
                                                                : availableCities.length === 0
                                                                    ? "No cities available"
                                                                    : "Select City"}
                                                        </option>
                                                        {availableCities.map(city => (
                                                            <option key={city} value={city}>{city}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute top-3.5 right-4 text-gray-400 pointer-events-none" size={18} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal / ZIP Code</label>
                                        <div className="relative">
                                            <Hash className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                name="postalCode"
                                                value={formData.postalCode}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                                placeholder="e.g. 54000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nearby Landmark</label>
                                    <div className="relative">
                                        <MapPinned className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            name="landmark"
                                            value={formData.landmark}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="e.g. Near XYZ Mosque, Opposite ABC Plaza"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 ml-1">Helps customers find your shop easily.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── CONTACT TAB ── */}
                    {activeTab === "contact" && (
                        <motion.div
                            key="contact"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
                        >
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Phone className="text-[#223943]" size={24} />
                                Contact Information
                            </h2>

                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                                placeholder="+92 3XX XXXXXXX"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                                        <div className="relative">
                                            <MessageCircle className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                name="whatsappNumber"
                                                value={formData.whatsappNumber}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                                placeholder="+92 3XX XXXXXXX"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 ml-1">Customers can reach you via WhatsApp.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop Email</label>
                                    <div className="relative">
                                        <Mail className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            name="shopEmail"
                                            value={formData.shopEmail}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="shop@example.com"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 ml-1">A dedicated shop email, can differ from your login email.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="https://www.yourshop.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── SOCIAL MEDIA TAB ── */}
                    {activeTab === "social" && (
                        <motion.div
                            key="social"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
                        >
                            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <Globe className="text-[#223943]" size={24} />
                                Social Media Profiles
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Link your social media pages to attract more customers and build trust.
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Page</label>
                                    <div className="relative">
                                        <Facebook className="absolute top-3.5 left-4 text-blue-500" size={18} />
                                        <input
                                            type="url"
                                            name="facebookUrl"
                                            value={formData.facebookUrl}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="https://www.facebook.com/yourpage"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Profile</label>
                                    <div className="relative">
                                        <Instagram className="absolute top-3.5 left-4 text-pink-500" size={18} />
                                        <input
                                            type="url"
                                            name="instagramUrl"
                                            value={formData.instagramUrl}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="https://www.instagram.com/yourprofile"
                                        />
                                    </div>
                                </div>

                                {/* Preview cards */}
                                {(formData.facebookUrl || formData.instagramUrl) && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</p>
                                        <div className="flex flex-wrap gap-3">
                                            {formData.facebookUrl && (
                                                <a
                                                    href={formData.facebookUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <Facebook size={16} />
                                                    Facebook Page
                                                </a>
                                            )}
                                            {formData.instagramUrl && (
                                                <a
                                                    href={formData.instagramUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-50 text-pink-700 rounded-xl text-sm font-medium hover:bg-pink-100 transition-colors"
                                                >
                                                    <Instagram size={16} />
                                                    Instagram Profile
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── DELIVERY TAB ── */}
                    {activeTab === "delivery" && (
                        <motion.div
                            key="delivery"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
                        >
                            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <Truck className="text-[#223943]" size={24} />
                                Delivery & Service Area
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Let customers know if you offer delivery and your service coverage area.
                            </p>

                            <div className="space-y-6">
                                {/* Toggle */}
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Delivery Available</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Enable if you deliver finished garments to customers.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="deliveryAvailable"
                                            checked={formData.deliveryAvailable}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#223943]"></div>
                                    </label>
                                </div>

                                {/* Delivery Radius (conditional) */}
                                <AnimatePresence>
                                    {formData.deliveryAvailable && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Radius / Area</label>
                                                <div className="relative">
                                                    <Navigation className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                                    <input
                                                        type="text"
                                                        name="deliveryRadius"
                                                        value={formData.deliveryRadius}
                                                        onChange={handleChange}
                                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                                        placeholder="e.g. Within 10 km, Lahore only, All of Punjab"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 ml-1">Describe the area you can deliver to.</p>
                                            </div>

                                            {/* Helpful info card */}
                                            <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                                <div className="flex gap-3">
                                                    <Truck className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-emerald-800">Delivery Tip</p>
                                                        <p className="text-xs text-emerald-700 mt-1">
                                                            Offering delivery service can increase your orders by up to 40%.
                                                            Make sure to mention delivery charges and estimated time in your shop description.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!formData.deliveryAvailable && (
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex gap-3">
                                            <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-600">Pickup Only</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Customers will need to visit your shop for pickup. Make sure your address and landmarks are accurate and easy to find.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Save Button (always visible) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <button
                        type="submit"
                        disabled={saving}
                        className={clsx(
                            "w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all",
                            saving
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#223943] to-[#2c4a57] hover:from-[#1b2d35] hover:to-[#223943] hover:shadow-xl active:scale-[0.98]"
                        )}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={22} />
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2" size={22} />
                                Save All Changes
                            </>
                        )}
                    </button>
                </motion.div>
            </motion.form>
        </div>
    );
}

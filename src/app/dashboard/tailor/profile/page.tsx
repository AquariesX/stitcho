"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getShopProfile, upsertShopProfile } from "@/app/actions/shop-profile-actions";
import { motion } from "framer-motion";
import { Save, Store, MapPin, Clock, Tag, Award, Image as ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import clsx from "clsx";

interface ShopProfileData {
    id?: number;
    shopName: string;
    shopAddress: string;
    workingHours: string;
    specialization: string;
    yearsOfExperience: number;
    shopLogoUrl?: string | null;
    description?: string | null;
    priceRange?: string | null;
    currency?: string;
}

export default function ShopProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<ShopProfileData>({
        shopName: "",
        shopAddress: "",
        workingHours: "9:00 AM - 9:00 PM",
        specialization: "Both",
        yearsOfExperience: 0,
        shopLogoUrl: "",
        description: "",
        priceRange: "$$",
        currency: "PKR"
    });
    const [uploading, setUploading] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("21:00");

    useEffect(() => {
        if (user?.id) {
            fetchProfile(user.id);
        } else {
            setLoading(false); // Should probably wait for user ref or redirect
        }
    }, [user]);

    const fetchProfile = async (userId: number) => {
        try {
            const res = await getShopProfile(userId);
            if (res.success && res.data) {
                const data = res.data;
                setProfile({
                    ...data,
                    shopLogoUrl: data.shopLogoUrl || "",
                    description: data.description || "",
                    priceRange: data.priceRange || "$$",
                    specialization: data.specialization || "Both",
                    workingHours: data.workingHours || "9:00 AM - 9:00 PM",
                    currency: data.currency || "PKR"
                });

                // Parse working hours for time inputs
                // Expected format: "9:00 AM - 9:00 PM"
                if (data.workingHours) {
                    const parts = data.workingHours.split(' - ');
                    if (parts.length === 2) {
                        setStartTime(convertTo24Hour(parts[0]));
                        setEndTime(convertTo24Hour(parts[1]));
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const convertTo24Hour = (time12h: string) => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
            hours = '00';
        }
        if (modifier === 'PM') {
            hours = (parseInt(hours, 10) + 12).toString();
        }
        return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const convertTo12Hour = (time24h: string) => {
        if (!time24h) return "";
        const [hours, minutes] = time24h.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // the hour '0' should be '12'
        return `${h}:${minutes} ${ampm}`;
    }

    const updateWorkingHours = (start: string, end: string) => {
        const startFormatted = convertTo12Hour(start);
        const endFormatted = convertTo12Hour(end);
        setProfile((prev) => ({
            ...prev,
            workingHours: `${startFormatted} - ${endFormatted}`
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile((prev) => ({
            ...prev,
            [name]: name === 'yearsOfExperience' ? parseInt(value) || 0 : value
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `shop_logos/${user.id}_${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setProfile((prev) => ({ ...prev, shopLogoUrl: url }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setSaving(true);
        const formData = new FormData();
        formData.append("shopName", profile.shopName);
        formData.append("shopAddress", profile.shopAddress);
        formData.append("workingHours", profile.workingHours);
        formData.append("specialization", profile.specialization);
        formData.append("yearsOfExperience", profile.yearsOfExperience.toString());
        if (profile.shopLogoUrl) formData.append("shopLogoUrl", profile.shopLogoUrl);
        if (profile.description) formData.append("description", profile.description);
        if (profile.priceRange) formData.append("priceRange", profile.priceRange);

        try {
            const res = await upsertShopProfile(user.id, formData);
            if (res.success) {
                alert("Profile saved successfully!");
            } else {
                alert("Failed to save profile: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-[#223943]" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#223943] to-[#2c4a57] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold font-sans tracking-tight mb-2">
                            {user?.name ? `${user.name}'s Shop` : "My Shop Profile"}
                        </h1>
                        <p className="text-white/70 max-w-xl text-lg">
                            Manage your shop's visible presence. Keep this information up to date so customers can find you easily.
                        </p>
                    </div>
                    {profile.shopLogoUrl && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24  bg-white rounded-2xl p-1 shadow-lg"
                        >
                            <img src={profile.shopLogoUrl} alt="Shop Logo" className="w-full h-full object-cover rounded-xl" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Form Section */}
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {/* Left Column: Key Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Store className="text-[#223943]" size={24} />
                            Basic Information
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                                <input
                                    type="text"
                                    name="shopName"
                                    required
                                    value={profile.shopName}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                    placeholder="e.g. Elegant Stitches"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Address</label>
                                <div className="relative">
                                    <MapPin className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="shopAddress"
                                        required
                                        value={profile.shopAddress}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        placeholder="Full address of your shop"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Clock className="absolute top-3.5 left-3 text-gray-400" size={16} />
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => {
                                                    setStartTime(e.target.value);
                                                    updateWorkingHours(e.target.value, endTime);
                                                }}
                                                className="w-full pl-10 pr-2 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Clock className="absolute top-3.5 left-3 text-gray-400" size={16} />
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => {
                                                    setEndTime(e.target.value);
                                                    updateWorkingHours(startTime, e.target.value);
                                                }}
                                                className="w-full pl-10 pr-2 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 ml-1">Example: 09:00 AM - 09:00 PM</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                                    <div className="relative">
                                        <Award className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            name="yearsOfExperience"
                                            required
                                            min="0"
                                            value={profile.yearsOfExperience}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description (Optional)</label>
                                <textarea
                                    name="description"
                                    rows={4}
                                    value={profile.description || ""}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400 resize-none"
                                    placeholder="Tell customers a bit about your shop and story..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Tag className="text-[#223943]" size={24} />
                            Details
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                                <select
                                    name="specialization"
                                    value={profile.specialization}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white"
                                >
                                    <option value="Men">Men</option>
                                    <option value="Women">Women</option>
                                    <option value="Kids">Kids</option>
                                    <option value="Both">Both (Men & Women)</option>
                                    <option value="All">All Categories</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                                <div className="flex gap-2">
                                    <select
                                        name="currency"
                                        value={profile.currency}
                                        onChange={handleInputChange}
                                        className="w-24 px-2 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white text-center font-medium"
                                    >
                                        <option value="PKR">PKR</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="AED">AED</option>
                                        <option value="SAR">SAR</option>
                                    </select>
                                    <div className="relative flex-1">
                                        <span className="absolute top-3.5 left-4 text-gray-400 text-sm font-medium">PKR</span>
                                        <input
                                            type="text"
                                            name="priceRange"
                                            value={profile.priceRange || ""}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            placeholder="e.g. 5000 - 15000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <ImageIcon className="text-[#223943]" size={24} />
                            Shop Logo
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-center w-full">
                                <label className={clsx(
                                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
                                    "border-gray-300 bg-gray-50 hover:bg-gray-100",
                                    uploading && "opacity-50 cursor-not-allowed"
                                )}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 mb-3 text-gray-500 animate-spin" />
                                        ) : (
                                            <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                                        )}
                                        <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> logo</p>
                                        <p className="text-xs text-gray-400">SVG, PNG, JPG (MAX. 2MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {!profile.shopLogoUrl && (
                                <p className="text-xs text-center text-gray-400 italic">
                                    If no logo is provided, a default placeholder will be used.
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className={clsx(
                            "w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all",
                            saving || uploading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-[#223943] hover:bg-[#1b2d35] hover:shadow-xl active:scale-[0.98]"
                        )}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2" size={20} />
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Settings, Globe, Bell, Shield, Save,
    Loader2, Moon, Sun, Monitor, AlertTriangle,
    CreditCard, Mail, Power, CheckCircle2
} from "lucide-react";
import clsx from "clsx";

export default function SystemSettingsPage() {
    const [activeTab, setActiveTab] = useState<"general" | "localization" | "notifications" | "security">("general");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Mock data state
    const [settings, setSettings] = useState({
        appName: "Stitcho Admin",
        supportEmail: "support@stitcho.com",
        currency: "PKR",
        timezone: "Asia/Karachi",
        emailAlerts: true,
        pushNotifications: false,
        maintenanceMode: false,
        theme: "system",
        twoFactorAuth: false,
        sessionTimeout: "30",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setSettings(prev => ({ ...prev, [name]: checked }));
        } else {
            setSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleThemeChange = (theme: string) => {
        setSettings(prev => ({ ...prev, theme }));
    };

    const handleSave = () => {
        setSaving(true);
        // Simulate API call
        setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }, 1500);
    };

    const tabs = [
        { id: "general", label: "General", icon: Settings },
        { id: "localization", label: "Localization", icon: Globe },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "security", label: "Security", icon: Shield },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 px-2">System Settings</h1>
                <nav className="space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left",
                                    isActive
                                        ? "bg-[#223943] text-white shadow-md shadow-[#223943]/20"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                )}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {/* General Settings */}
                    {activeTab === "general" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">General Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                                        <input
                                            type="text"
                                            name="appName"
                                            value={settings.appName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                                        <div className="relative">
                                            <Mail className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                name="supportEmail"
                                                value={settings.supportEmail}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Appearance</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        onClick={() => handleThemeChange("light")}
                                        className={clsx(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            settings.theme === "light" ? "border-[#223943] bg-gray-50" : "border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <Sun size={24} className={settings.theme === "light" ? "text-[#223943]" : "text-gray-400"} />
                                        <span className="text-sm font-medium">Light</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange("dark")}
                                        className={clsx(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            settings.theme === "dark" ? "border-[#223943] bg-gray-50" : "border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <Moon size={24} className={settings.theme === "dark" ? "text-[#223943]" : "text-gray-400"} />
                                        <span className="text-sm font-medium">Dark</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange("system")}
                                        className={clsx(
                                            "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            settings.theme === "system" ? "border-[#223943] bg-gray-50" : "border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <Monitor size={24} className={settings.theme === "system" ? "text-[#223943]" : "text-gray-400"} />
                                        <span className="text-sm font-medium">System</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Localization Settings */}
                    {activeTab === "localization" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
                            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Regional Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                                    <div className="relative">
                                        <CreditCard className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <select
                                            name="currency"
                                            value={settings.currency}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white appearance-none"
                                        >
                                            <option value="PKR">PKR (Pakistani Rupee)</option>
                                            <option value="USD">USD (US Dollar)</option>
                                            <option value="EUR">EUR (Euro)</option>
                                            <option value="GBP">GBP (British Pound)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                    <div className="relative">
                                        <Globe className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                        <select
                                            name="timezone"
                                            value={settings.timezone}
                                            onChange={handleChange}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-white appearance-none"
                                        >
                                            <option value="Asia/Karachi">Asia/Karachi (GMT+5)</option>
                                            <option value="UTC">UTC (GMT+0)</option>
                                            <option value="America/New_York">America/New_York (GMT-5)</option>
                                            <option value="Europe/London">Europe/London (GMT+1)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification Settings */}
                    {activeTab === "notifications" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
                            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Notification Preferences</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-blue-500">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">Email Alerts</h3>
                                            <p className="text-sm text-gray-500">Receive critical system alerts via email</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="emailAlerts"
                                            checked={settings.emailAlerts}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#223943]"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-purple-500">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">Push Notifications</h3>
                                            <p className="text-sm text-gray-500">Receive real-time dashboard notifications</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="pushNotifications"
                                            checked={settings.pushNotifications}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#223943]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeTab === "security" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
                            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Security Configuration</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-red-200 text-red-500">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-red-900">Maintenance Mode</h3>
                                            <p className="text-sm text-red-700">Disable access for all users except admins</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="maintenanceMode"
                                            checked={settings.maintenanceMode}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (Minutes)</label>
                                        <div className="relative">
                                            <Power className="absolute top-3.5 left-4 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                name="sessionTimeout"
                                                value={settings.sessionTimeout}
                                                onChange={handleChange}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Save Button */}
                <motion.div
                    layout
                    className="mt-8 flex justify-end"
                >
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={clsx(
                            "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-95",
                            saved ? "bg-emerald-500 hover:bg-emerald-600" : (saving ? "bg-gray-400 cursor-wait" : "bg-[#223943] hover:bg-[#1b2d35]")
                        )}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 size={20} />
                                Saved!
                            </>
                        ) : (
                            <>
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? "Saving..." : "Save Configuration"}
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

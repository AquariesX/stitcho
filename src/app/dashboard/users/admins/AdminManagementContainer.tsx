"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    Shield,
    Mail,
    Phone,
    Calendar,
    Loader2,
    MoreVertical,
    Filter,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { createAdmin, deleteAdmin, updateAdmin, toggleAdminStatus } from "@/app/actions/admin-actions";

type AdminUser = {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    isActive: boolean;
    createdAt: Date;
    role: string;
};

interface AdminManagementProps {
    initialAdmins: AdminUser[];
}

export default function AdminManagementContainer({ initialAdmins }: AdminManagementProps) {
    const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sort state
    const [sortField, setSortField] = useState<keyof AdminUser>("createdAt");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [error, setError] = useState<string | null>(null);

    // Sync state with props when Server Component revalidates
    useEffect(() => {
        setAdmins(initialAdmins);
    }, [initialAdmins]);

    const formRef = useRef<HTMLFormElement>(null);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setIsSubmitting(true);
        setError(null);
        const formData = new FormData(formRef.current);

        let res;
        if (editingAdmin) {
            res = await updateAdmin(editingAdmin.id, formData);
        } else {
            res = await createAdmin(formData);
        }

        if (res.success) {
            setIsModalOpen(false);
            setEditingAdmin(null);
            formRef.current.reset();
        } else {
            setError(res.error || "An unknown error occurred");
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this admin? This will verify synced deletion.")) {
            setAdmins(current => current.filter(a => a.id !== id));
            const res = await deleteAdmin(id);
            if (!res.success) {
                alert("Failed to delete: " + res.error);
                setAdmins(initialAdmins);
            }
        }
    };

    const handleToggleStatus = async (user: AdminUser) => {
        setAdmins(current => current.map(a =>
            a.id === user.id ? { ...a, isActive: !a.isActive } : a
        ));
        const res = await toggleAdminStatus(user.id, user.isActive);
        if (!res.success) {
            setAdmins(initialAdmins);
        }
    };

    const openEditModal = (user: AdminUser) => {
        setEditingAdmin(user);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingAdmin(null);
        setIsModalOpen(true);
    };

    const handleSort = (field: keyof AdminUser) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Filter and Sort Logic
    const filteredAdmins = admins
        .filter(admin => {
            const matchesSearch = admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (admin.email && admin.email.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === "ALL"
                ? true
                : statusFilter === "ACTIVE" ? admin.isActive
                    : !admin.isActive;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (!aValue || !bValue) return 0;

            const comparison = aValue > bValue ? 1 : -1;
            return sortDirection === "asc" ? comparison : -comparison;
        });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 h-full min-h-screen bg-[#F8F9FA]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#223943]">Admin Management</h1>
                    <p className="text-gray-500 mt-1">Manage administrative accounts and permissions</p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="group flex items-center gap-2 px-6 py-3 bg-[#223943] text-white rounded-xl hover:bg-[#1b2d35] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Plus size={18} strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold">Add New Admin</span>
                </button>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#223943]/20 text-gray-700 placeholder-gray-400 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative group">
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-gray-700 font-medium cursor-pointer border border-transparent hover:border-gray-200">
                            <Filter size={18} />
                            <span>{statusFilter === "ALL" ? "All Status" : statusFilter === "ACTIVE" ? "Active Only" : "Inactive Only"}</span>
                            <ChevronDown size={16} className="text-gray-400" />
                        </div>
                        {/* Simple Dropdown for Filter */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 hidden group-hover:block z-20 overflow-hidden">
                            <button onClick={() => setStatusFilter("ALL")} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">All Admins</button>
                            <button onClick={() => setStatusFilter("ACTIVE")} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">Active Only</button>
                            <button onClick={() => setStatusFilter("INACTIVE")} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">Inactive Only</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort("name")}>
                                    Name {sortField === "name" && (sortDirection === "asc" ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />)}
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort("email")}>
                                    Contact
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort("role")}>
                                    Role
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort("isActive")}>
                                    Status
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort("createdAt")}>
                                    Joined {sortField === "createdAt" && (sortDirection === "asc" ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />)}
                                </th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence mode="popLayout">
                                {filteredAdmins.map((admin) => (
                                    <motion.tr
                                        key={admin.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-gray-50/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                                                    {admin.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{admin.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {admin.email}
                                                </div>
                                                {admin.phoneNumber && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                        <Phone size={12} />
                                                        {admin.phoneNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 uppercase tracking-wide">
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(admin)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${admin.isActive
                                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                                    }`}
                                            >
                                                {admin.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                {admin.isActive ? "Active" : "Inactive"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(admin)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(admin.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {filteredAdmins.length === 0 && (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No admins found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal - Kept same logic, just minor styling updates if needed */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                        >
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">
                                <div className="p-6 md:p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-[#223943]">
                                            {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
                                        </h2>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>

                                    <form ref={formRef} onSubmit={handleCreateOrUpdate} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                            <input
                                                name="name"
                                                defaultValue={editingAdmin?.name}
                                                required
                                                type="text"
                                                placeholder="e.g. John Doe"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                            <input
                                                name="email"
                                                defaultValue={editingAdmin?.email || ''}
                                                required
                                                type="email"
                                                placeholder="john@example.com"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                            <input
                                                name="phoneNumber"
                                                defaultValue={editingAdmin?.phoneNumber || ''}
                                                type="tel"
                                                placeholder="+1 234 567 890"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

                                        {!editingAdmin && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                                <input
                                                    name="password"
                                                    required
                                                    type="password"
                                                    minLength={6}
                                                    placeholder="••••••••"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                                />
                                            </div>
                                        )}

                                        {!editingAdmin && (
                                            <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800 flex gap-3">
                                                <Shield className="shrink-0 mt-0.5" size={16} />
                                                <p>
                                                    New admins will be created directly.
                                                    Ensure you share the password securely.
                                                </p>
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-4 bg-[#223943] text-white rounded-xl font-bold text-lg hover:bg-[#1b2d35] transition-all shadow-lg hover:shadow-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                                            {editingAdmin ? 'Save Changes' : 'Create Admin Account'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { createFabric, updateFabric, deleteFabric, getFabrics } from '@/app/actions/fabric-actions';
import { getCategories } from '@/app/actions/category-actions';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, Trash2, Image as ImageIcon, Search, X, Edit3, UploadCloud,
    Loader2, AlertTriangle, Filter, DollarSign, Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Category {
    id: number;
    name: string;
    code: string;
}

interface Fabric {
    id: number;
    name: string;
    imageUrl: string;
    price: any;
    categoryId: number;
    category: Category;
    createdAt: Date | string;
    user?: { name: string; shopProfile?: { shopName: string } };
}

// ─── Animation variants ──────────────────────────────────────────────────────
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
    },
    exit: { opacity: 0, scale: 0.85, y: 40, transition: { duration: 0.2 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 200, damping: 20 },
    }),
};

// ─── Page Component ──────────────────────────────────────────────────────────
export default function FabricsPage() {
    const { role, user } = useAuth();
    const [fabrics, setFabrics] = useState<Fabric[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editFabric, setEditFabric] = useState<Fabric | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch on mount ──
    useEffect(() => {
        async function fetchData() {
            if (!user) return; // Wait for Auth
            const [fabResult, catResult] = await Promise.all([
                getFabrics(role, user.id),
                getCategories(role, user.id),
            ]);
            if (fabResult.success && fabResult.data) setFabrics(fabResult.data as Fabric[]);
            if (catResult.success && catResult.data) setCategories(catResult.data as Category[]);
            setPageLoading(false);
        }
        fetchData();
    }, [role, user]);

    // ── Filter + search ──
    const filteredFabrics = useMemo(() => {
        let result = fabrics;
        if (filterCategory !== 'all') {
            result = result.filter((f) => f.categoryId === filterCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (f) =>
                    f.name.toLowerCase().includes(q) ||
                    f.category?.name?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [fabrics, searchQuery, filterCategory]);

    // ── Modal helpers ──
    function openAddModal() {
        setEditFabric(null);
        setFormName('');
        setFormImageUrl('');
        setFormPrice('');
        setFormCategoryId(categories.length > 0 ? String(categories[0].id) : '');
        setError('');
        setModalOpen(true);
    }

    function openEditModal(fab: Fabric) {
        setEditFabric(fab);
        setFormName(fab.name);
        setFormImageUrl(fab.imageUrl || '');
        setFormPrice(String(fab.price));
        setFormCategoryId(String(fab.categoryId));
        setError('');
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditFabric(null);
        setError('');
    }

    // ── Firebase upload ──
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `fabric_images/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setFormImageUrl(url);
        } catch (err) {
            console.error('Upload failed', err);
            setError('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    // ── Create / Update ──
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.set('name', formName);
        formData.set('imageUrl', formImageUrl);
        formData.set('price', formPrice);
        formData.set('categoryId', formCategoryId);
        if (user?.id) formData.set('userId', String(user.id));

        if (editFabric) {
            const result = await updateFabric(editFabric.id, formData);
            if (result.success && result.data) {
                setFabrics(fabrics.map((f) => (f.id === editFabric.id ? result.data as Fabric : f)));
                closeModal();
            } else {
                setError(result.error || 'Failed to update');
            }
        } else {
            const result = await createFabric(formData);
            if (result.success && result.data) {
                setFabrics([result.data as Fabric, ...fabrics]);
                closeModal();
            } else {
                setError(result.error || 'Something went wrong');
            }
        }
        setLoading(false);
    }

    // ── Delete ──
    async function handleDelete(id: number) {
        setDeleting(true);
        const result = await deleteFabric(id);
        if (result.success) {
            setFabrics(fabrics.filter((f) => f.id !== id));
        } else {
            alert(result.error || 'Failed to delete');
        }
        setDeleteConfirmId(null);
        setDeleting(false);
    }

    // ── Format price ──
    function formatPrice(price: any) {
        return Number(price).toLocaleString('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    // ── Loading ──
    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 size={44} className="animate-spin text-[#223943]" />
                    <p className="text-sm font-medium text-gray-500">Loading fabrics…</p>
                </motion.div>
            </div>
        );
    }

    // ─── JSX ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* ── Hero Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#223943] to-[#2c4a57] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl -ml-14 -mb-14 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                                <Scissors size={24} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Fabrics</h1>
                        </div>
                        <p className="text-white/70 max-w-xl text-lg">
                            Manage your fabric collection. These fabrics are available across all products for customers to choose from.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-white text-[#223943] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus size={20} />
                        Add Fabric
                    </motion.button>
                </div>
            </motion.div>

            {/* ── Toolbar ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col md:flex-row gap-4 items-center justify-between"
            >
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search fabrics…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all text-black placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="relative w-full sm:w-56">
                        <Filter className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={filterCategory === 'all' ? 'all' : String(filterCategory)}
                            onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all text-black appearance-none cursor-pointer"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-2.5 shadow-sm">
                    <Scissors size={18} className="text-[#223943]" />
                    <span className="text-sm font-medium text-black">
                        {filteredFabrics.length} {filteredFabrics.length === 1 ? 'fabric' : 'fabrics'}
                    </span>
                </div>
            </motion.div>

            {/* ── Fabrics Grid ── */}
            {filteredFabrics.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Scissors size={36} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-1">
                        {searchQuery || filterCategory !== 'all' ? 'No matching fabrics' : 'No fabrics yet'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                        {searchQuery || filterCategory !== 'all'
                            ? 'Try adjusting your filters or add a new fabric.'
                            : 'Click "Add Fabric" to create your first one.'}
                    </p>
                </motion.div>
            ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredFabrics.map((fabric, i) => (
                            <motion.div
                                key={fabric.id}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                layout
                                className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                {/* Image */}
                                <div className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                                    {fabric.imageUrl ? (
                                        <img
                                            src={fabric.imageUrl}
                                            alt={fabric.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon size={48} className="text-gray-200" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Category badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-white/90 backdrop-blur text-[#223943] shadow-sm">
                                            {fabric.category?.name || 'Uncategorized'}
                                        </span>
                                        {role === 'admin' && fabric.user && (
                                            <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg shadow-sm">
                                                By: {fabric.user.shopProfile?.shopName || fabric.user.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Price tag */}
                                    <div className="absolute bottom-3 left-3">
                                        <span className="px-3 py-1.5 text-sm font-bold rounded-xl bg-[#223943]/90 backdrop-blur text-white shadow-lg">
                                            {formatPrice(fabric.price)}
                                        </span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-black truncate">{fabric.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Available for all products</p>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => openEditModal(fabric)}
                                        className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                        title="Edit fabric"
                                    >
                                        <Edit3 size={15} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setDeleteConfirmId(fabric.id)}
                                        className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                        title="Delete fabric"
                                    >
                                        <Trash2 size={15} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {deleteConfirmId !== null && (
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={() => !deleting && setDeleteConfirmId(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-black mb-2">Delete Fabric?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                This fabric will be permanently removed and will no longer be available for customers.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    disabled={deleting}
                                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-black font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirmId)}
                                    disabled={deleting}
                                    className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {deleting && <Loader2 size={16} className="animate-spin" />}
                                    {deleting ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Add / Edit Modal ── */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={() => !loading && !uploading && closeModal()}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] px-8 py-6 flex items-center justify-between shrink-0">
                                <h2 className="text-xl font-bold text-white">
                                    {editFabric ? 'Edit Fabric' : 'Add New Fabric'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    disabled={loading || uploading}
                                    className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-200 flex items-center gap-2">
                                                <AlertTriangle size={16} className="shrink-0" />
                                                {error}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Fabric Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">Fabric Name</label>
                                    <input
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        required
                                        placeholder="e.g. Premium Cotton, Silk Blend, Lawn"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                    />
                                </div>

                                {/* Category & Price row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Category</label>
                                        <select
                                            value={formCategoryId}
                                            onChange={(e) => setFormCategoryId(e.target.value)}
                                            required
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>Select</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Price (PKR)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formPrice}
                                                onChange={(e) => setFormPrice(e.target.value)}
                                                required
                                                placeholder="0.00"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {categories.length === 0 && (
                                    <p className="text-xs text-amber-600">No categories found. Please create a category first.</p>
                                )}

                                {/* Image Upload */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">Fabric Image</label>
                                    <div
                                        onClick={() => !uploading && fileInputRef.current?.click()}
                                        className={`
                                            relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                                            ${formImageUrl
                                                ? 'border-[#223943]/30 bg-[#223943]/5'
                                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                                            }
                                            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {formImageUrl ? (
                                            <div className="relative w-full h-full overflow-hidden rounded-xl">
                                                <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-sm font-medium">Click to change</span>
                                                </div>
                                            </div>
                                        ) : uploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 size={28} className="text-[#223943] animate-spin" />
                                                <span className="text-sm text-black font-medium">Uploading…</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud size={28} className="text-gray-400" />
                                                <span className="text-sm text-black font-medium">Click to upload image</span>
                                                <span className="text-xs text-gray-400">PNG, JPG, WEBP (Max 5MB)</span>
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                    </div>
                                    {formImageUrl && !uploading && (
                                        <button
                                            type="button"
                                            onClick={() => setFormImageUrl('')}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium mt-1"
                                        >
                                            Remove image
                                        </button>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={loading || uploading}
                                        className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-black font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || uploading}
                                        className="flex-1 px-6 py-3 rounded-xl bg-[#223943] text-white font-semibold hover:bg-[#1b2d35] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {loading
                                            ? 'Saving…'
                                            : editFabric
                                                ? 'Update Fabric'
                                                : 'Add Fabric'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

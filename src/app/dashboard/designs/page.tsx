'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { createDesign, updateDesign, deleteDesign, getDesigns } from '@/app/actions/design-actions';
import { getCategories } from '@/app/actions/category-actions';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, Trash2, Image as ImageIcon, Search, X, Edit3, UploadCloud,
    Loader2, AlertTriangle, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface Category {
    id: number;
    name: string;
}

interface Design {
    id: number;
    name: string;
    description: string | null;
    imageUrl: string;
    basePrice: number;
    categoryId: number;
    category?: Category;
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
        transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 200, damping: 20 },
    }),
};

export default function DesignsPage() {
    const { role, user } = useAuth();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editDesign, setEditDesign] = useState<Design | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formBasePrice, setFormBasePrice] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch data on mount ──
    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            const [designResult, categoryResult] = await Promise.all([
                getDesigns(role, user.id),
                getCategories(role, user.id)
            ]);

            if (designResult.success && designResult.data) {
                setDesigns(designResult.data);
            }
            if (categoryResult.success && categoryResult.data) {
                setCategories(categoryResult.data);
            }
            setPageLoading(false);
        }
        fetchData();
    }, [role, user]);

    // ── Filter logic ──
    const filteredDesigns = useMemo(() => {
        if (!searchQuery.trim()) return designs;
        const q = searchQuery.toLowerCase();
        return designs.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.category?.name?.toLowerCase().includes(q))
        );
    }, [designs, searchQuery]);

    // ── Modal helpers ──
    function openAddModal() {
        setEditDesign(null);
        setFormName('');
        setFormDescription('');
        setFormBasePrice('');
        setFormCategoryId('');
        setFormImageUrl('');
        setError('');
        setModalOpen(true);
    }

    function openEditModal(des: Design) {
        setEditDesign(des);
        setFormName(des.name);
        setFormDescription(des.description || '');
        setFormBasePrice(des.basePrice.toString());
        setFormCategoryId(des.categoryId.toString());
        setFormImageUrl(des.imageUrl || '');
        setError('');
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditDesign(null);
        setError('');
    }

    // ── Firebase upload ──
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `design_images/${Date.now()}_${file.name}`);
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

        if (!formCategoryId) {
            setError('Please select a category');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.set('name', formName);
        formData.set('description', formDescription);
        formData.set('basePrice', formBasePrice);
        formData.set('categoryId', formCategoryId);
        formData.set('imageUrl', formImageUrl);
        if (user?.id) formData.set('userId', String(user.id));

        if (editDesign) {
            const result = await updateDesign(editDesign.id, formData);
            if (result.success && result.data) {
                setDesigns(designs.map((d) => (d.id === editDesign.id ? result.data : d)));
                closeModal();
            } else {
                setError(result.error || 'Failed to update design');
            }
        } else {
            const result = await createDesign(formData);
            if (result.success && result.data) {
                setDesigns([result.data, ...designs]);
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
        const result = await deleteDesign(id);
        if (result.success) {
            setDesigns(designs.filter((d) => d.id !== id));
        } else {
            alert(result.error || 'Failed to delete design');
        }
        setDeleteConfirmId(null);
        setDeleting(false);
    }

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 size={44} className="animate-spin text-[#223943]" />
                    <p className="text-sm font-medium text-gray-500">Loading designs…</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
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
                                <Layers size={24} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Designs</h1>
                        </div>
                        <p className="text-white/70 max-w-xl text-lg">
                            Manage base patterns and designs. Add pricing and categorize them.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-white text-[#223943] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus size={20} />
                        Add Design
                    </motion.button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-4 items-center justify-between"
            >
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search designs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all text-black placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </motion.div>

            {filteredDesigns.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Layers size={36} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-1">
                        {searchQuery ? 'No matching designs' : 'No designs yet'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                        {searchQuery
                            ? 'Try adjusting your search or add a new design.'
                            : 'Click "Add Design" to create your first one.'}
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredDesigns.map((design, i) => (
                            <motion.div
                                key={design.id}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                layout
                                className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                                    {design.imageUrl ? (
                                        <img
                                            src={design.imageUrl}
                                            alt={design.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon size={48} className="text-gray-200" />
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex justify-between items-end opacity-90">
                                        <span className="text-white font-semibold flex items-center gap-1">
                                            <span className="text-xs">PKR</span>
                                            {design.basePrice.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-black truncate">{design.name}</h3>
                                    {design.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{design.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {design.category && (
                                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg">
                                                Cat: {design.category.name}
                                            </span>
                                        )}
                                        {role === 'admin' && design.user && (
                                            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg shrink-0">
                                                By: {design.user.shopProfile?.shopName || design.user.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => openEditModal(design)}
                                        className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                        title="Edit design"
                                    >
                                        <Edit3 size={15} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setDeleteConfirmId(design.id)}
                                        className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                        title="Delete design"
                                    >
                                        <Trash2 size={15} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

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
                            <h3 className="text-xl font-bold text-black mb-2">Delete Design?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                This action cannot be undone. The design will be permanently removed.
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

            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={() => !loading && !uploading && closeModal()}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] px-8 py-6 flex items-center justify-between shrink-0">
                                <h2 className="text-xl font-bold text-white">
                                    {editDesign ? 'Edit Design' : 'Add New Design'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    disabled={loading || uploading}
                                    className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto">
                                <form onSubmit={handleSubmit} className="space-y-6">
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

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Design Name</label>
                                        <input
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            required
                                            placeholder="e.g. Classic Two-Piece Suit"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Description (Optional)</label>
                                        <textarea
                                            value={formDescription}
                                            onChange={(e) => setFormDescription(e.target.value)}
                                            placeholder="Details about the design"
                                            rows={2}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-black">Base Price</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formBasePrice}
                                                onChange={(e) => setFormBasePrice(e.target.value)}
                                                required
                                                placeholder="0.00"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-black">Category</label>
                                            <select
                                                required
                                                value={formCategoryId}
                                                onChange={(e) => setFormCategoryId(e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all appearance-none"
                                            >
                                                <option value="" disabled>Select Category</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Design Image</label>
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
                                                    <img
                                                        src={formImageUrl}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
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

                                    <div className="flex gap-3 pt-4 border-t border-gray-100">
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
                                                : editDesign
                                                    ? 'Update Design'
                                                    : 'Add Design'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

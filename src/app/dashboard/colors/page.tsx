'use client';

import { useState, useMemo, useEffect } from 'react';
import { createColor, updateColor, deleteColor, getColors } from '@/app/actions/color-actions';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, Trash2, Search, X, Edit3,
    Loader2, AlertTriangle, Palette, Pipette, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Color {
    id: number;
    name: string;
    hexCode: string;
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
        transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 200, damping: 20 },
    }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// ─── Page Component ──────────────────────────────────────────────────────────
export default function ColorsPage() {
    const { role, user } = useAuth();
    const [colors, setColors] = useState<Color[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editColor, setEditColor] = useState<Color | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formHexCode, setFormHexCode] = useState('#000000');

    // ── Fetch on mount ──
    useEffect(() => {
        async function fetchData() {
            if (!user) return; // Wait for Auth
            const result = await getColors(role, user.id);
            if (result.success && result.data) setColors(result.data);
            setPageLoading(false);
        }
        fetchData();
    }, [role, user]);

    // ── Filter ──
    const filteredColors = useMemo(() => {
        if (!searchQuery.trim()) return colors;
        const q = searchQuery.toLowerCase();
        return colors.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.hexCode.toLowerCase().includes(q)
        );
    }, [colors, searchQuery]);

    // ── Modal helpers ──
    function openAddModal() {
        setEditColor(null);
        setFormName('');
        setFormHexCode('#000000');
        setError('');
        setModalOpen(true);
    }

    function openEditModal(color: Color) {
        setEditColor(color);
        setFormName(color.name);
        setFormHexCode(color.hexCode);
        setError('');
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditColor(null);
        setError('');
    }

    // ── Copy hex ──
    async function copyHex(id: number, hex: string) {
        await navigator.clipboard.writeText(hex);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    }

    // ── Create / Update ──
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate hex format
        if (!/^#[0-9A-Fa-f]{6}$/.test(formHexCode)) {
            setError('Please enter a valid hex color code (e.g. #FF5733)');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.set('name', formName);
        formData.set('hexCode', formHexCode.toUpperCase());
        if (user?.id) formData.set('userId', String(user.id));

        if (editColor) {
            const result = await updateColor(editColor.id, formData);
            if (result.success && result.data) {
                setColors(colors.map((c) => (c.id === editColor.id ? result.data as Color : c)));
                closeModal();
            } else {
                setError(result.error || 'Failed to update');
            }
        } else {
            const result = await createColor(formData);
            if (result.success && result.data) {
                setColors([result.data as Color, ...colors]);
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
        const result = await deleteColor(id);
        if (result.success) {
            setColors(colors.filter((c) => c.id !== id));
        } else {
            alert(result.error || 'Failed to delete');
        }
        setDeleteConfirmId(null);
        setDeleting(false);
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
                    <p className="text-sm font-medium text-gray-500">Loading colors…</p>
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
                                <Palette size={24} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Colors</h1>
                        </div>
                        <p className="text-white/70 max-w-xl text-lg">
                            Manage your color palette. Customers can pick from these colors when customizing their orders.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-white text-[#223943] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus size={20} />
                        Add Color
                    </motion.button>
                </div>
            </motion.div>

            {/* ── Toolbar ── */}
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
                        placeholder="Search by name or hex code…"
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

                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-2.5 shadow-sm">
                    <Palette size={18} className="text-[#223943]" />
                    <span className="text-sm font-medium text-black">
                        {filteredColors.length} {filteredColors.length === 1 ? 'color' : 'colors'}
                    </span>
                </div>
            </motion.div>

            {/* ── Colors Grid ── */}
            {filteredColors.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Palette size={36} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-1">
                        {searchQuery ? 'No matching colors' : 'No colors yet'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                        {searchQuery
                            ? 'Try adjusting your search or add a new color.'
                            : 'Click "Add Color" to build your color palette.'}
                    </p>
                </motion.div>
            ) : (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    <AnimatePresence mode="popLayout">
                        {filteredColors.map((color, i) => {
                            const contrast = getContrastColor(color.hexCode);
                            return (
                                <motion.div
                                    key={color.id}
                                    custom={i}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    layout
                                    className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                                >
                                    {/* Color Swatch */}
                                    <div
                                        className="h-32 w-full relative cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                                        style={{ backgroundColor: color.hexCode }}
                                    >
                                        {/* Hex label centered */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={() => copyHex(color.id, color.hexCode)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur text-xs font-mono font-bold shadow-lg transition-all"
                                                style={{
                                                    backgroundColor: contrast === '#FFFFFF' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                                                    color: contrast,
                                                }}
                                            >
                                                {copiedId === color.id ? (
                                                    <><Check size={12} /> Copied!</>
                                                ) : (
                                                    <><Copy size={12} /> {color.hexCode}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold text-black truncate">{color.name}</h3>
                                        <p className="text-xs font-mono text-gray-500 mt-0.5">{color.hexCode}</p>
                                        {role === 'admin' && color.user && (
                                            <p className="text-[10px] mt-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                                                By: {color.user.shopProfile?.shopName || color.user.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => openEditModal(color)}
                                            className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                            title="Edit color"
                                        >
                                            <Edit3 size={13} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setDeleteConfirmId(color.id)}
                                            className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                            title="Delete color"
                                        >
                                            <Trash2 size={13} />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
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
                            <h3 className="text-xl font-bold text-black mb-2">Delete Color?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                This color will be permanently removed and will no longer be available for customers.
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
                        onClick={() => !loading && closeModal()}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] px-8 py-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">
                                    {editColor ? 'Edit Color' : 'Add New Color'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    disabled={loading}
                                    className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
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

                                {/* Live Preview */}
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-20 h-20 rounded-2xl border-2 border-gray-200 shadow-inner transition-colors duration-300"
                                        style={{ backgroundColor: formHexCode }}
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-black">{formName || 'Color Preview'}</p>
                                        <p className="text-xs font-mono text-gray-500">{formHexCode}</p>
                                    </div>
                                </div>

                                {/* Color Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">Color Name</label>
                                    <input
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        required
                                        placeholder="e.g. Royal Blue, Midnight Black"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                    />
                                </div>

                                {/* Hex Code + Color Picker */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">Hex Color Code</label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Pipette className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                value={formHexCode}
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (!val.startsWith('#')) val = '#' + val;
                                                    setFormHexCode(val.slice(0, 7).toUpperCase());
                                                }}
                                                required
                                                maxLength={7}
                                                placeholder="#000000"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-3 text-sm text-black font-mono uppercase placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <label className="relative w-14 h-12 rounded-xl border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors shadow-sm">
                                            <input
                                                type="color"
                                                value={formHexCode}
                                                onChange={(e) => setFormHexCode(e.target.value.toUpperCase())}
                                                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                                            />
                                            <div
                                                className="w-full h-full"
                                                style={{ backgroundColor: formHexCode }}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">Use the picker or type a hex code like #FF5733</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={loading}
                                        className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-black font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-6 py-3 rounded-xl bg-[#223943] text-white font-semibold hover:bg-[#1b2d35] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {loading
                                            ? 'Saving…'
                                            : editColor
                                                ? 'Update Color'
                                                : 'Create Color'}
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

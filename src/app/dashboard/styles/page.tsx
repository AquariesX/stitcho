'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
    createStyle, updateStyle, deleteStyle, getStyles,
    createStyleOption, updateStyleOption, deleteStyleOption,
} from '@/app/actions/style-actions';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, Trash2, Image as ImageIcon, Search, X, Edit3, UploadCloud,
    Loader2, AlertTriangle, Wand2, ChevronDown, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StyleOption {
    id: number;
    styleId: number;
    name: string;
    imageUrl: string;
    additionalPrice: any;
    createdAt: Date | string;
}

interface Style {
    id: number;
    name: string;
    imageUrl: string;
    options: StyleOption[];
    createdAt: Date | string;
    user?: { name: string; shopProfile?: { shopName: string } };
}

// ─── Animation variants ──────────────────────────────────────────────────────
const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } },
    exit: { opacity: 0, scale: 0.85, y: 40, transition: { duration: 0.2 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 200, damping: 20 },
    }),
};

// ─── Modal Types ─────────────────────────────────────────────────────────────
type ModalMode =
    | { type: 'style'; edit?: Style }
    | { type: 'option'; styleId: number; edit?: StyleOption }
    | null;

// ─── Page Component ──────────────────────────────────────────────────────────
export default function StylesPage() {
    const { role, user } = useAuth();
    const [styles, setStyles] = useState<Style[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [modal, setModal] = useState<ModalMode>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStyleId, setExpandedStyleId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'style' | 'option'; id: number } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formAdditionalPrice, setFormAdditionalPrice] = useState('0');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch ──
    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            const result = await getStyles(role, user.id);
            if (result.success && result.data) setStyles(result.data as Style[]);
            setPageLoading(false);
        }
        fetchData();
    }, [role, user]);

    // ── Filter ──
    const filteredStyles = useMemo(() => {
        if (!searchQuery.trim()) return styles;
        const q = searchQuery.toLowerCase();
        return styles.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.options.some((o) => o.name.toLowerCase().includes(q))
        );
    }, [styles, searchQuery]);

    // ── Refresh all styles from DB ──
    async function refreshStyles() {
        if (!user) return;
        const result = await getStyles(role, user.id);
        if (result.success && result.data) setStyles(result.data as Style[]);
    }

    // ── Modal helpers ──
    function openStyleModal(edit?: Style) {
        setFormName(edit?.name || '');
        setFormImageUrl(edit?.imageUrl || '');
        setFormAdditionalPrice('0');
        setError('');
        setModal({ type: 'style', edit });
    }

    function openOptionModal(styleId: number, edit?: StyleOption) {
        setFormName(edit?.name || '');
        setFormImageUrl(edit?.imageUrl || '');
        setFormAdditionalPrice(edit ? String(edit.additionalPrice) : '0');
        setError('');
        setModal({ type: 'option', styleId, edit });
    }

    function closeModal() {
        setModal(null);
        setError('');
    }

    // ── Firebase upload ──
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const folder = modal?.type === 'style' ? 'style_images' : 'style_option_images';
            const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setFormImageUrl(url);
        } catch {
            setError('Failed to upload image.');
        } finally {
            setUploading(false);
        }
    }

    // ── Submit ──
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.set('name', formName);
        formData.set('imageUrl', formImageUrl);

        if (modal?.type === 'style') {
            if (user?.id) formData.set('userId', String(user.id));
            if (modal.edit) {
                const res = await updateStyle(modal.edit.id, formData);
                if (!res.success) { setError(res.error || 'Failed'); setLoading(false); return; }
            } else {
                const res = await createStyle(formData);
                if (!res.success) { setError(res.error || 'Failed'); setLoading(false); return; }
            }
        } else if (modal?.type === 'option') {
            formData.set('styleId', String(modal.styleId));
            formData.set('additionalPrice', formAdditionalPrice);
            if (modal.edit) {
                const res = await updateStyleOption(modal.edit.id, formData);
                if (!res.success) { setError(res.error || 'Failed'); setLoading(false); return; }
            } else {
                const res = await createStyleOption(formData);
                if (!res.success) { setError(res.error || 'Failed'); setLoading(false); return; }
            }
        }

        await refreshStyles();
        closeModal();
        setLoading(false);
    }

    // ── Delete ──
    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        const res = deleteTarget.type === 'style'
            ? await deleteStyle(deleteTarget.id)
            : await deleteStyleOption(deleteTarget.id);
        if (!res.success) { alert(res.error || 'Failed to delete'); }
        await refreshStyles();
        setDeleteTarget(null);
        setDeleting(false);
    }

    // ── Price format ──
    function formatPrice(price: any) {
        const n = Number(price);
        if (n === 0) return 'Free';
        return '+' + n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // ── Loading ──
    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 size={44} className="animate-spin text-[#223943]" />
                    <p className="text-sm font-medium text-gray-500">Loading styles…</p>
                </motion.div>
            </div>
        );
    }

    // ─── JSX ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* ── Hero ── */}
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
                                <Wand2 size={24} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Styles</h1>
                        </div>
                        <p className="text-white/70 max-w-xl text-lg">
                            Define customization styles and their options. Each style (e.g. Collar, Cuff) has multiple options customers can choose from.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openStyleModal()}
                        className="flex items-center gap-2 bg-white text-[#223943] px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus size={20} />
                        Add Style
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
                        placeholder="Search styles or options…"
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
                    <Layers size={18} className="text-[#223943]" />
                    <span className="text-sm font-medium text-black">
                        {filteredStyles.length} {filteredStyles.length === 1 ? 'style' : 'styles'}
                        <span className="text-gray-400 ml-1">
                            · {filteredStyles.reduce((sum, s) => sum + s.options.length, 0)} options
                        </span>
                    </span>
                </div>
            </motion.div>

            {/* ── Styles List ── */}
            {filteredStyles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Wand2 size={36} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-black mb-1">
                        {searchQuery ? 'No matching styles' : 'No styles yet'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                        {searchQuery ? 'Try adjusting your search.' : 'Click "Add Style" to create your first customization style.'}
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-5">
                    <AnimatePresence mode="popLayout">
                        {filteredStyles.map((style, i) => {
                            const isExpanded = expandedStyleId === style.id;
                            return (
                                <motion.div
                                    key={style.id}
                                    custom={i}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    layout
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                                >
                                    {/* Style Header */}
                                    <div
                                        className="flex items-center gap-4 p-5 cursor-pointer select-none"
                                        onClick={() => setExpandedStyleId(isExpanded ? null : style.id)}
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                            {style.imageUrl ? (
                                                <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Wand2 size={22} className="text-gray-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-black truncate">{style.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500">
                                                    {style.options.length} {style.options.length === 1 ? 'option' : 'options'}
                                                </p>
                                                {role === 'admin' && style.user && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-md shadow-sm">
                                                        By: {style.user.shopProfile?.shopName || style.user.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => openOptionModal(style.id)}
                                                className="w-9 h-9 rounded-xl bg-[#223943]/10 flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                                title="Add option"
                                            >
                                                <Plus size={16} />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => openStyleModal(style)}
                                                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                                title="Edit style"
                                            >
                                                <Edit3 size={14} />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setDeleteTarget({ type: 'style', id: style.id })}
                                                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                title="Delete style"
                                            >
                                                <Trash2 size={14} />
                                            </motion.button>
                                        </div>

                                        {/* Chevron */}
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <ChevronDown size={20} className="text-gray-400" />
                                        </motion.div>
                                    </div>

                                    {/* Options (expandable) */}
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                                    {style.options.length === 0 ? (
                                                        <div className="text-center py-8">
                                                            <p className="text-sm text-gray-400 mb-3">No options yet for this style</p>
                                                            <button
                                                                onClick={() => openOptionModal(style.id)}
                                                                className="inline-flex items-center gap-2 text-sm text-[#223943] font-semibold hover:underline"
                                                            >
                                                                <Plus size={14} /> Add First Option
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                            {style.options.map((opt, idx) => (
                                                                <motion.div
                                                                    key={opt.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: idx * 0.04 }}
                                                                    className="group relative bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                                                                >
                                                                    {/* Option Image */}
                                                                    <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                                                                        {opt.imageUrl ? (
                                                                            <img src={opt.imageUrl} alt={opt.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <ImageIcon size={24} className="text-gray-200" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Option Info */}
                                                                    <div className="p-3">
                                                                        <p className="text-xs font-bold text-black truncate">{opt.name}</p>
                                                                        <p className="text-[10px] font-medium text-[#223943] mt-0.5">{formatPrice(opt.additionalPrice)}</p>
                                                                    </div>

                                                                    {/* Hover Actions */}
                                                                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => openOptionModal(style.id, opt)}
                                                                            className="w-6 h-6 rounded-md bg-white/90 shadow flex items-center justify-center text-[#223943] hover:bg-[#223943] hover:text-white transition-colors"
                                                                        >
                                                                            <Edit3 size={10} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setDeleteTarget({ type: 'option', id: opt.id })}
                                                                            className="w-6 h-6 rounded-md bg-white/90 shadow flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Delete Confirmation ── */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
                        onClick={() => !deleting && setDeleteTarget(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-black mb-2">
                                Delete {deleteTarget.type === 'style' ? 'Style' : 'Option'}?
                            </h3>
                            <p className="text-gray-500 text-sm mb-6">
                                {deleteTarget.type === 'style'
                                    ? 'This will permanently remove this style and ALL its options.'
                                    : 'This option will be permanently removed.'}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-6 py-2.5 rounded-xl border border-gray-200 text-black font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={handleDelete} disabled={deleting} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                                    {deleting && <Loader2 size={16} className="animate-spin" />}
                                    {deleting ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Add / Edit Modal (Style or Option) ── */}
            <AnimatePresence>
                {modal && (
                    <motion.div
                        variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
                        onClick={() => !loading && !uploading && closeModal()}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#223943] to-[#2c4a57] px-8 py-6 flex items-center justify-between shrink-0">
                                <h2 className="text-xl font-bold text-white">
                                    {modal.type === 'style'
                                        ? modal.edit ? 'Edit Style' : 'Add New Style'
                                        : modal.edit ? 'Edit Option' : 'Add Style Option'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    disabled={loading || uploading}
                                    className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-200 flex items-center gap-2">
                                                <AlertTriangle size={16} className="shrink-0" />{error}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">
                                        {modal.type === 'style' ? 'Style Name' : 'Option Name'}
                                    </label>
                                    <input
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        required
                                        placeholder={modal.type === 'style' ? 'e.g. Collar, Cuff, Pocket' : 'e.g. Band Collar, French Cuff'}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                    />
                                </div>

                                {/* Additional Price (options only) */}
                                {modal.type === 'option' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-black">Additional Price (PKR)</label>
                                        <div className="relative">
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 text-sm font-medium">PKR</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formAdditionalPrice}
                                                onChange={(e) => setFormAdditionalPrice(e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#223943] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">Extra charge for this option (0 = no extra cost)</p>
                                    </div>
                                )}

                                {/* Image Upload */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">Image</label>
                                    <div
                                        onClick={() => !uploading && fileInputRef.current?.click()}
                                        className={`
                                            relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                                            ${formImageUrl ? 'border-[#223943]/30 bg-[#223943]/5' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}
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
                                                <span className="text-xs text-gray-400">PNG, JPG, WEBP</span>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                    </div>
                                    {formImageUrl && !uploading && (
                                        <button type="button" onClick={() => setFormImageUrl('')} className="text-xs text-red-500 hover:text-red-600 font-medium mt-1">
                                            Remove image
                                        </button>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={closeModal} disabled={loading || uploading} className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-black font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                                    <button type="submit" disabled={loading || uploading} className="flex-1 px-6 py-3 rounded-xl bg-[#223943] text-white font-semibold hover:bg-[#1b2d35] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl">
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {loading ? 'Saving…' : (modal.type === 'style' ? (modal.edit ? 'Update Style' : 'Add Style') : (modal.edit ? 'Update Option' : 'Add Option'))}
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

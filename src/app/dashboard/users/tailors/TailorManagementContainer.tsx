"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    CheckCircle2,
    XCircle,
    Mail,
    Phone,
    Loader2,
    Scissors
} from "lucide-react";
import { createTailor } from "@/app/actions/tailor-actions";
import { UserWithStatus } from "@/app/actions/user-actions";

// Use SerializedUser similarly to TailorTable
type SerializedUser = Omit<UserWithStatus, 'createdAt'> & {
    createdAt: string | Date;
};

interface TailorManagementProps {
    initialTailors: SerializedUser[];
}

export default function TailorManagementContainer({ initialTailors }: TailorManagementProps) {
    const [tailors, setTailors] = useState<SerializedUser[]>(initialTailors);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        setTailors(initialTailors);
    }, [initialTailors]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setIsSubmitting(true);
        setError(null);
        const formData = new FormData(formRef.current);

        const res = await createTailor(formData);

        if (res.success) {
            setIsModalOpen(false);
            formRef.current.reset();
            // We rely on server revalidation to update the list, but we can also optimistically update or just wait for props change
            // Since this is a client component receiving props from server component, 
            // the server component needs to re-render. Standard Next.js server actions with revalidatePath usually trigger this.
        } else {
            setError(res.error || "An unknown error occurred");
        }
        setIsSubmitting(false);
    };

    const filteredTailors = tailors.filter(tailor => {
        return (
            tailor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tailor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            false
        );
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Tailors</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage tailor accounts and their status</p>
                    </div>
                    {/* ADD TAILOR BUTTON */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-[#223943] text-white rounded-lg hover:bg-[#1b2d35] transition-all shadow-md hover:shadow-lg"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span className="font-semibold">Add New Tailor</span>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                        Total: <span className="font-bold text-lg ml-1">{tailors.length}</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Tailor</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold text-center">Account Status</th>
                            <th className="px-6 py-4 font-semibold text-center">Email Verified</th>
                            <th className="px-6 py-4 font-semibold">Joined Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredTailors.length > 0 ? (
                            filteredTailors.map((tailor) => (
                                <tr key={tailor.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200">
                                                {tailor.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{tailor.name}</p>
                                                <p className="text-sm text-gray-500">{tailor.email || 'No Email'}</p>
                                                {tailor.phoneNumber && (
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Phone size={10} /> {tailor.phoneNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <Scissors size={12} className="mr-1" /> Tailor
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tailor.isActive
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                            {tailor.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {tailor.emailVerified ? (
                                            <div className="flex items-center justify-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-semibold border border-green-100 w-fit mx-auto">
                                                <CheckCircle2 size={14} />
                                                <span>Verified</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-semibold border border-amber-100 w-fit mx-auto">
                                                <XCircle size={14} />
                                                <span>Unverified</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(tailor.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 mx-6">
                                        <Scissors size={48} className="text-gray-300 mb-2" />
                                        <p className="font-medium text-gray-900">No tailors found</p>
                                        <p className="text-sm">Try adjusting your search</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
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
                                            Add New Tailor
                                        </h2>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>

                                    <form ref={formRef} onSubmit={handleCreate} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                            <input
                                                name="name"
                                                required
                                                type="text"
                                                placeholder="e.g. Jane Tailor"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                            <input
                                                name="email"
                                                required
                                                type="email"
                                                placeholder="jane@example.com"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                            <input
                                                name="phoneNumber"
                                                type="tel"
                                                placeholder="+1 234 567 890"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#223943]/20 focus:border-[#223943] transition-all outline-none"
                                            />
                                        </div>

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

                                        <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800 flex gap-3">
                                            <Scissors className="shrink-0 mt-0.5" size={16} />
                                            <p>
                                                This creates a Tailor account. Share the credentials securely with the tailor.
                                            </p>
                                        </div>

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
                                            Create Tailor Account
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

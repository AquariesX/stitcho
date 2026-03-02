'use client';

import React, { useState } from 'react';
import type { UserWithStatus } from '@/app/actions/user-actions';
import {
    Search,
    CheckCircle,
    XCircle,
    Scissors,
    User
} from 'lucide-react';

// Since we pass data from Server Component to Client Component, Dates are serialized to strings
type SerializedUser = Omit<UserWithStatus, 'createdAt'> & {
    createdAt: string | Date;
};

interface TailorTableProps {
    initialTailors: SerializedUser[];
}

export default function TailorTable({ initialTailors }: TailorTableProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter tailors based on search
    const filteredTailors = initialTailors.filter(tailor => {
        return (
            tailor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tailor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                        Total Tailors: <span className="font-bold text-lg ml-1">{initialTailors.length}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                                <CheckCircle size={14} />
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
                                        <User size={48} className="text-gray-300 mb-2" />
                                        <p className="font-medium text-gray-900">No tailors found</p>
                                        <p className="text-sm">Try adjusting your search</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
                <span>Showing {filteredTailors.length} of {initialTailors.length} tailors</span>
            </div>
        </div>
    );
}

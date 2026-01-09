"use client";

import { usePathname } from "next/navigation";
import { Hammer, Construction } from "lucide-react";
import Link from "next/link";

export default function UnderDevelopmentPage() {
    const pathname = usePathname();

    const getPageTitle = (path: string) => {
        const segments = path.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        // Capitalize and replace hyphens
        return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ") : "Page";
    };

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center p-6">
            <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center max-w-lg w-full border border-gray-100">
                <div className="w-24 h-24 bg-[#223943]/10 rounded-full flex items-center justify-center mb-6">
                    <Construction size={48} className="text-[#223943]" />
                </div>

                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {getPageTitle(pathname)}
                </h1>
                <h2 className="text-xl font-medium text-[#223943] mb-4">Under Development</h2>

                <p className="text-gray-500 mb-8 leading-relaxed">
                    We're currently working hard to bring you this feature.
                    Please check back soon for updates!
                </p>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
                    <div className="h-full bg-[#223943] w-2/3 animate-pulse rounded-full"></div>
                </div>

                <Link
                    href="/dashboard"
                    className="px-8 py-3 bg-[#223943] text-white rounded-xl hover:bg-[#1b2d35] transition-colors font-medium shadow-lg shadow-[#223943]/20"
                >
                    Back to Dashboard
                </Link>
            </div>

            <p className="mt-8 text-sm text-gray-400 font-mono">
                Current Path: {pathname}
            </p>
        </div>
    );
}

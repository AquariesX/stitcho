"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen min-w-0 bg-[#F3F4F6] text-slate-900 transition-colors duration-300 dark:bg-[#0c1418] dark:text-gray-100">
            {/* 
        This is our Sidebar Component.
        It handles its own state (mobile open/close) and responsiveness.
      */}
            <Sidebar />

            {/* Main Content Area */}
            {/* 
         We add a flex-1 to make it take up remaining space.
         On mobile, the sidebar is fixed/overlay, so we don't need margin-left.
         On desktop, sidebar is relative/static so it naturally pushes content.
      */}
            <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden transition-all duration-300">
                <Header />
                <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}


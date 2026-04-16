"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#F3F4F6] dark:bg-[#0c1418] text-slate-900 dark:text-gray-100 transition-colors duration-300">
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
            <main className="flex-1 flex flex-col transition-all duration-300">
                <Header />
                <div className="flex-1 p-6 md:p-12">
                    {children}
                </div>
            </main>
        </div>
    );
}


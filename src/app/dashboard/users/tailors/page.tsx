import { getTailors } from "@/app/actions/user-actions";
import TailorManagementContainer from "./TailorManagementContainer";

export default async function TailorsPage() {
    const { data: tailors, success } = await getTailors();

    // Safe mapping to avoid Date serialization issues between Server and Client components
    const validTailors = success && tailors ? tailors.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
    })) : [];

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Tailors</h1>
                <p className="text-slate-500 text-lg">Manage and view all registered tailors.</p>
            </div>

            <TailorManagementContainer initialTailors={validTailors} />
        </div>
    );
}

// Ensure the page is dynamically rendered to fetch fresh data on every request
export const dynamic = 'force-dynamic';

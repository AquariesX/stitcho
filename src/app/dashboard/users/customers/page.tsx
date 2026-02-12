import { getCustomers } from "@/app/actions/customer-actions";
// Note: no role filter needed as getCustomers fetches from Customer table now
import CustomerTable from "./CustomerTable";

export default async function CustomersPage() {
    const { data: customers, success } = await getCustomers();

    // Safe mapping to avoid Date serialization issues between Server and Client components
    const validCustomers = success && customers ? customers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
    })) : [];

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Customers</h1>
                <p className="text-slate-500 text-lg">Manage and view all registered customers (Synced with Firebase).</p>
            </div>

            <CustomerTable initialCustomers={validCustomers} />
        </div>
    );
}

// Ensure the page is dynamically rendered to fetch fresh data on every request
export const dynamic = 'force-dynamic';

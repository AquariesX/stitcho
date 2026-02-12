import { getUsers } from "@/app/actions/user-actions";
import UserTable from "./UserTable";

export default async function UsersPage() {
    // getUsers now returns only Admin and Tailor users potentially, 
    // but the prompt said "in the user table just show the data of admin or tailor".
    // So this page is correct to show only 'users' table content.
    // Customers are now in their own table and page.

    const { data: users, success } = await getUsers();

    // Safe mapping
    const validUsers = success && users ? users.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
    })) : [];

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Staff Directory</h1>
                <p className="text-slate-500 text-lg">View and manage Admins and Tailors.</p>
                <div className="text-sm bg-yellow-50 text-yellow-800 p-2 rounded w-fit border border-yellow-200">
                    Note: Customers are managed in the <a href="/dashboard/users/customers" className="underline font-bold">Customers</a> page.
                </div>
            </div>

            <UserTable initialUsers={validUsers} />
        </div>
    );
}

// Ensure the page is dynamically rendered to fetch fresh data on every request
export const dynamic = 'force-dynamic';

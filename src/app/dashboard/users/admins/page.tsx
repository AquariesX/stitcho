import { getAdmins } from "@/app/actions/admin-actions";
import AdminManagementContainer from "./AdminManagementContainer";

// Server Component (no 'use client')
export default async function AdminManagementPage() {
    const { data: admins } = await getAdmins();

    return (
        <AdminManagementContainer
            initialAdmins={admins || []}
        />
    );
}

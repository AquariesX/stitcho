import { getAllTailorsWithShops } from "@/app/actions/tailor-management-actions";
import TailorProfilesClient from "./TailorProfilesClient";

export default async function TailorProfilesPage() {
    const { data: tailors, success } = await getAllTailorsWithShops();

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <TailorProfilesClient initialTailors={success && tailors ? tailors : []} />
        </div>
    );
}

export const dynamic = 'force-dynamic';

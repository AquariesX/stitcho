import { getAllTailorsWithShops } from "@/app/actions/tailor-management-actions";
import TailorShopsClient from "./TailorShopsClient";

export default async function TailorShopsPage() {
    const { data: tailors, success } = await getAllTailorsWithShops();

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <TailorShopsClient initialTailors={success && tailors ? tailors : []} />
        </div>
    );
}

export const dynamic = 'force-dynamic';

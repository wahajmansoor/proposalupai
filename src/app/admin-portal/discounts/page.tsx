'use client';
import { useState } from 'react';
import DiscountsDashboard from "../discounts";
import CreateDiscountForm from "../create-discount-form";

export default function DiscountsPage() {
    const [refresh, setRefresh] = useState(0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Manage Discounts</h1>
            <div className="grid gap-6 md:grid-cols-10">
                <div className="md:col-span-3">
                    <CreateDiscountForm onCreated={() => setRefresh(prev => prev + 1)} />
                </div>
                <div className="md:col-span-7">
                    <DiscountsDashboard key={refresh} />
                </div>
            </div>
        </div>
    );
}

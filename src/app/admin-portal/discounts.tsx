'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { listDiscountsAction } from '@/lib/paddle-actions';
import { toast } from '@/hooks/use-toast';
import { PADDLE_PRICES } from '@/lib/paddle/constants';

const PRICE_ID_MAP: Record<string, string> = {
    [PADDLE_PRICES.monthly]: 'Pro Monthly Plan',
    [PADDLE_PRICES.yearly]: 'Pro Yearly Plan',
    [PADDLE_PRICES.credits.ten]: '10 Credits Bundle',
    [PADDLE_PRICES.credits.twentyfive]: '25 Credits Bundle',
    [PADDLE_PRICES.credits.fifty]: '50 Credits Bundle',
};

export default function DiscountsDashboard() {
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDiscounts() {
            const result = await listDiscountsAction();
            if (result.success) {
                const sortedDiscounts = (result.discounts || []).sort((a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setDiscounts(sortedDiscounts);
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
            setLoading(false);
        }
        loadDiscounts();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Restriction</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discounts.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.code}</TableCell>
                                    <TableCell>{d.description}</TableCell>
                                    <TableCell>${(parseInt(d.amount) / 100).toFixed(2)}</TableCell>
                                    <TableCell>{d.type.charAt(0).toUpperCase() + d.type.slice(1)}</TableCell>
                                    <TableCell>
                                        {d.restrictTo && d.restrictTo.length > 0
                                            ? d.restrictTo.map((id: string) => PRICE_ID_MAP[id] || id).join(', ')
                                            : 'None'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

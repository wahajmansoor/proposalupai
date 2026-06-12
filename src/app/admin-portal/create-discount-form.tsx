'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createDiscountAction } from '@/lib/paddle-actions';
import { toast } from '@/hooks/use-toast';
import { PADDLE_PRICES } from '@/lib/paddle/constants';

const formSchema = z.object({
    code: z.string().min(1, "Code is required"),
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    currencyCode: z.string().length(3, "Currency code must be 3 characters"),
    type: z.enum(['flat', 'percentage']),
    restrictToProduct: z.string().optional(),
});

export default function CreateDiscountForm({ onCreated }: { onCreated: () => void }) {
    const [loading, setLoading] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: 'flat',
            currencyCode: 'USD',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const result = await createDiscountAction(values);
        if (result.success) {
            toast({ title: 'Success', description: 'Discount created' });
            form.reset();
            onCreated();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setLoading(false);
    }

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Create New Discount</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Code</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="currencyCode" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Currency Code</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value="flat">Flat</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value="percentage">Percentage</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="restrictToProduct" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Limit to Specific Product</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="All Products (Default)" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value="none">All Products</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value={PADDLE_PRICES.monthly}>Pro Monthly Plan</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value={PADDLE_PRICES.yearly}>Pro Yearly Plan</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value={PADDLE_PRICES.credits.ten}>10 Credits Bundle</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value={PADDLE_PRICES.credits.twentyfive}>25 Credits Bundle</SelectItem>
                                        <SelectItem className="dark:hover:bg-background dark:data-[state=checked]:bg-background cursor-pointer" value={PADDLE_PRICES.credits.fifty}>50 Credits Bundle</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Discount'}</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

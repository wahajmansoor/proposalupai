
"use client";

import { useState, useEffect } from 'react';
import type Stripe from 'stripe';
import { getCoupons, createCoupon, deleteCoupon } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Stripe.Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duration, setDuration] = useState('forever');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCoupons() {
      setIsLoading(true);
      try {
        const fetchedCoupons = await getCoupons();
        setCoupons(fetchedCoupons);
      } catch (error: any) {
        setFetchError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCoupons();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await createCoupon(formData);
    
    if (result.success) {
      toast({ title: 'Coupon Created', description: 'The new coupon has been successfully added.' });
      (event.target as HTMLFormElement).reset();
      setDuration('forever');
      const fetchedCoupons = await getCoupons();
      setCoupons(fetchedCoupons);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const handleDelete = async (couponId: string) => {
    const result = await deleteCoupon(couponId);
    if(result.success) {
        toast({ title: 'Coupon Deleted', description: 'The coupon has been removed.' });
        setCoupons(coupons.filter(c => c.id !== couponId));
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  const renderDuration = (coupon: Stripe.Coupon) => {
    if (coupon.duration === 'forever') return 'Forever';
    if (coupon.duration === 'once') return 'Once';
    if (coupon.duration === 'repeating' && coupon.duration_in_months) {
      return `For ${coupon.duration_in_months} month(s)`;
    }
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
        <p className="text-muted-foreground">Create and manage promotional codes for your service.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create New Coupon</CardTitle>
              <CardDescription>Add a new coupon to offer discounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="percent_off">Discount (%)</Label>
                  <Input id="percent_off" name="percent_off" type="number" placeholder="e.g., 25" required disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                   <Select name="duration" value={duration} onValueChange={setDuration} required disabled={isSubmitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forever">Forever</SelectItem>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="repeating">Repeating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {duration === 'repeating' && (
                  <div className="space-y-2">
                    <Label htmlFor="duration_in_months">Duration in Months</Label>
                    <Input id="duration_in_months" name="duration_in_months" type="number" placeholder="e.g., 3" required disabled={isSubmitting} />
                  </div>
                )}
                 <div className="space-y-2">
                  <Label htmlFor="name">Coupon Name (Optional)</Label>
                  <Input id="name" name="name" type="text" placeholder="e.g., 'Summer Sale'" disabled={isSubmitting}/>
                  <p className="text-xs text-muted-foreground">This is for internal reference.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Coupon
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing Coupons</CardTitle>
              <CardDescription>The list of all active coupons in your Stripe account.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : fetchError ? (
                <div className="text-center text-destructive py-12">
                  <p className="font-bold">Error Fetching Coupons</p>
                  <p className="text-sm">{fetchError}</p>
                </div>
              ) : coupons.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No coupons found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium">{coupon.name || coupon.id}</TableCell>
                        <TableCell>{coupon.percent_off}%</TableCell>
                        <TableCell>{renderDuration(coupon)}</TableCell>
                        <TableCell>
                          <Badge variant={coupon.valid ? 'default' : 'destructive'}>
                            {coupon.valid ? 'Valid' : 'Invalid'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This will permanently delete the coupon "{coupon.name || coupon.id}". This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(coupon.id)}>
                                    Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

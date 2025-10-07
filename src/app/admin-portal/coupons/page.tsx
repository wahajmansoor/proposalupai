
"use client";

import { useState, useEffect } from 'react';
import type Stripe from 'stripe';
import { getCoupons, createCoupon, deleteCoupon, updateCoupon, CouponWithPromotionCode } from './actions';
import { AppUser, getUsers } from '../users/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit, CalendarIcon, ChevronsUpDown, Check, User, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponWithPromotionCode[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponType, setCouponType] = useState('percentage');
  const [duration, setDuration] = useState('forever');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponWithPromotionCode | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

  // For customer combobox
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('all');

  const loadData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [fetchedCoupons, fetchedUsers] = await Promise.all([
            getCoupons(),
            getUsers()
        ]);
        setCoupons(fetchedCoupons);
        setUsers(fetchedUsers.filter(u => u.stripeCustomerId)); // Only include users with a stripe ID
      } catch (error: any) {
        setFetchError(error.message);
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    if (expiryDate) {
        formData.append('redeem_by', expiryDate.toISOString());
    }
    if (selectedCustomer) {
        formData.set('customer', selectedCustomer);
    }
    
    setIsSubmitting(true);
    const result = await createCoupon(formData);
    
    if (result.success) {
      toast({ title: 'Coupon Created', description: 'The new coupon has been successfully added.' });
      form.reset();
      setCouponType('percentage');
      setDuration('forever');
      setExpiryDate(undefined);
      setSelectedCustomer('all');
      await loadData();
    } else {
      toast({ title: 'Error Creating Coupon', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const handleDelete = async (couponId: string) => {
    const result = await deleteCoupon(couponId);
    if(result.success) {
        toast({ title: 'Coupon Deleted', description: 'The coupon has been deleted.' });
        await loadData();
    } else {
        toast({ title: 'Error Deleting Coupon', description: result.error, variant: 'destructive' });
    }
  }

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCoupon) return;

    setIsSavingEdit(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateCoupon(editingCoupon.id, formData);

    if (result.success) {
        toast({ title: 'Coupon Updated', description: 'The coupon has been successfully updated.' });
        setIsEditDialogOpen(false);
        setEditingCoupon(null);
        await loadData();
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSavingEdit(false);
  }

  const renderDiscount = (coupon: Stripe.Coupon) => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% off`;
    }
    if (coupon.amount_off) {
      return `$${(coupon.amount_off / 100).toFixed(2)} off`;
    }
    return 'N/A';
  }

  const renderDuration = (coupon: Stripe.Coupon) => {
    if (coupon.duration === 'forever') return 'Forever';
    if (coupon.duration === 'once') return 'Once';
    if (coupon.duration === 'repeating' && coupon.duration_in_months) {
      return `For ${coupon.duration_in_months} month(s)`;
    }
    return 'N/A';
  };

  const getStatus = (coupon: CouponWithPromotionCode) => {
    // Explicitly check for expiration date first
    if (coupon.expires_at && coupon.expires_at * 1000 < Date.now()) {
      return { text: 'Expired', variant: 'destructive' as const };
    }
    // Then check Stripe's 'valid' property
    if (!coupon.valid) {
      return { text: 'Invalid', variant: 'destructive' as const };
    }
    return { text: 'Valid', variant: 'default' as const };
  };
  
  const renderAppliesTo = (coupon: CouponWithPromotionCode) => {
    const plan = coupon.metadata?.applies_to_plan || 'any';
    switch(plan) {
        case 'monthly': return <Badge className={cn('bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200')}>Monthly Only</Badge>;
        case 'yearly': return <Badge className={cn('bg-green-100 text-green-800 border-green-200 hover:bg-green-200')}>Yearly Only</Badge>;
        default: return <Badge variant="secondary">Any Plan</Badge>;
    }
  }

  const selectedCustomerName = users.find(u => u.stripeCustomerId === selectedCustomer)?.name || "All Customers";

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Coupon Management</h1>
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
                    <Label htmlFor="code">Promotion Code</Label>
                    <Input id="code" name="code" type="text" placeholder="e.g., SUMMER25" disabled={isSubmitting} required/>
                  </div>
                  
                  <div className="space-y-2">
                      <Label>Type</Label>
                      <RadioGroup name="type" value={couponType} onValueChange={setCouponType} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="r-percentage" />
                          <Label htmlFor="r-percentage">Percentage</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="r-fixed" />
                          <Label htmlFor="r-fixed">Fixed Amount</Label>
                          </div>
                      </RadioGroup>
                  </div>

                  {couponType === 'percentage' ? (
                    <div className="space-y-2">
                      <Label htmlFor="percent_off">Discount (%)</Label>
                      <Input id="percent_off" name="percent_off" type="number" placeholder="e.g., 25" disabled={isSubmitting} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="amount_off">Amount (USD)</Label>
                      <Input id="amount_off" name="amount_off" type="number" placeholder="e.g., 50" disabled={isSubmitting} />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select name="duration" value={duration} onValueChange={setDuration} required disabled={isSubmitting}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="repeating">Multiple months</SelectItem>
                        <SelectItem value="forever">Forever</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {duration === 'repeating' && (
                    <div className="space-y-2">
                      <Label htmlFor="duration_in_months">Duration in Months</Label>
                      <Input id="duration_in_months" name="duration_in_months" type="number" placeholder="e.g., 3" disabled={isSubmitting} />
                    </div>
                  )}

                  <div className="space-y-2">
                      <Label htmlFor="applies_to">Applies To</Label>
                      <Select name="applies_to" defaultValue="any" required disabled={isSubmitting}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="any">Any Plan</SelectItem>
                              <SelectItem value="monthly">Monthly Plan Only</SelectItem>
                              <SelectItem value="yearly">Yearly Plan Only</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="customer">Limit to Specific Customer (Optional)</Label>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={comboboxOpen}
                            className="w-full justify-between font-normal"
                            disabled={isSubmitting}
                          >
                            <span className="truncate">
                                {selectedCustomer === 'all'
                                    ? "Select customer..."
                                    : users.find(u => u.stripeCustomerId === selectedCustomer)?.name || "Select customer..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search customer..." />
                            <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                <CommandItem
                                    value="all"
                                    onSelect={() => {
                                        setSelectedCustomer('all');
                                        setComboboxOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomer === 'all' ? "opacity-100" : "opacity-0")} />
                                    All Customers
                                </CommandItem>
                                {users.map((user) => (
                                    <CommandItem
                                    key={user.stripeCustomerId}
                                    value={user.stripeCustomerId!}
                                    onSelect={() => {
                                      setSelectedCustomer(user.stripeCustomerId!);
                                      setComboboxOpen(false);
                                    }}
                                    >
                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomer === user.stripeCustomerId ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_redemptions">Maximum Redemptions (Optional)</Label>
                    <Input id="max_redemptions" name="max_redemptions" type="number" placeholder="e.g., 100" disabled={isSubmitting} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="redeem_by">Expiration Date (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !expiryDate && "text-muted-foreground"
                                )}
                                disabled={isSubmitting}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={expiryDate}
                                onSelect={setExpiryDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
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
                        <TableHead>Applies To</TableHead>
                        <TableHead>Redemptions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map((coupon) => {
                        const status = getStatus(coupon);
                        return (
                        <TableRow key={coupon.id}>
                          <TableCell>
                            <div className="font-medium">{coupon.promotion_code}</div>
                             <div className="flex flex-wrap gap-1 mt-1">
                                {coupon.customer_name && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        <User className="mr-1 h-3 w-3" /> {coupon.customer_name}
                                    </Badge>
                                )}
                                {coupon.expires_at && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        <Clock className="mr-1 h-3 w-3" /> Expires {format(new Date(coupon.expires_at * 1000), 'MMM d, yyyy')}
                                    </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>{renderDiscount(coupon)}</TableCell>
                          <TableCell>{renderDuration(coupon)}</TableCell>
                          <TableCell>{renderAppliesTo(coupon)}</TableCell>
                          <TableCell className="text-center">{coupon.times_redeemed}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                                {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => { setEditingCoupon(coupon); setIsEditDialogOpen(true);}}>
                                <Edit className="h-4 w-4" />
                            </Button>
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
                                      This will permanently delete the coupon "{coupon.name || coupon.promotion_code}". This action cannot be undone.
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
                      )})}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              You can only edit the internal name and plan restrictions for a coupon. To change other details, please create a new coupon. The promotion code is: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{editingCoupon?.promotion_code}</span>
            </DialogDescription>
          </DialogHeader>
          {editingCoupon && (
            <form onSubmit={handleEditSubmit}>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Internal Name</Label>
                        <Input id="edit-name" name="name" defaultValue={editingCoupon.name || ''} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-applies_to">Applies To</Label>
                        <Select name="applies_to" defaultValue={editingCoupon.metadata?.applies_to_plan || 'any'} required>
                            <SelectTrigger id="edit-applies_to"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">Any Plan</SelectItem>
                                <SelectItem value="monthly">Monthly Plan Only</SelectItem>
                                <SelectItem value="yearly">Yearly Plan Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

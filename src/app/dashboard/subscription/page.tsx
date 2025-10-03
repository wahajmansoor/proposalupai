
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCustomerPortalSession } from '@/lib/stripe-actions';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBillingHistory, updateUserDisplayNameAction, type InvoiceDetails } from '@/app/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SubscriptionPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userProfile?.stripeCustomerId) return;
    
    setIsLoadingHistory(true);
    setHistoryError(null);
    const result = await getBillingHistory();
    if (result.error) {
        setHistoryError(result.error);
    } else if (result.invoices) {
        setInvoices(result.invoices);
    }
    setIsLoadingHistory(false);
  }, [userProfile?.stripeCustomerId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  const handleBillingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsManagingBilling(true);
    
    const result = await createCustomerPortalSession();
    
    if (result.error) {
        toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
        });
        setIsManagingBilling(false);
    } else if (result.url) {
        window.location.href = result.url;
    }
  };

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;
  const interval = userProfile?.subscriptionInterval;

  const getPlanName = () => {
    if (subscriptionStatus === 'active' || (subscriptionStatus === 'canceled' && renewalDate && new Date(renewalDate) > new Date()) || subscriptionStatus === 'trialing') {
        if (interval === 'year') return 'Pro Yearly';
        if (interval === 'month') return 'Pro Monthly';
    }
    return 'N/A';
  }

  const getRenewalText = () => {
    if (subscriptionStatus === 'trialing') return 'Trial Ends';
    if (subscriptionStatus === 'active') return 'Renews On';
    if (subscriptionStatus === 'canceled' && renewalDate && new Date(renewalDate) > new Date()) {
        return 'Access Ends On';
    }
    return null;
  }

  const isTrial = subscriptionStatus === 'trialing';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">View and manage your subscription and billing details.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current plan and billing information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex flex-col items-start gap-2">
                    <h3 className="font-semibold text-sm">Your Current Plan:</h3>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}</Badge>
                        {isTrial && <Badge variant="outline" className="border-green-600 text-green-600">2 Days Free Trial</Badge>}
                    </div>
                </div>
                {renewalDate && getRenewalText() && (
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {getRenewalText()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(renewalDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {userProfile?.stripeCustomerId && (
                <form onSubmit={handleBillingSubmit}>
                  <Button type="submit" disabled={isManagingBilling} className="w-full">
                    {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2" />}
                    Manage Billing & Subscription
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3 space-y-8">
           <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Review your past payments and invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : historyError ? (
                <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md text-sm">{historyError}</p>
              ) : invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No billing history found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell className="font-medium">{invoice.total}</TableCell>
                        <TableCell>
                           <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className={cn(invoice.status === 'paid' && 'bg-green-100 text-green-800 border-green-200')}>
                              {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.invoiceUrl ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={invoice.invoiceUrl} target="_blank">
                                View <ExternalLink className="ml-2 h-3 w-3" />
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
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

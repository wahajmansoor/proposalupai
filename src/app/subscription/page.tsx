
"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ExternalLink, Star, Copy, Check, Info, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCustomerPortalSession, chargeCardForCredits } from '@/lib/stripe-actions';
import { format, formatDistanceToNow } from 'date-fns';
import { getBillingHistory, getCreditHistory, type InvoiceDetails, type CreditHistoryItem } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShareIcons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';


const creditPackages = [
    { name: "10 Credits", price: 5, credits: 10, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID! },
    { name: "25 Credits", price: 10, credits: 25, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_25_PRICE_ID! },
    { name: "50 Credits", price: 25, credits: 50, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID! }
];

function BuyCredits() {
    const { user, userProfile } = useAuth();
    const [isPending, startTransition] = useTransition();
    const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
    const { toast } = useToast();

    const handlePurchase = (priceId: string) => {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to purchase credits.", variant: "destructive"});
            return;
        }
        setSelectedPriceId(priceId);
        startTransition(async () => {
            const formData = new FormData();
            formData.append('priceId', priceId);
            
            const result = await chargeCardForCredits(formData);

            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else if (result.success) {
                toast({ title: "Purchase Successful!", description: result.message });
            }
            setSelectedPriceId(null);
        });
    };

    const shouldShowPurchaseBlock = userProfile?.subscriptionStatus === 'trialing' || !userProfile?.subscriptionStatus || userProfile.subscriptionStatus === 'N/A';

    if (shouldShowPurchaseBlock) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Buy More Credits</CardTitle>
                    <CardDescription>Need more proposal improvements? Top up your balance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
                        <Info className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Credit purchases are available after your trial ends.</p>
                        <p className="text-xs text-muted-foreground">Upgrade to a Pro plan to buy credits.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Buy More Credits</CardTitle>
                <CardDescription>Need more proposal improvements? Top up your balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center gap-2">
                    {creditPackages.map((pkg) => (
                        <div key={pkg.priceId} className="flex flex-col items-center gap-2 p-3 border rounded-lg flex-1">
                            <span className="text-2xl font-bold">${pkg.price}</span>
                            <span className="font-semibold text-muted-foreground">{pkg.name}</span>
                            <Button
                                onClick={() => handlePurchase(pkg.priceId)}
                                disabled={isPending}
                                size="sm"
                                className="relative h-8 w-full bg-yellow-400 text-yellow-900 hover:bg-yellow-500 font-semibold gap-2 rounded-full mt-1"
                            >
                            {isPending && selectedPriceId === pkg.priceId ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : (
                                <>
                                    <ShoppingBag className="h-4 w-4" />
                                    <span>Buy Now</span>
                                </>
                            )}
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function CreditHistory() {
  const { userProfile } = useAuth();
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [referralLink, setReferralLink] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  
  const referralCode = userProfile?.referralCode;

  useEffect(() => {
    if (typeof window !== 'undefined' && referralCode) {
      setReferralLink(`${window.location.origin}/signup?invite=${referralCode}`);
    }
  }, [referralCode]);
  
  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      setError(null);
      const result = await getCreditHistory();
      if (result.error) {
        setError(result.error);
      } else if (result.history) {
        setHistory(result.history);
      }
      setIsLoading(false);
    }
    fetchHistory();
  }, []);
  
  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setHasCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setHasCopied(false), 2000);
  };
  
  const shareText = "Check out Proposal Up! The best way to generate winning proposals.";
  const socialShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`,
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit History</CardTitle>
        <CardDescription>A log of all the proposal improvement credits you've earned or purchased.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
           <div className="text-center py-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No credit history yet.</p>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-yellow-400/20 rounded-full">
                       <Star className="h-5 w-5 text-yellow-500" />
                   </div>
                   <div>
                       <p className="font-medium">{item.reason}</p>
                       <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                   </div>
                </div>
                <Badge variant="secondary" className="font-semibold text-lg">+{item.amount}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 border-t pt-4">
        <h4 className="font-semibold">Refer a Friend, Get Credits</h4>
        <p className="text-sm text-muted-foreground -mt-3">Invite a friend using your referral link. When they sign up and start their trial, you both get 5 free credits to improve your proposals!</p>
        <div className="w-full space-y-2">
            <Label htmlFor="referral-link" className="sr-only">Your Referral Link</Label>
            <div className="flex items-center gap-2">
              <Input id="referral-link" value={referralLink} readOnly />
              <Button size="icon" variant="outline" onClick={copyToClipboard} disabled={!referralLink}>
                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-start gap-8 w-full pt-2">
            <Link href={socialShareLinks.facebook} target="_blank" passHref>
              <ShareIcons.Facebook className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.twitter} target="_blank" passHref>
              <ShareIcons.Twitter className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.linkedin} target="_blank" passHref>
              <ShareIcons.LinkedIn className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.whatsapp} target="_blank" passHref>
              <ShareIcons.WhatsApp className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
          </div>
      </CardFooter>
    </Card>
  );
}


export default function SubscriptionPage() {
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userProfile) {
      setIsLoadingHistory(false);
      return
    };
    
    setIsLoadingHistory(true);
    setHistoryError(null);
    const result = await getBillingHistory();
    if (result.error) {
        setHistoryError(result.error);
    } else if (result.invoices) {
        setInvoices(result.invoices);
    }
    setIsLoadingHistory(false);
  }, [userProfile]);

  useEffect(() => {
    if (!loading) {
      fetchHistory();
    }
  }, [loading, fetchHistory]);
  
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Subscription & Credits</h1>
        <p className="text-muted-foreground">View your plan details, purchase credits, and manage billing.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-8">
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

              {userProfile?.stripeCustomerId ? (
                <form onSubmit={handleBillingSubmit}>
                  <Button type="submit" disabled={isManagingBilling} className="w-full">
                    {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2" />}
                    Manage Billing & Subscription
                  </Button>
                </form>
              ) : (
                <Button asChild className="w-full">
                    <Link href="/pricing">Upgrade to Pro</Link>
                </Button>
              )}
            </CardContent>
          </Card>
          <BuyCredits />
        </div>
        <div className="lg:col-span-3 space-y-8">
           <CreditHistory />
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
                 <div className="text-center py-4">
                  <p className="text-sm font-medium text-destructive">{historyError}</p>
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No billing history found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell className="font-medium capitalize">
                           <div className="flex items-center gap-2">
                            {invoice.description.toLowerCase().includes('credit') ? <ShoppingBag className="h-4 w-4 text-muted-foreground" /> : <CreditCard className="h-4 w-4 text-muted-foreground" />}
                            <span>{invoice.description}</span>
                           </div>
                        </TableCell>
                        <TableCell className="font-semibold">{invoice.total}</TableCell>
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

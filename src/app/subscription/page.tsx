
"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ExternalLink, Star, Copy, Check, Info, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPaddlePortalSession } from '@/lib/paddle-actions';
import { PADDLE_PRICES } from '@/lib/paddle/constants';
import PaddleCheckout from '@/components/paddle-checkout';
import { format, formatDistanceToNow } from 'date-fns';
import { getBillingHistory, type InvoiceDetails, type CreditHistoryItem, getCreditHistory } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShareIcons } from '@/components/icons';
import { useRouter } from 'next/navigation';


const creditPackages = [
  { name: "30 Credits", price: 5, credits: 30, priceId: PADDLE_PRICES.credits.ten },
  { name: "70 Credits", price: 10, credits: 70, priceId: PADDLE_PRICES.credits.twentyfive },
  { name: "200 Credits", price: 25, credits: 200, priceId: PADDLE_PRICES.credits.fifty }
];

function BuyCredits({ onPurchaseSuccess }: { onPurchaseSuccess: () => void }) {
  const { data: session } = useSession();
  const user = session?.user;
  const userProfile = user?.profile;
  const { toast } = useToast();
  const router = useRouter();

  const [hasCopied, setHasCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const referralCode = userProfile?.referralCode || user?.id?.substring(0, 8);

  useEffect(() => {
    if (typeof window !== 'undefined' && referralCode) {
      setReferralLink(`${window.location.origin}/signup?invite=${referralCode}`);
    }
  }, [referralCode]);

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setHasCopied(true);
    toast({ variant: "success", title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const shareText = "Check out Proposal Up! The best way to generate winning proposals.";
  const socialShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`,
  };

  const isTrialing = userProfile?.subscriptionStatus === 'trialing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy More Credits</CardTitle>
        <CardDescription>Need more proposal improvements? Top up your balance or refer a friend!</CardDescription>
      </CardHeader>
      <CardContent>
        {isTrialing ? (
          <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Credit purchases are available after your trial ends.</p>
            <p className="text-xs text-muted-foreground">Activate a plan to top up your balance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {creditPackages.map((pkg) => (
              <div key={pkg.priceId} className="flex flex-col items-center gap-1 p-2 border rounded-lg flex-1">
                <span className="text-2xl font-bold">${pkg.price}</span>
                <span className="font-semibold text-muted-foreground text-xs">{pkg.name}</span>
                <PaddleCheckout
                  priceId={pkg.priceId}
                  userId={user?.id || ''}
                  userEmail={user?.email || ''}
                  customData={{ purchaseType: 'credits', creditAmount: pkg.credits }}
                  buttonText="Buy"
                  className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 hover:bg-yellow-500 h-8 mt-1"
                  onSuccess={() => {
                    toast({ variant: "success", title: "Purchase Successful!", description: "Your credits will be added shortly." });
                    onPurchaseSuccess();
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 border-t pt-4">
        <h4 className="font-semibold">Refer a Friend, Get Credits</h4>
        <p className="text-sm text-muted-foreground -mt-3">Invite a friend. You get 10 credits and they get 5 credits!</p>
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
          <Link href={socialShareLinks.facebook} target="_blank">
            <ShareIcons.Facebook className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
          </Link>
          <Link href={socialShareLinks.twitter} target="_blank">
            <ShareIcons.Twitter className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
          </Link>
          <Link href={socialShareLinks.linkedin} target="_blank">
            <ShareIcons.LinkedIn className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
          </Link>
          <Link href={socialShareLinks.whatsapp} target="_blank">
            <ShareIcons.WhatsApp className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

function CreditHistory({ onDataRefresh, historyKey }: { onDataRefresh: () => void, historyKey: number }) {
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getCreditHistory();
    if (result?.error) {
      setError(result.error);
    } else if (result?.history) {
      setHistory(result.history);
    } else if (!result) {
      setError('Failed to connect to server.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit History</CardTitle>
        <CardDescription>A log of your earned credits.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
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
                    <p className="font-medium text-sm">{item.reason}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
                <Badge variant={item.amount >= 0 ? "default" : "destructive"} className="font-semibold">
                  {item.amount >= 0 ? '+' : ''}{item.amount}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryTable({ title, description, fetchHistory, historyKey }: { title: string; description: string; fetchHistory: () => Promise<{ invoices?: InvoiceDetails[]; error?: string; }>; historyKey: number }) {
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchHistory();
    if (result?.error) {
      setError(result.error);
    } else if (result?.invoices) {
      setInvoices(result.invoices);
    } else if (!result) {
      setError('Failed to connect to server.');
    }
    setIsLoading(false);
  }, [fetchHistory]);

  useEffect(() => {
    loadData();
  }, [loadData, historyKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No history found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-xs">{invoice.date}</TableCell>
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                      <span>{invoice.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{invoice.total}</TableCell>
                  <TableCell className="text-right">
                    {invoice.invoiceUrl ? (
                      <Button asChild variant="outline" size="sm" className="h-7 text-[10px]">
                        <Link href={invoice.invoiceUrl} target="_blank">
                          View
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">N/A</span>
                    )}
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


export default function SubscriptionPage() {
  const { data: session, update } = useSession();
  const userProfile = session?.user?.profile;
  const { toast } = useToast();
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const router = useRouter();

  const reloadData = useCallback(async () => {
    setHistoryKey(prevKey => prevKey + 1);
    await update(); // This refreshes the next-auth session data from the DB
  }, [update]);

  const handleBillingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsManagingBilling(true);

    const result = await createPaddlePortalSession();

    if ('error' in result) {
      toast({
        variant: "destructive",
        title: 'Action Failed',
        description: result.error,
      });
      setIsManagingBilling(false);
    } else if ('url' in result) {
      window.open(result.url, '_blank');
    }
  };

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;
  const interval = userProfile?.subscriptionInterval;

  const getPlanName = () => {
    if (subscriptionStatus === 'trialing') return '7 Days Free Trial';
    if (subscriptionStatus === 'active' || (subscriptionStatus === 'canceled' && renewalDate && new Date(renewalDate) > new Date())) {
      if (interval === 'year') return 'Pro Yearly';
      return 'Pro Monthly';
    }
    return 'Free Plan';
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
        <p className="text-muted-foreground">Manage your plan and billing.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current billing status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start gap-2">
                  <h3 className="font-semibold text-sm">Plan:</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}</Badge>
                  </div>
                </div>
                {renewalDate && getRenewalText() && (
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {getRenewalText()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(renewalDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {userProfile?.paddleCustomerId ? (
                <form onSubmit={handleBillingSubmit}>
                  <Button type="submit" disabled={isManagingBilling} className="w-full">
                    {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Manage Subscription
                  </Button>
                </form>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/dashboard/pricing">Upgrade to Pro</Link>
                </Button>
              )}
            </CardContent>
          </Card>
          <BuyCredits onPurchaseSuccess={reloadData} />
          <CreditHistory onDataRefresh={reloadData} historyKey={historyKey} />
        </div>
        <div className="lg:col-span-3 space-y-8">
          <HistoryTable
            title="Billing History"
            description="Review your past payments."
            fetchHistory={getBillingHistory}
            historyKey={historyKey}
          />
        </div>
      </div>
    </div>
  );
}

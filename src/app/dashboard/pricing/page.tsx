
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Briefcase, ArrowLeft, Tag, X, AlertTriangle, CreditCard, Sparkles } from 'lucide-react';
import { createPaddlePortalSession, checkUserStatusAction } from '@/lib/paddle-actions';
import { PADDLE_PRICES } from '@/lib/paddle/constants';
import PaddleCheckout from '@/components/paddle-checkout';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const plans = {
  monthly: {
    name: "Pro Monthly",
    price: 5,
    priceDescription: "/month",
    description: "Access all AI-powered features with no limits and craft proposals in seconds.",
    credits: 10,
    creditsDescription: "credits/month",
    priceId: PADDLE_PRICES.monthly,
  },
  yearly: {
    name: "Pro Yearly",
    price: 60,
    priceDescription: "/year",
    description: "The best value for long-term growth with AI-powered features to generate winning proposals in seconds.",
    credits: 100,
    creditsDescription: "credits/year",
    priceId: PADDLE_PRICES.yearly,
  }
};

const sharedFeatures = [
  "Unlimited Proposal Generation",
  "AI-Powered Suggestions",
  "Save & Edit Proposals",
  "Add Skill Profiles",
  "Email & Community Support",
  "Tailored Opening Strategies",
];

export default function PricingPage() {
  const { data: session, update } = useSession();
  const user = session?.user;
  const userProfile = user?.profile;
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;
  const currentInterval = userProfile?.subscriptionInterval;

  const isSubscribedAndActive = subscriptionStatus === 'active';
  const isTrialing = subscriptionStatus === 'trialing';
  const hasFailedPayment = subscriptionStatus === 'past_due';

  const isCanceledButActive = subscriptionStatus === 'canceled' && renewalDate && new Date(renewalDate) > new Date();

  const showPlanManagement = isTrialing || isSubscribedAndActive || isCanceledButActive;

  const isMonthlyActive = isSubscribedAndActive && currentInterval === 'month';
  const isYearlyActive = isSubscribedAndActive && currentInterval === 'year';

  const currentPlan = plans[billingInterval];

  // Set initial state based on user's plan
  useEffect(() => {
    if (isYearlyActive) {
      setBillingInterval('yearly');
    }
  }, [isYearlyActive]);

  const getButtonText = () => {
    if (hasFailedPayment) return 'Update Payment to Reactivate';
    if (isTrialing) {
      return billingInterval === 'monthly' ? 'Activate Monthly Plan' : 'Activate Yearly Plan';
    }
    if (isMonthlyActive && billingInterval === 'yearly') return 'Switch to Yearly Plan';
    if (isYearlyActive) return 'Your Current Plan';
    if (isSubscribedAndActive) return 'Your Current Plan';
    if (isCanceledButActive) return 'Reactivate Plan';
    return 'Start your journey';
  }

  const getPlanName = () => {
    if (currentInterval === 'year') return 'Pro Yearly';
    if (currentInterval === 'month') return 'Pro Monthly';
    if (isTrialing) return '7 Days Free Trial';
    if (hasFailedPayment) return 'Plan on Hold';
    return 'Free Plan';
  };

  const handleManageClick = async () => {
    setIsSubmitting(true);
    try {
      const result = await createPaddlePortalSession();
      if ('error' in result) {
        toast({ 
          variant: "destructive", 
          title: 'Action Failed', 
          description: result.error 
        });
      } else if ('url' in result) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: 'Error', 
        description: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCurrentPlanSelected = (isMonthlyActive && billingInterval === 'monthly') || (isYearlyActive && billingInterval === 'yearly');

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to view pricing</h2>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Manage Your Plan
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Empower your freelance career with AI.
        </p>
      </div>

      {hasFailedPayment && (
        <Card className="w-full max-w-md mb-8 border-destructive bg-destructive/5 text-destructive-foreground">
          <CardHeader className="pb-0 md:pb-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Payment Issue</CardTitle>
                <CardDescription className="text-destructive/80">Your subscription is on hold.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Please update your payment method to reactivate your Pro plan.</p>
            <Button onClick={handleManageClick} disabled={isSubmitting} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Manage Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {showPlanManagement && !hasFailedPayment && (
        <div className="w-full max-w-md mb-8 border rounded-lg p-4 flex items-center justify-between bg-card">
          <div>
            <p className="text-sm font-semibold">Your Current Plan:</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}</Badge>
            </div>
          </div>
          {renewalDate && (
            <div className="text-right">
              <p className="text-sm font-semibold">{isTrialing ? 'Ends' : 'Renews'}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(renewalDate), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2 mb-8">
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground', isYearlyActive && 'opacity-50 cursor-not-allowed')}>Monthly</Label>
        <Switch
          id="billing-interval"
          checked={billingInterval === 'yearly'}
          onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
          disabled={isYearlyActive}
        />
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>Yearly</Label>
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Best Value</Badge>
      </div>

      <div className="flex justify-center w-full max-w-md">
        <Card className="flex flex-col shadow-lg w-full border border-border">
          <CardHeader className="pb-0 md:pb-0">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <span>{currentPlan.name}</span>
              {billingInterval === 'yearly' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  Popular
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="min-h-[40px]">{currentPlan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="my-4">
              <div>
                <span className="text-5xl font-bold tracking-tight">${currentPlan.price}</span>
                <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
              </div>
              <p className="text-sm text-muted-foreground">{currentPlan.priceDescription}</p>
            </div>

            <div className="my-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50">
              <div className="flex items-center gap-3">
                <img src="/coin-anim.gif" alt="coin" className="h-10 w-10" />
                <div>
                  <h4 className="font-bold text-yellow-900 dark:text-yellow-200">AI Credits Included</h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <span className="font-semibold">{currentPlan.credits}</span> {currentPlan.creditsDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {isCurrentPlanSelected ? (
                <Button
                  size="lg"
                  className="w-full text-sm font-medium"
                  disabled={isSubmitting}
                  onClick={handleManageClick}
                  variant="outline"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Current Plan
                </Button>
              ) : (
                <PaddleCheckout
                  priceId={currentPlan.priceId}
                  userId={user.id}
                  userEmail={user.email || ''}
                  buttonText={getButtonText()}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
                  onSuccess={async () => {
                    toast({ variant: "success",  title: "Success!", description: "Checkout completed. Activating your plan..." });
                    let attempts = 0;
                    const poll = setInterval(async () => {
                      attempts++;
                      const res = await checkUserStatusAction();
                      if (res?.data?.subscriptionStatus === 'active' || attempts >= 10) {
                        clearInterval(poll);
                        await update();
                        toast({ variant: "success",  title: "Plan Activated!", description: "You are now on the Pro plan." });
                      }
                    }, 2000);
                  }}
                />
              )}
            </div>

            <div className="border-t my-6"></div>

            <ul className="space-y-3 mb-8 text-sm">
              {sharedFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {showPlanManagement && (
        <div className="mt-6 w-full max-w-md">
          <Button asChild size="lg" className="w-full" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

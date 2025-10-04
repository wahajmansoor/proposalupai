
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Briefcase, ArrowLeft, Tag, X } from 'lucide-react';
import { handlePlanChange, validateCouponAction, createCustomerPortalSession } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProposalUpLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const plans = {
  monthly: {
    name: "Pro Monthly",
    price: 20,
    priceDescription: "/month",
    description: "Access all AI-powered features with no limits and craft proposals in seconds."
  },
  yearly: {
    name: "Pro Yearly",
    price: 200,
    priceDescription: "/year",
    description: "The best value for long-term growth with AI-powered features to generate winning proposals in seconds."
  }
};

const sharedFeatures = {
    features: [
        "Unlimited Proposal Generation",
        "AI-Powered Suggestions",
        "Save & Edit Proposals",
        "Portfolio Collections",
        "Email & Community Support",
    ],
    personaIcon: Briefcase,
    personaTitle: "Hey Freelancers",
    personaDescription: "Stop drafting from scratch, Proposal Up AI creates tailored proposals and cover letters that win attention fast."
};

type ValidCoupon = {
    id: string;
    name: string | null;
    percent_off: number | null;
    amount_off: number | null;
};

export default function PricingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;
  const currentInterval = userProfile?.subscriptionInterval;
  
  const isSubscribedAndActive = subscriptionStatus === 'active';
  const isTrialing = subscriptionStatus === 'trialing';

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

  const canShowCoupon = !!userProfile?.subscriptionStatus;


  const handleCouponValidation = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError(null);
    setAppliedCoupon(null);

    const formData = new FormData();
    formData.append('code', couponCode.trim());
    formData.append('plan', billingInterval);

    const result = await validateCouponAction(formData);
    
    if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        toast({ title: 'Coupon Applied!', description: `The coupon "${result.coupon.name}" has been successfully applied.`});
    } else {
        setCouponError(result.error || 'An unexpected error occurred.');
    }

    setIsValidatingCoupon(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    setShowCouponInput(false);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    const result = await handlePlanChange(formData);

    if (result?.error) {
      toast({ title: 'An error occurred', description: result.error, variant: 'destructive' });
      setIsSubmitting(false);
    } else if (result?.redirectUrl) {
      router.push(result.redirectUrl);
    } else if (result?.success) {
        toast({ title: 'Success!', description: 'Your plan has been updated.' });
        // Optionally, re-fetch user profile data here to update UI instantly
        setIsSubmitting(false);
    }
  };

  const discountedPrice = useMemo(() => {
    if (!appliedCoupon) return currentPlan.price;

    let newPrice = currentPlan.price;
    if (appliedCoupon.percent_off) {
      newPrice = newPrice * (1 - appliedCoupon.percent_off / 100);
    } else if (appliedCoupon.amount_off) {
      newPrice = newPrice - (appliedCoupon.amount_off / 100);
    }

    return newPrice > 0 ? newPrice : 0;
  }, [appliedCoupon, currentPlan.price]);

  const getButtonText = () => {
    if (isTrialing) {
        return billingInterval === 'monthly' ? 'Activate Monthly Plan' : 'Activate Yearly Plan';
    }
    if (isMonthlyActive && billingInterval === 'yearly') return 'Switch to Yearly Plan';
    if (isYearlyActive) return 'Your Current Plan';
    if (isSubscribedAndActive) return 'Your Current Plan';
    if (isCanceledButActive) return 'Reactivate Plan';
    return 'Start a 2-day free trial!';
  }

  const getPlanName = () => {
    if (currentInterval === 'year') return 'Pro Yearly';
    if (currentInterval === 'month') return 'Pro Monthly';
    if (isTrialing) return 'Trial';
    return 'Free Plan';
  };
  
  const handleManageClick = async () => {
    setIsSubmitting(true);
    const result = await createCustomerPortalSession();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.url) {
      window.location.href = result.url;
    }
    setIsSubmitting(false);
  }

  const isButtonDisabled = isSubmitting || (isMonthlyActive && billingInterval === 'monthly') || (isYearlyActive && billingInterval === 'yearly');


  if (authLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {showPlanManagement ? 'Manage Your Plan' : 'Plans & Pricing'}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
                {showPlanManagement ? 'You have access to all Pro features.' : "Choose the plan that's right for you."}
            </p>
        </div>

        {showPlanManagement && (
            <div className="w-full max-w-md mb-8 border rounded-lg p-4 flex items-center justify-between bg-card">
              <div>
                <p className="text-sm font-semibold">Your Current Plan:</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}</Badge>
                  {isTrialing && <Badge variant="outline" className="border-green-600 text-green-600">2 Days Free Trial</Badge>}
                   {isSubscribedAndActive && userProfile?.lastPrice && (
                    <Badge variant="secondary">
                        ${userProfile.lastPrice.toFixed(2)}/{currentInterval === 'year' ? 'yr' : 'mo'}
                    </Badge>
                  )}
                </div>
              </div>
              {renewalDate && (
                  <div className="text-right">
                    <p className="text-sm font-semibold">{isTrialing ? 'Trial Ends' : 'Renews On'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(renewalDate), 'MMMM d, yyyy')}</p>
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
            disabled={isYearlyActive || !!appliedCoupon}
          />
          <Label htmlFor="billing-interval" className={cn(billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>Yearly</Label>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Save 16%</Badge>
        </div>

        <div className="flex justify-center w-full max-w-md">
             <Card className="flex flex-col shadow-lg w-full border border-border">
                <CardHeader className="pb-0 md:pb-0">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                      <span>{currentPlan.name}</span>
                      {billingInterval === 'yearly' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          +2 months free
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="min-h-[40px]">{currentPlan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                    <div className="my-4">
                      {appliedCoupon ? (
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold tracking-tight text-muted-foreground line-through">${currentPlan.price}</span>
                          <span className="text-5xl font-bold tracking-tight ml-2">${discountedPrice.toFixed(2)}</span>
                          <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-5xl font-bold tracking-tight">${currentPlan.price}</span>
                          <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">{currentPlan.priceDescription}</p>
                    </div>

                    <form onSubmit={handleFormSubmit}>
                        <input type="hidden" name="interval" value={billingInterval} />
                        {appliedCoupon && <input type="hidden" name="coupon" value={appliedCoupon.id} />}
                        
                        {canShowCoupon && (
                          <div className="my-4 space-y-2">
                            {!showCouponInput && !appliedCoupon ? (
                              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowCouponInput(true)}>
                                Have a promotion code?
                              </Button>
                            ) : appliedCoupon ? (
                              <div className="flex items-center justify-between text-sm p-2 bg-green-50 text-green-800 border border-green-200 rounded-md">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  <span className="font-medium">Coupon Applied: {appliedCoupon.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-800 hover:bg-green-100" onClick={removeCoupon}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    placeholder="Enter coupon code"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    disabled={isValidatingCoupon}
                                    className="h-9"
                                  />
                                  <Button onClick={handleCouponValidation} disabled={isValidatingCoupon || !couponCode.trim()} size="sm" type="button">
                                    {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Apply'}
                                  </Button>
                                </div>
                                {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {isYearlyActive ? (
                           <Button 
                                size="lg" 
                                className="w-full text-sm font-medium"
                                disabled={isSubmitting}
                                onClick={handleManageClick}
                                type="button"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Manage Subscription
                            </Button>
                        ) : (
                           <Button 
                                type="submit"
                                size="lg" 
                                className="w-full text-sm font-medium"
                                disabled={isButtonDisabled}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {getButtonText()}
                            </Button>
                        )}
                         {isTrialing && (
                            <p className="text-xs text-center text-muted-foreground mt-2">
                              This will end your trial and charge the card on file. To change your payment method, please visit your <Link href="/profile" className="underline">profile page</Link>.
                            </p>
                        )}
                    </form>
                    
                    <div className="border-t my-6"></div>

                    <ul className="space-y-3 mb-8 text-sm">
                        {sharedFeatures.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{feature}</span>
                        </li>
                        ))}
                    </ul>

                    <div className="mt-auto pt-6 border-t">
                         <div className="flex items-center gap-3">
                             <div className="bg-muted p-2 rounded-full">
                                 <sharedFeatures.personaIcon className="h-5 w-5 text-muted-foreground" />
                             </div>
                            <div>
                                <p className="font-semibold">{sharedFeatures.personaTitle}</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{sharedFeatures.personaDescription}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {showPlanManagement && (
            <div className="mt-6 w-full max-w-md">
                 <Button asChild size="lg" className="w-full">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2" />
                        Back to Dashboard
                    </Link>
                 </Button>
            </div>
        )}
    </div>
  );
}

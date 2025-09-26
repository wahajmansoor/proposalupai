
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Briefcase, ArrowLeft } from 'lucide-react';
import { createCheckoutSession, activateTrialAction, createCustomerPortalSession, upgradeSubscriptionAction, changeTrialPlanAction } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProposalUpLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const plans = {
  monthly: {
    name: "Pro Monthly",
    price: "$20",
    priceDescription: "/month",
    description: "Unlock unlimited access to all our AI-powered features and generate winning proposals in seconds.",
    buttonText: "Start a 2-day free trial",
  },
  yearly: {
    name: "Pro Yearly",
    price: "$200",
    priceDescription: "/year",
    description: "Get two months free! Unlock a full year of unlimited access and maximize your proposal win rate.",
    buttonText: "Start a 2-day free trial",
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
    personaTitle: "Full-time Freelancer",
    personaDescription: "For the serious freelancer who wants to save time, automate their workflow, and increase their win rate with high-quality proposals."
};


export default function PricingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  
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

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    if (isTrialing) {
        const result = await activateTrialAction(formData);
        if (result.error) {
            toast({ title: 'Activation Failed', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Plan Activated!', description: `Your trial has ended and your new ${billingInterval} subscription has begun.` });
        }
    } else if (isMonthlyActive && billingInterval === 'yearly') {
        const result = await upgradeSubscriptionAction();
        if (result.error) {
            toast({ title: 'Upgrade Failed', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Upgrade Successful!', description: 'You are now on the Pro Yearly plan.' });
        }
    } else if (isCanceledButActive || !isSubscribedAndActive) {
        await createCheckoutSession(formData);
    }
    
    setIsSubmitting(false);
  };

  const getButtonText = () => {
    if (isTrialing) {
        return billingInterval === 'monthly' ? 'Activate Monthly Plan' : 'Activate Yearly Plan';
    }
    if (isMonthlyActive && billingInterval === 'yearly') return 'Switch to Yearly Plan';
    if (isYearlyActive && billingInterval === 'monthly') return 'Manage Subscription';
    if (isSubscribedAndActive) return 'Your Current Plan';
    if (isCanceledButActive) return 'Reactivate Plan';
    return currentPlan.buttonText;
  }

  const getPlanName = () => {
    const planInterval = isTrialing ? billingInterval : currentInterval;
    if (planInterval === 'year') return 'Pro Yearly';
    if (planInterval === 'month') return 'Pro Monthly';
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
  const isManageButton = isYearlyActive && billingInterval === 'monthly';

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
                     <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}{isTrialing && " Trial"}</Badge>
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
          <Label htmlFor="billing-interval" className={cn(billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>Monthly</Label>
          <Switch 
            id="billing-interval" 
            checked={billingInterval === 'yearly'}
            onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
          />
          <Label htmlFor="billing-interval" className={cn(billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>Yearly</Label>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Save 16%</Badge>
        </div>

        <div className="flex justify-center w-full max-w-md">
            <Card className="flex flex-col shadow-lg w-full border border-border">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold">{currentPlan.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">{currentPlan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                    <div className="my-4">
                        <span className="text-5xl font-bold tracking-tight">{currentPlan.price}</span>
                        <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
                        <p className="text-sm text-muted-foreground">{currentPlan.priceDescription}</p>
                    </div>
                    
                    {isManageButton ? (
                        <Button 
                            size="lg" 
                            className="w-full text-sm font-medium"
                            disabled={isSubmitting}
                            onClick={handleManageClick}
                        >
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Manage Subscription
                        </Button>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-4">
                            <input type="hidden" name="interval" value={billingInterval} />
                            <Button 
                                type="submit"
                                size="lg" 
                                className="w-full text-sm font-medium"
                                disabled={isButtonDisabled}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {getButtonText()}
                            </Button>
                        </form>
                    )}
                    
                    
                    {isTrialing && (
                         <p className="text-xs text-center text-muted-foreground mt-2">
                           This will end your trial and charge the card on file. To change your payment method, please visit your <Link href="/profile" className="underline">profile page</Link>.
                        </p>
                    )}
                    {isYearlyActive && billingInterval === 'monthly' && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Downgrades are handled in the billing portal and take effect at the end of your current term.
                        </p>
                    )}


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

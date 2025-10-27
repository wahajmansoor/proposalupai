
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Briefcase, ArrowLeft, Tag, X, AlertTriangle, CreditCard } from 'lucide-react';
import { handlePlanChange, validateCouponAction } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProposalUpLogos } from '@/components/icons';

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

export default function OnboardingPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  
  const [appliedCoupon, setAppliedCoupon] = useState<ValidCoupon | null>(null);

  const currentPlan = plans[billingInterval];


  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !userProfile) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    formData.append('firebaseUid', user.uid);
    formData.append('stripeCustomerId', userProfile.stripeCustomerId || '');
    formData.append('subscriptionStatus', userProfile.subscriptionStatus || 'null');
    formData.append('subscriptionId', userProfile.subscriptionId || '');
    formData.append('currentInterval', userProfile.subscriptionInterval || '');
    
    const result = await handlePlanChange(formData);

    if (result?.error) {
      toast({ title: 'An error occurred', description: result.error, variant: 'destructive' });
      setIsSubmitting(false);
    } else if (result?.redirectUrl) {
      router.push(result.redirectUrl);
    } else if (result?.success) {
        toast({ title: 'Success!', description: result.message || 'Your plan has been updated.' });
        setTimeout(() => router.refresh(), 3000); 
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <div className="text-center mb-8 max-w-2xl">
        <ProposalUpLogos className="h-24 w-24 mx-auto mb-4 text-primary" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Welcome to Proposal Up!
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Start your 2-Day Free Trial and explore how Proposal Up can help you win more projects.
        </p>
      </div>

      <div className="flex items-center space-x-2 mb-8">
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>Monthly</Label>
        <Switch 
          id="billing-interval" 
          checked={billingInterval === 'yearly'}
          onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
          disabled={!!appliedCoupon}
        />
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>Yearly</Label>
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Save 16%</Badge>
      </div>

      <div className="flex justify-center w-full max-w-md">
           <Card className="flex flex-col shadow-lg w-full border-primary border-2">
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
                      
                         <Button 
                              type="submit"
                              size="lg" 
                              className="w-full text-sm font-medium"
                              disabled={isSubmitting}
                          >
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Start 2-day free trial
                          </Button>
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
    </div>
  );
}

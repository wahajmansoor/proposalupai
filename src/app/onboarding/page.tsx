
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { handlePlanChange } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProposalUpLogo } from '@/components/icons';
import { BgPattern } from '@/components/bg-pattern';

const plans = {
  monthly: {
    name: "Pro Monthly",
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
    price: 20,
    priceDescription: "/month",
  },
  yearly: {
    name: "Pro Yearly",
    priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
    price: 16.67,
    priceDescription: "/month",
    description: "Billed as $200/year"
  }
};

const sharedFeatures = [
    "Unlimited Proposal Generation",
    "AI-Powered Suggestions",
    "Save & Edit Proposals",
    "Portfolio Collections",
    "Email & Community Support",
];

function PlanRow({
    plan,
    isFeatured,
    onSelect,
    isSubmitting
}: {
    plan: typeof plans.monthly | typeof plans.yearly;
    isFeatured: boolean;
    onSelect: () => void;
    isSubmitting: boolean;
}) {
    return (
        <div 
            onClick={onSelect}
            className={`cursor-pointer rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 transform hover:scale-[1.02] ${isFeatured ? 'bg-slate-800 text-white featured-plan-pattern shadow-2xl' : 'bg-white/80 text-slate-900 shadow-lg'}`}
        >
            <div>
                <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                <p className={`mt-1 text-sm ${isFeatured ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.description || `The standard plan.`}
                </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
                <p className="text-4xl font-bold tracking-tight">
                    ${plan.price.toFixed(2)}<span className="text-base font-medium text-muted-foreground">{plan.priceDescription}</span>
                </p>
                {isSubmitting && (
                    <div className="flex justify-start sm:justify-end mt-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    )
}

export default function OnboardingPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const handleSelectPlan = async (interval: 'monthly' | 'yearly') => {
    setSelectedPlan(interval);
    if (!user || !userProfile) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('interval', interval);
    
    const result = await handlePlanChange(formData);

    if (result?.error) {
      toast({ title: 'An error occurred', description: result.error, variant: 'destructive' });
      setIsSubmitting(false);
      setSelectedPlan(null);
    } else if (result?.redirectUrl) {
      router.push(result.redirectUrl);
    } else if (result?.success) {
        toast({ title: 'Success!', description: result.message || 'Your plan has been updated.' });
        setTimeout(() => router.refresh(), 3000); 
        setIsSubmitting(false);
        setSelectedPlan(null);
    }
  };


  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center bg-background onboarding-gradient overflow-hidden p-4 sm:p-6">
        <BgPattern className="opacity-30" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <ProposalUpLogo className="mx-auto h-24 w-24 text-slate-800 dark:text-white" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Welcome to Proposal Up!
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">
            Start your 2-Day Free Trial and explore how Proposal Up can help you win more projects.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-2xl mt-12 space-y-4">
        <PlanRow 
            plan={plans.monthly}
            isFeatured={false}
            onSelect={() => handleSelectPlan('monthly')}
            isSubmitting={isSubmitting && selectedPlan === 'monthly'}
        />
        <PlanRow 
            plan={plans.yearly}
            isFeatured={true}
            onSelect={() => handleSelectPlan('yearly')}
            isSubmitting={isSubmitting && selectedPlan === 'yearly'}
        />
      </div>
    </div>
  );
}

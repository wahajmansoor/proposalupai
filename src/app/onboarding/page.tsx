
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

function PlanCard({
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
        <div className={`rounded-lg p-8 ${isFeatured ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide">{plan.name}</h3>
            <p className="mt-4">
                <span className="text-4xl font-bold tracking-tight">${plan.price.toFixed(2)}</span>
                <span className="text-sm font-semibold text-muted-foreground">{plan.priceDescription}</span>
            </p>
            {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
            
            <ul role="list" className="mt-8 space-y-4">
                {sharedFeatures.map(feature => (
                    <li key={feature} className="flex items-center gap-3">
                        <Check className={`h-5 w-5 ${isFeatured ? 'text-primary' : 'text-green-500'}`} />
                        <span className={isFeatured ? 'text-slate-300' : 'text-slate-700'}>{feature}</span>
                    </li>
                ))}
            </ul>
            
            <Button
                onClick={onSelect}
                disabled={isSubmitting}
                className={`mt-8 w-full ${isFeatured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start 2-Day Free Trial
            </Button>
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
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center bg-background onboarding-gradient overflow-hidden">
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

      <div className="relative z-10 mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
        <PlanCard 
            plan={plans.monthly}
            isFeatured={false}
            onSelect={() => handleSelectPlan('monthly')}
            isSubmitting={isSubmitting && selectedPlan === 'monthly'}
        />
        <PlanCard 
            plan={plans.yearly}
            isFeatured={true}
            onSelect={() => handleSelectPlan('yearly')}
            isSubmitting={isSubmitting && selectedPlan === 'yearly'}
        />
      </div>
    </div>
  );
}

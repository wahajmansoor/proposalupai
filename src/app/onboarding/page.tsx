
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { handlePlanChange } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProposalUpLogos } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const plans = {
  monthly: {
    name: "Pro Monthly",
    price: 20,
    priceDescription: "/monthly",
    interval: 'monthly' as 'monthly' | 'yearly',
    description: "Access all AI-powered features with no limits and create exceptional, tailored proposals in seconds.",
  },
  yearly: {
    name: "Pro Yearly",
    price: 200,
    priceDescription: "/annually",
    interval: 'yearly' as 'monthly' | 'yearly',
    description: "The best value for long-term growth with AI-powered features to generate winning proposals in seconds.",
  }
};

const sharedFeatures = [
    "Unlimited Proposal Generation",
    "AI-Powered Suggestions",
    "Save & Edit Proposals",
    "Skill Profiles",
    "Email & Community Support",
    "Tailored Opening Strategies",
];

function PlanRow({
    plan,
    isSelected,
    onSelect,
}: {
    plan: typeof plans.monthly | typeof plans.yearly;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const isFeatured = plan.interval === 'yearly';
    return (
        <div 
            onClick={onSelect}
            className={cn(
                'cursor-pointer rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 transform hover:scale-[1.02] shadow-lg',
                isSelected ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : '',
                isFeatured ? 'bg-slate-800 text-white featured-plan-pattern' : 'bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white'
            )}
        >
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                    {isFeatured ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">+2 months free</Badge>
                    ) : (
                        <Badge variant="outline">Pay as you go</Badge>
                    )}
                </div>
                 <p className={cn("mt-1 text-sm", isFeatured ? 'text-slate-300' : 'text-muted-foreground')}>
                    {plan.description}
                </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
                 <div className="flex items-baseline justify-end">
                    <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                 </div>
                 <p className={cn("text-sm -mt-1", isFeatured ? 'text-slate-400' : 'text-muted-foreground')}>{plan.priceDescription}</p>
            </div>
        </div>
    )
}

function PlanDetailsCard({ 
    plan, 
    isSubmitting, 
    onSubmit
}: { 
    plan: typeof plans.monthly | typeof plans.yearly;
    isSubmitting: boolean;
    onSubmit: () => void;
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 text-card-foreground rounded-xl shadow-2xl border w-full">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                            {plan.interval === 'yearly' ? (
                               <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">+2 months free</Badge>
                            ) : (
                                <Badge variant="outline">Pay as you go</Badge>
                            )}
                        </div>
                         <p className="text-muted-foreground mt-1">Unlock all AI features with unlimited access.</p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                        <div className="flex items-baseline justify-start sm:justify-end">
                            <span className="text-5xl font-bold tracking-tight">${plan.price}</span>
                            <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-1">{plan.priceDescription}</p>
                    </div>
                </div>
            </div>
            <div className="px-6 pb-6 text-left">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 my-6">
                    {sharedFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full">
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm">{feature}</span>
                        </li>
                    ))}
                </ul>
                 <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end my-4 gap-4">
                    <Button 
                        size="lg" 
                        className="text-base font-medium w-full sm:w-auto"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Start a 2-Day Free Trial
                    </Button>
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-medium">Proposal Improvements</p>
                        <Button
                            variant="outline"
                            className="relative h-9 px-3 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
                        >
                            <img src="/coin-anim.gif" alt="coin" className="h-6 w-6" />
                            <span className="font-bold">{plan.interval === 'monthly' ? '10 Free Credits' : '100 Free Credits'}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
  const { user, userProfile, handleLogout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectPlan = async () => {
    if (!user || !userProfile) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('interval', selectedInterval);
    
    const result = await handlePlanChange(formData);

    if (result?.error) {
      toast({ title: 'An error occurred', description: result.error, variant: "destructive" });
      setIsSubmitting(false);
    } else if (result?.redirectUrl) {
      router.push(result.redirectUrl);
    } else if (result?.success) {
        toast({ title: 'Success!', description: result.message || 'Your plan has been updated.' });
        setTimeout(() => router.refresh(), 3000); 
        setIsSubmitting(false);
    }
  };

  const selectedPlanDetails = plans[selectedInterval];

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center bg-background onboarding-gradient overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="absolute top-4 left-4 z-10">
        <TooltipProvider>
            <ThemeToggle />
        </TooltipProvider>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="rounded-full flex items-center justify-center p-2 text-foreground hover:text-foreground"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15.5 8.04045C15.4588 6.87972 15.3216 6.15451 14.8645 5.58671C14.2114 4.77536 13.0944 4.52064 10.8605 4.01121L9.85915 3.78286C6.4649 3.00882 4.76777 2.6218 3.63388 3.51317C2.5 4.40454 2.5 6.1257 2.5 9.56803V14.432C2.5 17.8743 2.5 19.5955 3.63388 20.4868C4.76777 21.3782 6.4649 20.9912 9.85915 20.2171L10.8605 19.9888C13.0944 19.4794 14.2114 19.2246 14.8645 18.4133C15.3216 17.8455 15.4588 17.1203 15.5 15.9595" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path><path d="M18.5 9.01172C18.5 9.01172 21.5 11.2212 21.5 12.0117C21.5 12.8023 18.5 15.0117 18.5 15.0117M21 12.0117H8.49998" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path></svg>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Logout</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative z-10 mx-auto max-w-7xl w-full mt-4">
         <div className="text-center mb-12">
            <ProposalUpLogos className="mx-auto h-24 w-24 text-slate-800 dark:text-white" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Welcome to <br className="sm:hidden" /> Proposal Up!
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">
                Choose a plan to get started and explore how Proposal Up can help you win more projects.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <div className="space-y-4">
                <PlanRow 
                    plan={plans.monthly}
                    isSelected={selectedInterval === 'monthly'}
                    onSelect={() => setSelectedInterval('monthly')}
                />
                <PlanRow 
                    plan={plans.yearly}
                    isSelected={selectedInterval === 'yearly'}
                    onSelect={() => setSelectedInterval('yearly')}
                />
            </div>

            <div className="flex justify-center">
                <PlanDetailsCard
                    plan={selectedPlanDetails}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSelectPlan}
                />
            </div>
        </div>
      </div>
    </div>
  );
}

    
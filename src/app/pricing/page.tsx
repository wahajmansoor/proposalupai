
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, User, Users, Briefcase } from 'lucide-react';
import { createCheckoutSession } from '@/app/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ProposalUpLogo } from '@/components/icons';
import { cn } from '@/lib/utils';

const plans = [
    {
        name: "Free",
        price: "$0",
        priceDescription: "/month for one person",
        description: "Conceptualize anything and bring your ideas to life. No cost, but with limits.",
        buttonText: "Current Plan",
        isCurrent: true,
        isFeatured: false,
        features: [
            "1 Project",
            "1 Page",
            "Share - Read-only link",
            "Export - Figma only",
        ],
        personaIcon: User,
        personaTitle: "New Designer or Developer",
        personaDescription: "New to the industry and Proposal Up. Usual projects are basic 1-page landing pages, requiring little to no collaboration."
    },
    {
        name: "Pro",
        price: "$20",
        priceDescription: "/month for one person",
        description: "Complete freedom with unlimited access to build websites of any size.",
        buttonText: "Start a 2-day free trial",
        isCurrent: false,
        isFeatured: true,
        features: [
            "Unlimited Proposal Generation",
            "AI-Powered Suggestions",
            "Save & Edit Proposals",
            "Portfolio Collections",
            "Email & Community Support",
        ],
        personaIcon: Briefcase,
        personaTitle: "Full-time Freelancer",
        personaDescription: "An experienced freelancer managing larger projects with more pages and ongoing client maintenance, requiring more project slots."
    },
    {
        name: "Team",
        price: "$36",
        priceDescription: "/month per person (Min 3 people)",
        description: "Bring your team over with all Pro access and enhanced collaboration.",
        buttonText: "Continue with Team",
        isCurrent: false,
        isFeatured: false,
        features: [
            "Everything in Pro +",
            "3 users included",
            "Team workspace",
            "Branded sharing",
        ],
        personaIcon: Users,
        personaTitle: "Agency or Team",
        personaDescription: "Collaborates with a team on multiple large website projects, benefiting from unlimited projects and extra membership seats."
    }
];

export default function PricingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const hasActiveSubscription = userProfile?.subscriptionStatus === 'active';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Not Authenticated", description: "Please log in to subscribe.", variant: "destructive" });
        router.push('/login');
        return;
    }
    setIsSubmitting(true);
    try {
      await createCheckoutSession();
      // The user will be redirected to Stripe by the server action
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not initiate checkout. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
      );
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Plans & Pricing</h1>
            <p className="text-lg text-muted-foreground mt-2">Choose the plan that's right for you.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
            {plans.map((plan) => (
                <Card key={plan.name} className={cn("flex flex-col shadow-lg", plan.isFeatured && "border-primary ring-2 ring-primary")}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                        <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                        <div className="my-4">
                            <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                            <span className="text-lg font-medium text-muted-foreground ml-1">USD</span>
                            <p className="text-sm text-muted-foreground">{plan.priceDescription}</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="w-full">
                            <Button 
                                size="lg" 
                                className={cn(
                                    "w-full text-base font-semibold", 
                                    plan.name === 'Pro' ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                                    hasActiveSubscription && plan.name === 'Pro' && 'opacity-50 cursor-not-allowed',
                                    plan.name !== 'Pro' && 'opacity-50 cursor-not-allowed'
                                )}
                                disabled={isSubmitting || plan.name !== 'Pro' || (hasActiveSubscription && plan.name === 'Pro')}>
                                {isSubmitting && plan.name === "Pro" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {hasActiveSubscription && plan.name === 'Pro' ? 'Subscribed' : plan.buttonText}
                            </Button>
                        </form>
                        
                        <div className="border-t my-6"></div>

                        <ul className="space-y-3 mb-8 text-sm">
                            {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-3">
                                <Check className="h-4 w-4 text-primary" />
                                <span>{feature}</span>
                            </li>
                            ))}
                        </ul>

                        <div className="mt-auto pt-6 border-t">
                             <div className="flex items-center gap-3">
                                 <div className="bg-muted p-2 rounded-full">
                                     <plan.personaIcon className="h-5 w-5 text-muted-foreground" />
                                 </div>
                                <div>
                                    <p className="font-semibold">{plan.personaTitle}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{plan.personaDescription}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}

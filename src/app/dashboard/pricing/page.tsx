
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/app/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

const features = [
  "Unlimited Proposal Generation",
  "AI-Powered Suggestions",
  "Save & Edit Proposals",
  "Portfolio Collections",
  "Email & Community Support",
];

export default function PricingPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const hasActiveSubscription = userProfile?.subscriptionStatus === 'active';

  // Redirect if user is already subscribed
  useEffect(() => {
    if (!authLoading && hasActiveSubscription) {
        router.replace('/dashboard');
    }
  }, [userProfile, authLoading, router, hasActiveSubscription]);

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
    return null; // Layout will show a loader
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Proposal Up Pro</CardTitle>
          <CardDescription>
            {userProfile?.trialEndDate && new Date() < userProfile.trialEndDate 
              ? "Your free trial has ended. Upgrade to continue creating proposals."
              : "Unlock all features and generate unlimited proposals."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <span className="text-4xl font-extrabold">$20</span>
            <span className="text-muted-foreground">/ month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="bg-primary/10 p-1 rounded-full">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleSubmit}>
            <Button size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Redirecting to Checkout...' : 'Start a 2-day free trial'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

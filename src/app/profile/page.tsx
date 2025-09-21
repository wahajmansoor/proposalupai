"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, CreditCard, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCustomerPortalSession } from '@/app/lib/stripe-actions';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [isManagingBilling, setIsManagingBilling] = useState(false);

  const handleManageBilling = async () => {
    setIsManagingBilling(true);
    try {
      await createCustomerPortalSession();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not redirect to billing portal.',
        variant: 'destructive',
      });
      setIsManagingBilling(false);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
       <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground">View and manage your account details.</p>
       </div>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center gap-4">
             <Avatar className="h-16 w-16">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User avatar'} />}
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
                <div className="font-semibold text-lg">{user?.displayName}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Your current plan and billing information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h3 className="font-semibold">Your Plan</h3>
                    <Badge variant={subscriptionStatus === 'active' || subscriptionStatus === 'trialing' ? 'default' : 'secondary'} className="capitalize mt-1 bg-primary">
                        {subscriptionStatus || 'N/A'}
                    </Badge>
                </div>
                 {renewalDate && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && (
                    <div className="text-right">
                        <p className="font-semibold">
                            {subscriptionStatus === 'trialing' ? 'Trial Ends' : 'Renews On'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(renewalDate), 'MMMM d, yyyy')}
                        </p>
                    </div>
                )}
            </div>
             {userProfile?.stripeCustomerId && (
                <Button onClick={handleManageBilling} disabled={isManagingBilling} className="w-full">
                    {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2" />}
                    Manage Billing & Subscription
                </Button>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

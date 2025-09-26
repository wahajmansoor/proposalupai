
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCustomerPortalSession } from '@/app/lib/stripe-actions';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserDisplayNameAction } from '@/app/lib/actions';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName || displayName === user?.displayName) {
      return;
    }
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateUserDisplayNameAction(formData);

    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Your display name has been updated.' });
    }
    setIsSaving(false);
  };

  const handleBillingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsManagingBilling(true);
    
    const result = await createCustomerPortalSession();
    
    if (result.error) {
        toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
        });
        setIsManagingBilling(false);
    } else if (result.url) {
        window.location.href = result.url;
    }
  };

  const subscriptionStatus = userProfile?.subscriptionStatus;
  const renewalDate = userProfile?.subscriptionCurrentPeriodEnd;
  const interval = userProfile?.subscriptionInterval;

  const getPlanName = () => {
    if (subscriptionStatus === 'active' || subscriptionStatus === 'canceled' || subscriptionStatus === 'trialing') {
        if (interval === 'year') return 'Pro Yearly';
        if (interval === 'month') return 'Pro Monthly';
    }
    return 'Free Plan';
  }

  const getRenewalText = () => {
    if (subscriptionStatus === 'trialing') return 'Trial Ends';
    if (subscriptionStatus === 'active') return 'Renews On';
    if (subscriptionStatus === 'canceled' && renewalDate && new Date(renewalDate) > new Date()) {
        return 'Access Ends On';
    }
    return null;
  }

  const isTrial = subscriptionStatus === 'trialing';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">View and manage your account details.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit}>
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
                  <div className="grid w-full gap-1.5">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input 
                        id="displayName"
                        name="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                  </div>
                </div>
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                    />
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isSaving || displayName === user?.displayName}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current plan and billing information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex flex-col items-start gap-2">
                    <h3 className="font-semibold text-sm">Your Current Plan:</h3>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{getPlanName()}</Badge>
                        {isTrial && <Badge variant="outline" className="border-green-600 text-green-600">2 Days Free Trial</Badge>}
                    </div>
                </div>
                {renewalDate && getRenewalText() && (
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {getRenewalText()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(renewalDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {userProfile?.stripeCustomerId && (
                <form onSubmit={handleBillingSubmit}>
                  <Button type="submit" disabled={isManagingBilling} className="w-full">
                    {isManagingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2" />}
                    Manage Billing & Subscription
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

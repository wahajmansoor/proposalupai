// src/app/profile/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, sendPasswordReset } from '@/lib/firebase/auth';
import { Loader2 } from 'lucide-react';
import { createCustomerPortalSession } from '@/app/lib/stripe-actions';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  
  // This effect correctly syncs the component's state with the auth context.
  // It sets the name when the user object is first loaded.
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);


  if (loading || !user) {
    return null; // Layout handles loading/redirect
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(user, { displayName: displayName.trim() });
      // The user object in context will update automatically via onAuthStateChanged
      toast({
        title: 'Success!',
        description: 'Your profile has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
       toast({
        title: 'Error',
        description: 'No email address found for your account.',
        variant: 'destructive',
      });
      return;
    }
    // Only allow password reset for email providers
    if (user.providerData.some(p => p.providerId !== 'password')) {
        toast({
            title: 'Action Not Available',
            description: 'Password reset is only available for accounts created with email and password.',
            variant: 'destructive',
        });
        return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordReset(user.email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox to reset your password.',
      });
    } catch (error: any) {
       toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingReset(false);
    }
  }

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
    } finally {
        setIsManagingBilling(false);
    }
  };
  
  const isEmailPasswordProvider = user.providerData.some(p => p.providerId === 'password');

  return (
    <div className="max-w-2xl mx-auto space-y-8 container py-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        
        <Card>
            <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Manage your display name and account details.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input 
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email"
                            type="email"
                            value={user.email || ''}
                            disabled
                        />
                    </div>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your password.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handlePasswordReset} variant="outline" disabled={isSendingReset || !isEmailPasswordProvider}>
                    {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Password Reset Email
                </Button>
                 {!isEmailPasswordProvider && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Password management is not available because you signed in with a social provider.
                    </p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

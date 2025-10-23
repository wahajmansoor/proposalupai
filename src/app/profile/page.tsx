
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserDisplayNameAction } from '@/app/lib/actions';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  useEffect(() => {
    // Prioritize userProfile which is from Firestore
    const name = userProfile?.displayName || user?.displayName;
    if (name) {
      setDisplayName(name);
    }
  }, [user?.displayName, userProfile?.displayName]);

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
    const currentName = userProfile?.displayName || user?.displayName;
    if (!displayName || displayName === currentName) {
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
  
  const currentName = userProfile?.displayName || user?.displayName;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">General Profile</h1>
            <p className="text-muted-foreground">View and manage your account details.</p>
        </div>
        <form onSubmit={handleSubmit}>
            <Card>
            <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    {user?.photoURL && <AvatarImage src={user.photoURL} alt={currentName || 'User avatar'} />}
                    <AvatarFallback>{getInitials(currentName)}</AvatarFallback>
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
                <Button type="submit" disabled={isSaving || displayName === currentName}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </CardFooter>
            </Card>
        </form>
    </div>
  );
}

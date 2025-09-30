
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProposalUpLogo, GoogleIcon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getGoogleAuthUrl } from '@/app/lib/actions';
import { useAuth } from '@/context/auth-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const googleAuthUrl = await getGoogleAuthUrl();
      const popup = window.open(googleAuthUrl, 'google-signin', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const { type, error, details } = event.data;
        
        window.removeEventListener('message', handleMessage);
        setIsGoogleLoading(false);

        if (type === 'auth-success') {
          toast({
            title: 'Successfully signed in!',
            description: "Welcome back! We're redirecting you now.",
          });
          router.refresh();
        } else if (type === 'auth-error') {
            toast({
                title: `Google Sign-In Failed: ${error}`,
                description: details || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
      };
      
      window.addEventListener('message', handleMessage);

    } catch (error: any) {
      toast({
        title: 'Google Sign-In Failed',
        description: "Could not initiate Google Sign-In. Please try again.",
        variant: 'destructive',
      });
       setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      toast({ title: 'Missing Fields', description: 'Please enter both email and password.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
          throw new Error('Failed to create session.');
      }
      
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      router.push('/dashboard');

    } catch (error: any) {
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else {
        errorMessage = error.message;
      }
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || user) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <ProposalUpLogo className="h-12 w-12 mx-auto text-primary" />
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </div>
          </form>
           <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
              Sign in with Google
            </Button>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

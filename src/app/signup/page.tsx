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
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { signUpUser } from '@/lib/firebase/auth';
import { getGoogleAuthUrl } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';


const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => {
  return (
    <div className={cn("flex items-center text-sm", met ? "text-green-600" : "text-muted-foreground")}>
      {met ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4 text-red-500" />}
      {text}
    </div>
  );
};

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const allRequirementsMet = Object.values(passwordValidation).every(Boolean);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const googleAuthUrl = await getGoogleAuthUrl();
      const popup = window.open(googleAuthUrl, 'google-signin', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const { type, token, error, details } = event.data;

        if (type === 'auth-token' && token) {
          signInWithCustomToken(auth, token)
            .then(() => {
              toast({
                title: 'Successfully signed in!',
                description: "Welcome! We're redirecting you to the dashboard.",
              });
              // Redirection is handled by the root page
            })
            .catch((signInError) => {
              console.error('Custom token sign-in error:', signInError);
              toast({
                title: 'Sign-In Failed',
                description: 'There was a problem signing you in. Please try again.',
                variant: 'destructive',
              });
            })
            .finally(() => {
                setIsGoogleLoading(false);
                window.removeEventListener('message', handleMessage);
            });

        } else if (type === 'auth-error') {
            toast({
                title: `Google Sign-Up Failed: ${error}`,
                description: details || 'An unexpected error occurred.',
                variant: 'destructive',
            });
            setIsGoogleLoading(false);
            window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          if(isGoogleLoading) {
            setIsGoogleLoading(false);
            window.removeEventListener('message', handleMessage);
          }
        }
      }, 1000);

    } catch (error: any) {
      toast({
        title: 'Google Sign-Up Failed',
        description: "Could not initiate Google Sign-Up. Please try again.",
        variant: 'destructive',
      });
       setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName || !email || !password) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!allRequirementsMet) {
      toast({
        title: 'Weak Password',
        description: 'Please ensure your password meets all the requirements.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signUpUser(fullName, email, password);
      toast({
        title: 'Account Created!',
        description: "Welcome! We're glad to have you.",
      });
      // Redirection is handled by the root page
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      toast({
        title: 'Sign Up Failed',
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
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <ProposalUpLogo className="h-12 w-12 mx-auto" />
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input 
                  id="full-name" 
                  placeholder="Jane Doe" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
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
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
                 {password && (
                  <div className="mt-2 space-y-1">
                      <PasswordRequirement met={passwordValidation.length} text="At least 8 characters long" />
                      <PasswordRequirement met={passwordValidation.uppercase} text="Contains an uppercase letter" />
                      <PasswordRequirement met={passwordValidation.lowercase} text="Contains a lowercase letter" />
                      <PasswordRequirement met={passwordValidation.number} text="Contains a number" />
                      <PasswordRequirement met={passwordValidation.special} text="Contains a special character" />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || (password.length > 0 && !allRequirementsMet)}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create an account
              </Button>
               <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Sign up with Google
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

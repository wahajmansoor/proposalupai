
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProposalUpLogos, GoogleIcon, ProposalUpLogoLight } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import { BgPattern } from '@/components/bg-pattern';
import { ThemeToggle } from '@/components/theme-toggle';
import { isAdmin as checkAdmin } from '@/lib/utils';

function LoginContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;
  
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await signIn('google', { callbackUrl: '/dashboard' });
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
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (res?.error) {
         toast({
          title: 'Login Failed',
          description: "Invalid email or password. Please try again.",
          variant: 'destructive',
        });
      } else {
        toast({ variant: "success",  title: 'Login Successful', description: 'Welcome back!' });
        
        // Role-based redirection
        const isAdminUser = checkAdmin(email);
        if (isAdminUser) {
          router.push('/admin-portal');
        } else {
          router.push('/dashboard');
        }
        
        router.refresh();
      }
    } catch (error: any) {
       toast({
        title: 'Login Failed',
        description: "An unexpected error occurred.",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || user) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <div className="flex flex-col justify-center p-4 sm:p-12 xl:p-20">
          <div className="w-full max-w-md mx-auto">
            <Link href="https://www.proposalupai.com/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
              <p className="text-muted-foreground mt-1">Enter your email and password to sign in!</p>
            </div>

            {error === 'ConcurrentLogin' && (
              <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Logged out</AlertTitle>
                <AlertDescription>
                  You have been logged out because your account was used to sign in from another device.
                </AlertDescription>
              </Alert>
            )}


            <Button variant="outline" className="w-full mb-6" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
              Sign in with Google
            </Button>
            
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@domain.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password}
                      placeholder="••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || isGoogleLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading || isGoogleLoading}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="keep-logged-in" />
                    <Label htmlFor="keep-logged-in" className="text-sm font-normal">Keep me logged in</Label>
                  </div>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={isLoading || isGoogleLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </div>
            </form>
           
            <div className="mt-6 text-center text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center bg-auth-panel text-white relative">
          <BgPattern />
          <div className="flex flex-col items-center text-center z-10">
            <Link href="/" className="mb-4">
              <ProposalUpLogoLight className="h-32 w-32 text-white" />
            </Link>
            <h2 className="text-3xl font-bold mb-2">Proposal Up</h2>
            <p className="text-lg text-white/80 max-w-md">
              Generate tailored proposals with the power of AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

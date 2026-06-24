
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProposalUpLogos, ProposalUpLogoLight, GoogleIcon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, XCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { BgPattern } from '@/components/bg-pattern';
import { ThemeToggle } from '@/components/theme-toggle';

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => {
  return (
    <div className={cn("flex items-center text-xs", met ? "text-green-600" : "text-muted-foreground")}>
      {met ? <CheckCircle2 className="mr-2 h-3 w-3" /> : <XCircle className="mr-2 h-3 w-3 text-red-500" />}
      {text}
    </div>
  );
};

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const allRequirementsMet = Object.values(passwordValidation).every(Boolean);

  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
        localStorage.setItem('referralCode', inviteCode);
        setReferralCode(inviteCode);
    } else {
        const storedCode = localStorage.getItem('referralCode');
        if (storedCode) {
            setReferralCode(storedCode);
        }
    }
  }, [searchParams]);

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
      await signIn('google', { callbackUrl: '/dashboard' });
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
      toast({ title: 'Missing Fields', description: 'Please fill out all fields.', variant: 'destructive' });
      return;
    }
    if (!allRequirementsMet) {
      toast({ title: 'Weak Password', description: 'Please ensure your password meets all requirements.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      // Create user via API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: fullName, referralCode }),
      });

      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(errorText || 'Failed to register');
      }

      // Log in after registration
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
         throw new Error("Failed to auto-login after registration.");
      }
      
      localStorage.removeItem('referralCode');
      toast({ variant: "success",  title: 'Account created successfully!', description: "Welcome to Proposal Up!" });
      router.push('/dashboard?new=true');
      router.refresh();

    } catch (error: any) {
      toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
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
        <div className="flex flex-col justify-center p-4 sm:p-12 xl:p-20 dark:bg-card">
          <div className="w-full max-w-md mx-auto">
            <Link href="https://www.proposalupai.com/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
              <p className="text-muted-foreground mt-1">Welcome to Proposal Up!</p>
            </div>
            
            <Button variant="outline" className="w-full mb-6 rounded-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
              {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
              Sign up with Google
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
                  <Label htmlFor="full-name">Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="full-name" 
                    placeholder="Full Name" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@domain.com" 
                    required 
                    value={email}
                    className="dark:selection:bg-background"
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password (at least 8 characters)"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || isGoogleLoading}
                      className="pr-10 dark:selection:bg-background"
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

                {password && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      <PasswordRequirement met={passwordValidation.length} text="8+ characters" />
                      <PasswordRequirement met={passwordValidation.uppercase} text="1 uppercase" />
                      <PasswordRequirement met={passwordValidation.lowercase} text="1 lowercase" />
                      <PasswordRequirement met={passwordValidation.number} text="1 number" />
                      <PasswordRequirement met={passwordValidation.special} text="1 special" />
                  </div>
                )}
                <Button type="submit" className="w-full mt-2 rounded-full" disabled={isLoading || isGoogleLoading || (password.length > 0 && !allRequirementsMet)}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create an account
                </Button>
              </div>
            </form>
            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center bg-auth-panel dark:bg-background text-white relative">
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

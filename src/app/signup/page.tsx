
"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProposalUpLogos, GoogleIcon, ProposalUpLogoLight } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2, XCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getGoogleAuthUrl } from '@/app/lib/actions';
import { createStripeCustomer } from '@/app/lib/auth-actions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
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

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    // Capture referral code from URL and store it
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
        localStorage.setItem('referralCode', inviteCode);
        setReferralCode(inviteCode);
    } else {
        // Also check localStorage in case the user navigates away and back
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
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      
      const { type, error, details, redirectPath } = event.data;
      if (type === 'auth-success') {
          localStorage.removeItem('referralCode'); // Clear code after use
          toast({
            title: 'Successfully signed up!',
            description: "Welcome! We're redirecting you now.",
          });
          router.refresh();
      } else if (type === 'auth-error') {
          toast({
              title: `Google Sign-Up Failed: ${error}`,
              description: details || 'An unexpected error occurred.',
              variant: 'destructive',
          });
      }
      setIsGoogleLoading(false);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router, toast]);


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
      const storedReferralCode = localStorage.getItem('referralCode');
      const googleAuthUrl = await getGoogleAuthUrl(storedReferralCode);
      const width = 800;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(googleAuthUrl, 'google-signin', `width=${width},height=${height},left=${left},top=${top}`);
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
      // Step 1: Create user client-side
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      const idToken = await newUser.getIdToken();
      const storedReferralCode = localStorage.getItem('referralCode');

      // Step 2: Create Stripe customer via a simple server action
      const stripeResult = await createStripeCustomer({ email, name: fullName, firebaseUID: newUser.uid });

      if (!stripeResult.customerId) {
        throw new Error(stripeResult.error || 'Failed to create Stripe customer.');
      }

      // Step 3: Create user document in Firestore directly from the client
      const userDocRef = doc(db, 'users', newUser.uid);
      
      const userData: { [key: string]: any } = {
        uid: newUser.uid,
        email: email,
        displayName: fullName,
        photoURL: newUser.photoURL || null,
        createdAt: new Date(),
        stripeCustomerId: stripeResult.customerId,
        proposalCount: 0,
        subscriptionStatus: null,
        referralCode: newUser.uid.substring(0, 8),
      };

      if (storedReferralCode) {
        userData.referredBy = storedReferralCode;
      }
      
      await setDoc(userDocRef, userData);

      // Step 4: Create server session cookie
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      localStorage.removeItem('referralCode');
      toast({ title: 'Success!', description: "Account created. Let's get you set up." });
      router.push('/pricing'); // Redirect to pricing to choose a plan

    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
       if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account.';
      } else {
        errorMessage = error.message;
      }
      toast({ title: 'Sign Up Failed', description: errorMessage, variant: 'destructive' });
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
              <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
              <p className="text-muted-foreground mt-1">Enter your information to get started.</p>
            </div>
            
            <Button variant="outline" className="w-full mb-6" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
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
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input 
                    id="full-name" 
                    placeholder="Wahaj Mansoor" 
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
                    placeholder="info@example.com" 
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
                <Button type="submit" className="w-full mt-2" disabled={isLoading || isGoogleLoading || (password.length > 0 && !allRequirementsMet)}>
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

export default function SignupPage() {
    return (
        <Suspense>
            <SignupForm />
        </Suspense>
    )
}

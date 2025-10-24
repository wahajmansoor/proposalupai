
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | string;
  subscriptionCurrentPeriodEnd?: string; // Changed to string
  subscriptionInterval?: 'month' | 'year';
  proposalCount?: number;
  referralCode?: string;
  proposalCredits?: number;
  referredBy?: string;
  lastPrice?: number;
  upgradeBonusGiven?: boolean;
  trialCreditsAwarded?: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  handleLogout: () => Promise<void>;
  creditChange: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, handleLogout: async () => {}, creditChange: 0 });

function LogoutScreen() {
    const [showRedirecting, setShowRedirecting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowRedirecting(true);
            
            // Perform the actual sign out and redirect after showing the message
            setTimeout(async () => {
                 await fetch('/api/auth/session', { method: 'DELETE' });
                 await signOut(auth);
                 router.push('/login');
            }, 500);

        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
            <ProposalUpLogos className="h-24 w-24 text-primary" />
            <h1 className="mt-6 text-3xl font-bold">You’ve been logged out.</h1>
            <p className="mt-2 text-lg text-muted-foreground">See you soon & keep winning projects!</p>
            {showRedirecting && (
                 <p className="mt-8 text-sm text-muted-foreground animate-pulse">Redirecting to login...</p>
            )}
        </div>
    )
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  
  const [creditChange, setCreditChange] = useState(0);
  const previousCreditsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            const profile: UserProfile = {
              ...data,
              subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
            } as UserProfile;
            
            // Check for credit changes
            if (previousCreditsRef.current !== undefined && profile.proposalCredits !== undefined) {
                const diff = profile.proposalCredits - previousCreditsRef.current;
                if (diff > 0) {
                    setCreditChange(diff);
                    // Reset after a short delay to allow re-triggering for subsequent changes
                    setTimeout(() => setCreditChange(0), 100);
                }
            }
            previousCreditsRef.current = profile.proposalCredits;

            setUserProfile(profile);
          } else {
             // User is authenticated, but no profile doc exists yet.
             // This happens briefly during signup. The signup flow is now
             // responsible for creating the doc. We set the profile to null
             // and loading to false to allow redirects to /pricing etc.
             setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setLoading(false);
        });
        
        return () => unsubscribeSnapshot();
      } else {
        setUserProfile(null);
        setLoading(false);
        previousCreditsRef.current = undefined;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
  };
  
  if (isLoggingOut) {
    return <LogoutScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, handleLogout, creditChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

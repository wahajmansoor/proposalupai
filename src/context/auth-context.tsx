
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
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
  handleLogout: () => void;
  creditChange: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, handleLogout: () => {}, creditChange: 0 });

function LogoutScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
            <ProposalUpLogos className="h-24 w-24 mb-6 text-primary" />
            <h1 className="text-3xl font-bold">You’ve been logged out.</h1>
            <p className="text-muted-foreground mt-2 mb-2 text-lg">See you soon & keep winning projects!</p>
            <p className="text-sm text-muted-foreground mt-12 animate-pulse">Redirecting to login...</p>
        </div>
    );
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
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        previousCreditsRef.current = undefined;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        await signOut(auth); // Sign out from Firebase Auth
        await fetch('/api/auth/session', { method: 'DELETE' }); // Clear server session cookie
    } catch (error) {
        console.error("Error during logout:", error);
    } finally {
        setTimeout(() => {
            router.push('/login');
            setIsLoggingOut(false);
        }, 2500);
    }
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

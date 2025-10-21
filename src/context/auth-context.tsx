
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  handleLogout: () => Promise<void>;
  creditChange: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, handleLogout: async () => {}, creditChange: 0 });

const LogoutScreen = () => {
  const router = useRouter();
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    // After 2 seconds, update the state to show the logged-out message
    const timer = setTimeout(() => {
      setIsLoggedOut(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoggedOut) {
      // After showing the message, redirect to login
      const redirectTimer = setTimeout(() => {
        router.push('/login');
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [isLoggedOut, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <ProposalUpLogos className="h-24 w-24 text-primary" />
      <h1 className="mt-6 text-2xl font-semibold">
        {isLoggedOut ? "Successfully Logged Out" : "Signing you out..."}
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        {isLoggedOut ? "Redirecting to the login page..." : "Please wait a moment."}
      </p>
    </div>
  );
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [creditChange, setCreditChange] = useState(0);
  const previousCreditsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setIsLoggingOut(false); // Reset logout state if user logs in
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
            previousCreditsRef.current = undefined;
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
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
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

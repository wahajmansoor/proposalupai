
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { Button } from '@/components/ui/button';

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
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, handleLogout: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setIsLoggingOut(false); // Reset logout state if user logs in
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Backfill referral code for old users
            if (!data.referralCode) {
              const newReferralCode = user.uid.substring(0, 8);
              setDoc(userRef, { referralCode: newReferralCode }, { merge: true });
              data.referralCode = newReferralCode; // Immediately update local data
            }

            const profile: UserProfile = {
              ...data,
              // Convert Timestamp to ISO string to prevent serialization issues
              subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
            } as UserProfile;
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
        setUserProfile(null);
        setLoading(false);
        // If sign out was successful, isLoggingOut will naturally be resolved by the redirect
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Clear session cookie on the server
    await fetch('/api/auth/session', { method: 'DELETE' });
    // Sign out from Firebase client-side
    await signOut(auth);
    // The onAuthStateChanged listener will handle the rest
  };

  if (isLoggingOut) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <ProposalUpLogos className="h-24 w-24 text-primary" />
        <h1 className="mt-6 text-2xl font-semibold">Signing you out</h1>
        <p className="text-muted-foreground mt-2">You have been successfully logged out.</p>
        <Button variant="outline" className="mt-6" onClick={() => window.location.href = '/login'}>
          Return to Login
        </Button>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

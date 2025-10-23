
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createStripeCustomerAndUserDoc } from '@/app/lib/stripe-actions';

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
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  handleLogout: () => Promise<void>;
  creditChange: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, handleLogout: async () => {}, creditChange: 0 });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [creditChange, setCreditChange] = useState(0);
  const previousCreditsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);

        // Check once if the document exists. If not, create it.
        getDoc(userRef).then(docSnap => {
          if (!docSnap.exists()) {
            // New user, create their Stripe customer and Firestore doc
            console.log("New user detected, creating profile document...");
            const storedReferralCode = localStorage.getItem('referralCode');
            createStripeCustomerAndUserDoc({
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName,
              photoURL: user.photoURL,
              referralCode: storedReferralCode,
            }).then(result => {
              if (result.error) {
                console.error("Failed to create user profile on server:", result.error);
              } else {
                console.log("User profile document created successfully.");
              }
            });
          }
        });

        // Set up the real-time listener
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
            // Document doesn't exist yet, it will be created shortly.
            // Don't set profile to null here immediately, wait for creation.
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
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, handleLogout, creditChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

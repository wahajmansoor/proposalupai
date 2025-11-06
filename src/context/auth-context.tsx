
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

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
  onboardingComplete?: boolean;
  currentSession?: string;
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
  const { toast } = useToast();
  
  const [creditChange, setCreditChange] = useState(0);
  const previousCreditsRef = useRef<number | undefined>(undefined);

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    localStorage.removeItem('sessionId');
    try {
        if(isFirebaseConfigured) {
            signOut(auth);
        }
        fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
        console.error("Error during logout:", error);
    } finally {
        setTimeout(() => {
            router.push('/login');
            setIsLoggingOut(false);
        }, 2500); 
    }
  }, [router, isLoggingOut]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
        setLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);

        // This is a new login, so generate a session ID, save it, and write it to Firestore.
        const sessionId = uuidv4();
        localStorage.setItem('sessionId', sessionId);
        await updateDoc(userRef, {
            currentSession: sessionId,
            lastLogin: serverTimestamp(),
        });
        
        // Now, set up the real-time listener for this user.
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Compare Firestore session with local session
                const remoteSession = data.currentSession;
                const localSession = localStorage.getItem('sessionId');
                if (localSession && remoteSession && remoteSession !== localSession) {
                    toast({
                        title: "Logged Out",
                        description: "Your account was logged in from another device.",
                        variant: "destructive"
                    });
                    handleLogout();
                    return; // Prevent further state updates for the old session
                }
                
                const profile: UserProfile = {
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
                } as UserProfile;

                if (previousCreditsRef.current !== undefined && profile.proposalCredits !== undefined) {
                    const diff = profile.proposalCredits - previousCreditsRef.current;
                    if (diff > 0) {
                        setCreditChange(diff);
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

        // Return the snapshot unsubscriber to be called on cleanup
        return () => unsubscribeSnapshot();
      } else {
        // User is logged out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        localStorage.removeItem('sessionId');
        previousCreditsRef.current = undefined;
      }
    });

    // Main cleanup for the auth listener
    return () => unsubscribeAuth();
  }, [handleLogout, toast]);
  
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

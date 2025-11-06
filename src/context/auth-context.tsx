
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | string;
  subscriptionCurrentPeriodEnd?: string;
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
  lastLogin?: Timestamp;
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

// Check if a session is considered active (e.g., last login within 24 hours)
function isSessionActive(lastLogin?: Timestamp): boolean {
    if (!lastLogin) return false;
    const now = new Date();
    const lastLoginDate = lastLogin.toDate();
    const hoursSinceLastLogin = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastLogin < 24; // Session is active if login was within the last 24 hours
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [creditChange, setCreditChange] = useState(0);

  const handleLogout = useCallback((message?: string) => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    if (message) {
      toast({
        title: "Logged Out",
        description: message,
        variant: "destructive",
      });
    }

    if(isFirebaseConfigured) {
        signOut(auth);
    }
    fetch('/api/auth/session', { method: 'DELETE' });
    localStorage.removeItem('sessionId');

    setTimeout(() => {
        router.push('/login');
        setIsLoggingOut(false);
    }, 2500); 
  }, [router, isLoggingOut, toast]);
  

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);
        let localSession = localStorage.getItem('sessionId');

        try {
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;

                // ** SINGLE-SESSION POLICY CHECK **
                if (data.currentSession && data.lastLogin && isSessionActive(data.lastLogin)) {
                    if (!localSession) {
                        // This is a new device login attempt, but an active session exists elsewhere.
                        handleLogout("You are already logged in on another device. Please log out from that device to continue.");
                        return; // Stop the login process
                    }
                }

                // If we've reached here, it's either a new session or a returning user on the same device.
                if (!localSession) {
                    localSession = uuidv4();
                    localStorage.setItem('sessionId', localSession);
                    await updateDoc(userRef, {
                        currentSession: localSession,
                        lastLogin: serverTimestamp(),
                    });
                }
            }
        } catch (e: any) {
            console.error("Error during login session check:", e);
            handleLogout("An error occurred during login. Please try again.");
            return;
        }

        // Set up the real-time listener for the user profile
        const unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                 const profile: UserProfile = {
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
                };
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
        });

        setUser(firebaseUser);
        setLoading(false);

        return () => unsubscribeSnapshot();
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [handleLogout]);
  
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

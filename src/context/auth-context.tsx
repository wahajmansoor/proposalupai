
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onIdTokenChanged, User, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { handleUserLogout as handleUserLogoutServer } from '@/lib/actions';

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
  handleLogout: (message?: string) => void;
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

// Session is considered active if last login was within the last 24 hours.
function isSessionActive(lastLogin?: Timestamp): boolean {
    if (!lastLogin) return false;
    const now = new Date();
    const lastLoginDate = lastLogin.toDate();
    const hoursSinceLastLogin = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastLogin < 24;
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [creditChange, setCreditChange] = useState(0);

  const handleLogout = useCallback(async (message?: string) => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    if (message) {
      toast({
        title: "Logged Out",
        description: message,
        variant: "destructive",
      });
    }

    // Securely clear the session on the server
    await handleUserLogoutServer();
    
    // Then clear the client-side session
    if(isFirebaseConfigured) {
        await signOut(auth);
    }
    await fetch('/api/auth/session', { method: 'DELETE' });
    localStorage.removeItem('sessionId');

    // This ensures we fully reset state on logout before redirecting
    setUser(null);
    setUserProfile(null);

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

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // This is the real-time listener for the user profile
        const unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                const profile: UserProfile = {
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
                };

                const oldCredits = userProfile?.proposalCredits ?? profile.proposalCredits;
                const newCredits = profile.proposalCredits;
                if (typeof oldCredits === 'number' && typeof newCredits === 'number' && newCredits > oldCredits) {
                    setCreditChange(newCredits - oldCredits);
                }

                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setLoading(false); // Only set loading to false after we have profile data (or know it doesn't exist)
        }, (error) => {
            console.error("Error on user snapshot:", error);
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'list', // onSnapshot is a 'list' operation in security rules terms
            });
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [handleLogout, userProfile?.proposalCredits]);
  
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

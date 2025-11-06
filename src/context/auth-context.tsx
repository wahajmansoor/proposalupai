'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    if(isFirebaseConfigured) {
        signOut(auth);
    }
    fetch('/api/auth/session', { method: 'DELETE' });
    localStorage.removeItem('sessionId');
    setTimeout(() => {
        router.push('/login');
        setIsLoggingOut(false);
    }, 2500); 
  }, [router, isLoggingOut]);
  

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      let unsubscribeSnapshot: () => void = () => {};

      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                const localSession = localStorage.getItem('sessionId');

                if (!localSession) {
                    // This is a new login on this device
                    const newSessionId = uuidv4();
                    localStorage.setItem('sessionId', newSessionId);
                    const updateData = {
                        currentSession: newSessionId,
                        lastLogin: serverTimestamp(),
                    };
                    updateDoc(userRef, updateData).catch(async (serverError) => {
                        const permissionError = new FirestorePermissionError({
                        path: userRef.path,
                        operation: 'update',
                        requestResourceData: updateData,
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    });
                } else {
                    // Existing session on this device, check if it's still valid
                    if (data.currentSession && data.currentSession !== localSession) {
                        toast({
                            title: "Logged Out",
                            description: "Your account was used to log in from another device.",
                            variant: "destructive"
                        });
                        handleLogout();
                        return;
                    }
                }
                
                const profile: UserProfile = {
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
                };
                setUserProfile(profile);

            } else {
                setUserProfile(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error with onSnapshot:", error);
            setLoading(false);
        });

      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        localStorage.removeItem('sessionId');
      }

      // Cleanup function for the auth listener
      return () => {
        unsubscribeSnapshot();
      };
    });

    // Cleanup for the component unmount
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

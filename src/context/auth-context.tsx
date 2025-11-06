
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
        signOut(auth);
    }
    await fetch('/api/auth/session', { method: 'DELETE' });
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

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A user is signed in, and we have a valid token.
        // This is the correct place to make authenticated requests.
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        try {
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                const localSessionId = localStorage.getItem('sessionId');

                // Check for an active session on another device.
                if (data.currentSession && data.lastLogin && isSessionActive(data.lastLogin) && data.currentSession !== localSessionId) {
                    handleLogout("You have logged in on another device. This session has been terminated.");
                    return;
                }

                // If no local session, it's a new login. Create a session.
                if (!localSessionId) {
                    const newSessionId = uuidv4();
                    localStorage.setItem('sessionId', newSessionId);
                    await updateDoc(userRef, {
                        currentSession: newSessionId,
                        lastLogin: serverTimestamp(),
                    });
                }
            } else {
                 // This case is for a user who exists in Auth but not Firestore yet.
                 // The session will be created when the userDoc is created on first login.
            }
        } catch (e: any) {
            console.error("Error during login session check:", e);
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'get', // The failing operation is the getDoc
            });
            errorEmitter.emit('permission-error', permissionError);
            handleLogout("An error occurred during login. Please try again.");
            return;
        }

        const unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                const localSessionId = localStorage.getItem('sessionId');

                // Real-time check for multi-device logout
                if (data.currentSession && localSessionId && data.currentSession !== localSessionId) {
                    handleLogout("You have logged in on another device. This session has been terminated.");
                    return;
                }

                const profile: UserProfile = {
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate().toISOString(),
                };
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setLoading(false); // Set loading to false after we have profile data
        }, (error) => {
            console.error("Error on user snapshot:", error);
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


"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { stripe } from '@/lib/stripe/config';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: Date;
  trialEndDate?: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

async function setSessionCookie(token: string | null) {
    if (token) {
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token }),
        });
    } else {
        await fetch('/api/auth/session', { method: 'DELETE' });
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const token = await user.getIdToken();
        await setSessionCookie(token);

        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate(),
                    trialEndDate: data.trialEndDate?.toDate(),
                } as UserProfile);
            } else {
                // This case is primarily handled by the server-side callback now,
                // but we keep a client-side fallback just in case.
                console.log("User document not found, creating one on client...");
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 2);

                const profile: Omit<UserProfile, 'stripeCustomerId'> & { stripeCustomerId?: string } = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    trialEndDate,
                };

                try {
                    const customer = await stripe.customers.create({
                        email: user.email!,
                        name: user.displayName || undefined,
                    });
                    profile.stripeCustomerId = customer.id;
                } catch (e) {
                    console.error("Failed to create stripe customer on client-side fallback", e);
                }
                
                await setDoc(userRef, profile, { merge: true });
                setUserProfile(profile as UserProfile);
            }
        });
        
        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setUserProfile(null);
        await setSessionCookie(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userRef = doc(db, 'users', user.uid);
        
        // Set up a real-time listener for the user's profile
        const unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                    ...data,
                    subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate(),
                    trialEndDate: data.trialEndDate?.toDate(),
                } as UserProfile);
            } else {
                // Document doesn't exist, create it.
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 2); // 2-day trial

                const customer = await stripe.customers.create({
                    email: user.email!,
                    name: user.displayName || undefined,
                });
                
                const profile: UserProfile = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp(),
                    stripeCustomerId: customer.id,
                    trialEndDate,
                };
                await setDoc(userRef, profile);
                setUserProfile(profile);
            }
        });
        
        // Detach the snapshot listener when the auth state changes
        return () => unsubscribeSnapshot();
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

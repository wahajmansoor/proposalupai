"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, check for Firestore document and ensure it's up-to-date
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // Document doesn't exist, create it. This fixes issues for old users who signed up before the fix.
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
          });
        } else {
          // Document exists, check if displayName is null and update if necessary
          const docData = docSnap.data();
          if (docData.displayName === null && user.displayName !== null) {
            await setDoc(userRef, { displayName: user.displayName }, { merge: true });
          }
        }
        
        // We need to refresh the user object in case the profile was just updated
        // but for now, setting the user from auth is sufficient
        setUser(user);

      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

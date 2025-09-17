// src/lib/firebase/proposals.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';
import type { SavedProposal } from '@/app/lib/types';
import { auth } from './config';

// Path to the subcollection
const getProposalsRef = (userId: string) =>
  collection(db, 'users', userId, 'savedProposals');

// Get all saved proposals for a user
export async function getSavedProposals(userId: string): Promise<SavedProposal[]> {
  const proposalsRef = getProposalsRef(userId);
  const q = query(proposalsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      // Convert Firestore Timestamp to JS Date, then to ISO string
      createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    };
  });
}

// Add a new saved proposal
export async function addSavedProposal(userId: string, title: string, content: string) {
  // --- FAILSAFE ---
  // Ensure the parent user document exists before trying to add to a subcollection.
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // If the user document doesn't exist, create it.
    // This handles edge cases and fixes issues for any existing users
    // whose document was not created on sign up.
    const currentUser = auth.currentUser;
    await setDoc(userRef, {
      uid: userId,
      email: currentUser?.email || '',
      displayName: currentUser?.displayName || 'User',
      photoURL: currentUser?.photoURL || '',
      createdAt: serverTimestamp(),
    });
  }
  // --- END FAILSAFE ---

  const proposalsRef = getProposalsRef(userId);
  await addDoc(proposalsRef, {
    title,
    content,
    createdAt: serverTimestamp(),
  });
}

// Delete a saved proposal
export async function deleteSavedProposal(userId: string, proposalId: string) {
  const proposalDocRef = doc(db, 'users', userId, 'savedProposals', proposalId);
  await deleteDoc(proposalDocRef);
}

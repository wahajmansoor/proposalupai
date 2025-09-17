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
} from 'firebase/firestore';
import { db } from './config';
import type { SavedProposal } from '@/app/lib/types';

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

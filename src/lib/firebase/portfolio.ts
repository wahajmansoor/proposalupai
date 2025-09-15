// src/lib/firebase/portfolio.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { PortfolioCollection } from '@/app/lib/types';

// Path to the subcollection
const getCollectionsRef = (userId: string) =>
  collection(db, 'users', userId, 'portfolioCollections');

// Get all portfolio collections for a user
export async function getPortfolioCollections(userId: string): Promise<PortfolioCollection[]> {
  const collectionsRef = getCollectionsRef(userId);
  const q = query(collectionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    links: doc.data().links || [],
  }));
}

// Add a new portfolio collection
export async function addPortfolioCollection(userId: string, name: string) {
  const collectionsRef = getCollectionsRef(userId);
  await addDoc(collectionsRef, {
    name,
    links: [],
    createdAt: serverTimestamp(),
  });
}

// Update a portfolio collection (e.g., add/remove links, rename)
export async function updatePortfolioCollection(
  userId: string,
  collectionId: string,
  data: Partial<{ name: string; links: string[] }>
) {
  const collectionDocRef = doc(db, 'users', userId, 'portfolioCollections', collectionId);
  await updateDoc(collectionDocRef, data);
}

// Delete a portfolio collection
export async function deletePortfolioCollection(userId: string, collectionId: string) {
  const collectionDocRef = doc(db, 'users', userId, 'portfolioCollections', collectionId);
  await deleteDoc(collectionDocRef);
}

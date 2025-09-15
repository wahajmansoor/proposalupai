import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { PortfolioCategory, PortfolioItem } from '@/app/lib/types';

// Categories
export const addCategory = async (userId: string, name: string) => {
  try {
    const docRef = await addDoc(collection(db, 'portfolioCategories'), {
      userId,
      name,
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding category: ', e);
    return null;
  }
};

export const getCategories = async (userId: string): Promise<PortfolioCategory[]> => {
  try {
    const q = query(collection(db, 'portfolioCategories'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const categories: PortfolioCategory[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as PortfolioCategory);
    });
    return categories;
  } catch (e) {
    console.error('Error getting categories: ', e);
    return [];
  }
};

export const deleteCategory = async (categoryId: string) => {
    try {
        const batch = writeBatch(db);

        // First, find all items in the category
        const itemsQuery = query(collection(db, 'portfolioItems'), where('categoryId', '==', categoryId));
        const itemsSnapshot = await getDocs(itemsQuery);
        itemsSnapshot.forEach(itemDoc => {
            batch.delete(doc(db, 'portfolioItems', itemDoc.id));
        });

        // Then, delete the category itself
        const categoryRef = doc(db, 'portfolioCategories', categoryId);
        batch.delete(categoryRef);

        await batch.commit();
        return true;
    } catch (e) {
        console.error('Error deleting category and its items: ', e);
        return false;
    }
};


// Portfolio Items
export const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'portfolioItems'), item);
    return docRef.id;
  } catch (e) {
    console.error('Error adding portfolio item: ', e);
    return null;
  }
};

export const getPortfolioItems = async (userId: string): Promise<PortfolioItem[]> => {
  try {
    const q = query(collection(db, 'portfolioItems'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const items: PortfolioItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as PortfolioItem);
    });
    return items;
  } catch (e) {
    console.error('Error getting portfolio items: ', e);
    return [];
  }
};

export const updatePortfolioItem = async (itemId: string, data: Partial<PortfolioItem>) => {
  try {
    const itemRef = doc(db, 'portfolioItems', itemId);
    await updateDoc(itemRef, data);
    return true;
  } catch (e) {
    console.error('Error updating portfolio item: ', e);
    return false;
  }
};

export const deletePortfolioItem = async (itemId: string) => {
  try {
    await deleteDoc(doc(db, 'portfolioItems', itemId));
    return true;
  } catch (e) {
    console.error('Error deleting portfolio item: ', e);
    return false;
  }
};

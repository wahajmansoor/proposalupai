
// src/lib/firebase/profiles.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { SkillProfile } from '@/app/lib/types';

// Path to the subcollection
const getProfilesRef = (userId: string) =>
  collection(db, 'users', userId, 'skillProfiles');

// Get all skill profiles for a user
export async function getSkillProfiles(userId: string): Promise<SkillProfile[]> {
  const profilesRef = getProfilesRef(userId);
  const q = query(profilesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      experience: data.experience,
      keywords: data.keywords || [],
      links: data.links || [],
      tone: data.tone,
      length: data.length,
      createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    } as SkillProfile;
  });
}

// Add a new skill profile
export async function addSkillProfile(userId: string, profileData: Omit<SkillProfile, 'id' | 'createdAt'>) {
  const profilesRef = getProfilesRef(userId);
  await addDoc(profilesRef, {
    ...profileData,
    tone: profileData.tone.toLowerCase(),
    createdAt: serverTimestamp(),
  });
}

// Update a skill profile
export async function updateSkillProfile(
  userId: string,
  profileId: string,
  data: Partial<Omit<SkillProfile, 'id' | 'createdAt'>>
) {
  const profileDocRef = doc(db, 'users', userId, 'skillProfiles', profileId);
  if (data.tone) {
      data.tone = data.tone.toLowerCase();
  }
  await updateDoc(profileDocRef, data);
}

// Delete a skill profile
export async function deleteSkillProfile(userId: string, profileId: string) {
  const profileDocRef = doc(db, 'users', userId, 'skillProfiles', profileId);
  await deleteDoc(profileDocRef);
}

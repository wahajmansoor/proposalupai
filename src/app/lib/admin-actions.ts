
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/firebase/server-auth';

async function verifyAdmin() {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.userDoc?.isAdmin === true;
    if (!isAdmin) {
        throw new Error('Unauthorized: You do not have permission to perform this action.');
    }
}

export interface AdminUser {
    uid: string;
    displayName: string | null;
    email: string | null;
    subscriptionStatus: string | null;
    isAdmin: boolean;
}

export async function getAllUsers(): Promise<AdminUser[]> {
    await verifyAdmin();

    const usersSnapshot = await adminDb.collection('users').get();
    if (usersSnapshot.empty) {
        return [];
    }

    const users: AdminUser[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: doc.id,
            displayName: data.displayName || 'No Name',
            email: data.email || 'No Email',
            subscriptionStatus: data.subscriptionStatus || 'N/A',
            isAdmin: data.isAdmin === true,
        };
    });

    return users;
}

export async function toggleAdminStatus(uid: string, isAdmin: boolean) {
    await verifyAdmin();
    
    if (!uid) {
        throw new Error('User ID is required.');
    }

    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({ isAdmin: !isAdmin });

    revalidatePath('/adminpro');
    return { success: true, message: `Admin status for user ${uid} has been updated.` };
}

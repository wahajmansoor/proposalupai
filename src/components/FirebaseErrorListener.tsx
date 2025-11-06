'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';

/**
 * A client-side component that listens for custom permission errors
 * and throws them so they can be caught by Next.js's error overlay
 * during development. This provides a much richer debugging experience
 * for Firestore security rules.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handler = (error: Error) => {
      // Throw the error so Next.js development error overlay can catch it
      throw error;
    };

    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, []);

  return null; // This component does not render anything
}

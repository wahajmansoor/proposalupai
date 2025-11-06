export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

/**
 * A custom error class to provide detailed context about a
 * Firestore security rule violation. This is used in development
 * to give the developer (and the AI) a clear understanding of
 * why a request was denied.
 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions. The following request was denied by Firestore Security Rules:
${JSON.stringify({ ...context }, null, 2)}`;

    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error object serializable for the Next.js overlay
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}

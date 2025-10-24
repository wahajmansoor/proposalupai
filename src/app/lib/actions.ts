
'use server';

import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase/admin';
import { incrementProposalCount, decrementProposalCredits } from '@/lib/firebase/usage';
import type { PortfolioLink } from './types';
import type { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getCountryFromIp } from '@/app/lib/location';
import { ai } from '@/ai/genkit';
import type {
  AnalyzeJobForProposalInput,
  AnalyzeJobForProposalOutput,
} from '@/ai/flows/analyze-job-for-proposal';
import { analyzeJobForProposal } from '@/ai/flows/analyze-job-for-proposal';
import type {
  AutofillProposalSectionsInput,
  AutofillProposalSectionsOutput,
} from '@/ai/flows/autofill-proposal-sections';
import { autofillProposalSections } from '@/ai/flows/autofill-proposal-sections';
import type {
  AnswerClientQuestionsInput,
  AnswerClientQuestionsOutput,
} from '@/ai/flows/answer-client-questions';
import { answerClientQuestions } from '@/ai/flows/answer-client-questions';
import type {
  GenerateProposalInput,
  GenerateProposalOutput,
} from '@/ai/flows/generate-proposal-from-job-analysis';
import { generateProposal } from '@/ai/flows/generate-proposal-from-job-analysis';
import type {
  ImproveProposalInput,
  ImproveProposalOutput,
} from '@/ai/flows/improve-proposal';
import { improveProposal } from '@/ai/flows/improve-proposal';
import type {
  SuggestOpeningStrategyInput,
  SuggestOpeningStrategyOutput,
} from '@/aiflows/suggest-opening-strategy';
import { suggestOpeningStrategy } from '@/ai/flows/suggest-opening-strategy';
import type {
  SuggestProposalTemplateInput,
  SuggestProposalTemplateOutput,
} from '@/ai/flows/suggest-proposal-template';
import { suggestProposalTemplate } from '@/ai/flows/suggest-proposal-template';
import type {
  SuggestWordLimitInput,
  SuggestWordLimitOutput,
} from '@/ai/flows/suggest-word-limit';
import { suggestWordLimit } from '@/ai/flows/suggest-word-limit';
import { stripe } from '@/lib/stripe/config';


export interface InvoiceDetails {
  id: string;
  date: string;
  total: string;
  status: string;
  invoiceUrl: string | null;
}

export interface CreditHistoryItem {
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
}

const projectDetailsSchema = z.object({
  projectTitle: z.string().min(1, 'Project title is required.'),
  summary: z.string().min(1, 'Summary is required.'),
});

export async function analyzeJobAction(prevState: any, formData: FormData) {
  const validatedFields = projectDetailsSchema.safeParse({
    projectTitle: formData.get('projectTitle'),
    summary: formData.get('summary'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid input.' };
  }

  try {
    const result = await analyzeJobForProposal(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to analyze project details.' };
  }
}

const analyzeAndSuggestSchema = z.object({
  projectDetails: projectDetailsSchema,
  strategies: z.record(z.string()),
});

export async function analyzeAndSuggestAction(input: z.infer<typeof analyzeAndSuggestSchema>) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userDoc) {
      return { error: 'You must be logged in to use this feature.' };
    }

    const { userDoc } = currentUser;
    const { subscriptionStatus, proposalCount = 0 } = userDoc;

    if (subscriptionStatus === 'trialing' && proposalCount >= 5) {
      return { error: 'You have reached your trial limit of 5 proposals. Please upgrade to continue.' };
    }

    const validatedFields = analyzeAndSuggestSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for analysis and suggestions.' };
    }
    try {
        const [templateSuggestion, strategySuggestion, wordLimitSuggestion] = await Promise.all([
          suggestProposalTemplate(validatedFields.data.projectDetails),
          suggestOpeningStrategy({
            ...validatedFields.data.projectDetails,
            strategies: validatedFields.data.strategies,
          }),
          suggestWordLimit(validatedFields.data.projectDetails)
        ]);
        
        return { 
          data: {
            template: templateSuggestion.template,
            templateReasoning: templateSuggestion.reasoning,
            strategyId: strategySuggestion.strategyId,
            strategyReasoning: strategySuggestion.reasoning,
            wordLimit: wordLimitSuggestion.wordLimit,
            wordLimitReasoning: wordLimitSuggestion.reasoning,
          } 
        };
    } catch (error) {
        console.error("Error in analyzeAndSuggestAction:", error);
        return { error: "Failed to get AI suggestions" }
    }
}


const autofillSkillsSchema = z.object({
  projectTitle: z.string(),
  summary: z.string(),
  profileInformation: z.string(),
});

export async function autofillSkillsAction(input: z.infer<typeof autofillSkillsSchema>) {
   const validatedFields = autofillSkillsSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for autofill.' };
    }
  try {
    const result = await autofillProposalSections(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to autofill skills.' };
  }
}

const answerQuestionsSchema = z.object({
  jobDescription: z.string(),
  clientQuestions: z.array(z.string()).min(1),
  profileInformation: z.string(),
});

export async function answerQuestionsAction(input: z.infer<typeof answerQuestionsSchema>) {
    const validatedFields = answerQuestionsSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for answering questions.' };
    }
  try {
    const result = await answerClientQuestions(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to answer client questions.' };
  }
}

const linkSchema = z.object({
  title: z.string().optional(),
  url: z.string(),
});

const generateProposalSchema = z.object({
    projectTitle: z.string(),
    summary: z.string(),
    profileSummary: z.string(),
    userName: z.string(),
    relevantSkills: z.string(),
    pastSuccesses: z.string(),
    profileLinks: z.array(linkSchema),
    manualLinks: z.array(linkSchema),
    greeting: z.string(),
    openingStrategy: z.string().optional(),
    closingCta: z.string(),
    closingCta2: z.string().optional(),
    tone: z.string(),
    wordLimit: z.string().optional(),
    proposalTemplate: z.enum(['standard', 'video']).optional(),
});

export async function generateProposalAction(input: z.infer<typeof generateProposalSchema>) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userDoc) {
      return { error: 'You must be logged in to generate a proposal.' };
    }

    const { user, userDoc } = currentUser;
    const { subscriptionStatus, proposalCount = 0 } = userDoc;

    // Enforce trial limit
    if (subscriptionStatus === 'trialing' && proposalCount >= 5) {
      return { error: 'You have reached your trial limit of 5 proposals. Please upgrade to continue.' };
    }

    const validatedFields = generateProposalSchema.safeParse(input);
    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten());
        return { error: 'Invalid input for generating proposal.' };
    }

    try {
      const result = await generateProposal(validatedFields.data);

      // If successful, increment the proposal count
      await incrementProposalCount(user.uid);

      return { data: result };
    } catch (error) {
      console.error(error);
      return { error: 'Failed to generate proposal.' };
    }
}

const improveProposalSchema = z.object({
  proposal: z.string(),
  instruction: z.string(),
  selectedText: z.string().optional(),
  closingCta: z.string().optional(),
});

export async function improveProposalAction(input: z.infer<typeof improveProposalSchema>) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userDoc) {
      return { error: 'You must be logged in to use this feature.' };
    }
  
    const { user, userDoc } = currentUser;
    const { proposalCredits = 0 } = userDoc;
  
    if (proposalCredits <= 0) {
      return { error: 'You have no proposal improvement credits left. Please refer a friend to earn more.' };
    }

    const validatedFields = improveProposalSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for improving proposal.' };
    }
  
    try {
      const result = await improveProposal(validatedFields.data);
      await decrementProposalCredits(user.uid);
      return { data: result };
    } catch (error) {
      console.error(error);
      return { error: 'Failed to improve proposal.' };
    }
  }


export async function getGoogleAuthUrl(referralCode: string | null) {
    const headersList = headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    const oAuth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    const state = JSON.stringify({
        referralCode: referralCode || null
    });

    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        prompt: 'consent',
        state: encodeURIComponent(state),
    });
    
    return authorizeUrl;
}

const updateDisplayNameSchema = z.object({
    displayName: z.string().min(1, 'Display name cannot be empty.'),
});

async function updateUserInFirestore(uid: string, data: { displayName: string }) {
  if (!adminDb) {
    throw new Error('Database admin is not initialized.');
  }
  const userRef = adminDb.collection('users').doc(uid);
  await userRef.update(data);
}

async function updateUserDisplayName(uid: string, displayName: string) {
  const { adminAuth } = await import('@/lib/firebase/admin');
  if (!uid) throw new Error('You must be logged in to update your profile.');
  if (!adminAuth) {
    throw new Error('Auth admin is not initialized.');
  }

  try {
    // Update Firebase Auth profile (server-side)
    await adminAuth.updateUser(uid, { displayName });

    // Update Firestore user document
    await updateUserInFirestore(uid, { displayName });

  } catch (error) {
     console.error("Error updating display name:", error);
     throw new Error("Failed to update display name on the server.");
  }
}

export async function updateUserDisplayNameAction(formData: FormData) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { error: 'You must be logged in to update your profile.' };
    }

    const validatedFields = updateDisplayNameSchema.safeParse({
        displayName: formData.get('displayName'),
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors.displayName?.[0] };
    }

    try {
        await updateUserDisplayName(currentUser.user.uid, validatedFields.data.displayName);
        revalidatePath('/profile');
        return { success: 'Display name updated successfully.' };
    } catch (error: any) {
        return { error: error.message || 'Failed to update display name.' };
    }
}

export async function getBillingHistory(): Promise<{ invoices?: InvoiceDetails[]; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.userDoc?.stripeCustomerId) {
    return { error: 'Stripe customer ID not found.' };
  }

  const { stripeCustomerId } = currentUser.userDoc;

  try {
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 20, // Get the last 20 invoices
    });

    const invoiceDetails: InvoiceDetails[] = invoices.data.map(invoice => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000).toLocaleDateString(),
      total: `$${(invoice.total / 100).toFixed(2)}`,
      status: invoice.status || 'unknown',
      invoiceUrl: invoice.hosted_invoice_url,
    }));

    return { invoices: invoiceDetails };
  } catch (error: any) {
    console.error('Error fetching billing history from Stripe:', error);
    return { error: 'Could not retrieve billing history.' };
  }
}

export async function getCreditHistory(): Promise<{ history?: CreditHistoryItem[]; error?: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { error: 'User not authenticated.' };
    }
    
     if (!adminDb) {
        return { error: 'Database not initialized.' };
    }

    try {
        const historyRef = adminDb.collection('users').doc(currentUser.user.uid).collection('creditHistory');
        const querySnapshot = await historyRef.orderBy('createdAt', 'desc').get();
        
        const history: CreditHistoryItem[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                amount: data.amount,
                reason: data.reason,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            };
        });

        return { history };
    } catch (error: any) {
        console.error('Error fetching credit history:', error);
        return { error: 'Could not retrieve credit history.' };
    }
}

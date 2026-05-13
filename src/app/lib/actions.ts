
'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import type { PortfolioLink } from './types';
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
} from '@/ai/flows/suggest-opening-strategy';
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
import { paddle } from '@/lib/paddle/config';


export interface InvoiceDetails {
  id: string;
  date: string;
  total: string;
  status: string;
  invoiceUrl: string | null;
  description: string;
}

export interface CreditHistoryItem {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

import { cache } from 'react';

// Helper: get authenticated user + their DB record
export const getAuthenticatedUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionStatus: true,
      proposalCount: true,
      proposalCredits: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      emailVerified: true,
    }
  });
  return user;
});

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

  const user = await getAuthenticatedUser();
  if (!user?.emailVerified) {
    return { error: 'Please verify your email to use this feature.' };
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
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: 'You must be logged in to use this feature.' };
  }

  if (!user.emailVerified) {
    return { error: 'Please verify your email to use this feature.' };
  }

  const { subscriptionStatus, proposalCount = 0 } = user;

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
  greeting: z.string().optional(),
  openingStrategy: z.string().optional(),
  closingCta: z.string().optional(),
  closingCta2: z.string().optional(),
  tone: z.string(),
  wordLimit: z.string().optional(),
  proposalTemplate: z.enum(['standard', 'video']).optional(),
});

export async function generateProposalAction(input: z.infer<typeof generateProposalSchema>) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: 'You must be logged in to generate a proposal.' };
  }

  // GATING: Email Verification
  if (!user.emailVerified) {
    return { error: 'Please verify your email to generate proposals. Check your inbox for the verification link.' };
  }

  const { subscriptionStatus, proposalCount = 0 } = user;

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

    // Increment proposal count in Prisma
    await prisma.user.update({
      where: { id: user.id },
      data: { proposalCount: { increment: 1 } },
    });

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
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: 'You must be logged in to use this feature.' };
  }

  // GATING: Email Verification
  if (!user.emailVerified) {
    return { error: 'Please verify your email to use this feature. Check your inbox for the verification link.' };
  }

  const { proposalCredits = 0 } = user;

  if (proposalCredits <= 0) {
    return { error: 'You have no proposal improvement credits left. Please refer a friend to earn more.' };
  }

  const validatedFields = improveProposalSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: 'Invalid input for improving proposal.' };
  }

  try {
    const result = await improveProposal(validatedFields.data);

    // Decrement proposal credits in Prisma
    await prisma.user.update({
      where: { id: user.id },
      data: { proposalCredits: { decrement: 1 } },
    });

    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to improve proposal.' };
  }
}


const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name cannot be empty.'),
  title: z.string().optional(),
  bio: z.string().optional(),
  services: z.array(z.string()).optional(),
  image: z.string().optional(),
});

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'You must be logged in to update your profile.' };
  }

  const servicesRaw = formData.get('services') as string;
  const services = servicesRaw ? JSON.parse(servicesRaw) : [];

  const name = formData.get('displayName');
  const title = formData.get('title');
  const bio = formData.get('bio');
  const image = formData.get('image');
  const whatsapp = formData.get('whatsapp');

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== null && { name: name as string }),
        ...(title !== null && { title: title as string }),
        ...(bio !== null && { bio: bio as string }),
        services: JSON.stringify(services),
        ...(image !== null && { image: image as string }),
        ...(whatsapp !== null && { whatsapp: whatsapp as string }),
      },
    });

    revalidatePath('/profile');
    return { success: 'Profile updated successfully.' };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { error: error.message || 'Failed to update profile.' };
  }
}

export async function getBillingHistory(): Promise<{ invoices?: InvoiceDetails[]; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: 'User not authenticated.' };
  }

  if (!user.paddleCustomerId) {
    return { invoices: [] };
  }

  try {
    const transactions = paddle.transactions.list({
      customerId: [user.paddleCustomerId],
      status: ['completed'],
    });

    const invoiceDetails: InvoiceDetails[] = [];

    for await (const transaction of transactions) {
      const totalAmount = transaction.details?.totals?.total;
      const description = transaction.items[0]?.price?.description || 'Payment';

      invoiceDetails.push({
        id: transaction.id,
        date: new Date(transaction.createdAt).toLocaleDateString(),
        total: totalAmount ? `$${(Number(totalAmount) / 100).toFixed(2)}` : 'N/A',
        status: transaction.status,
        invoiceUrl: null, // Paddle handles invoices via emails or customer portal
        description: description,
      });
    }

    return { invoices: invoiceDetails };
  } catch (error: any) {
    console.error('Error fetching billing history from Paddle:', error);
    return { error: 'Could not retrieve billing history.' };
  }
}

export async function getCreditHistory(): Promise<{ history?: CreditHistoryItem[]; error?: string }> {
  // Return empty until a CreditHistory model is added to Prisma.
  return { history: [] };
}

export async function resendVerificationEmailAction(): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user || !user.email) {
    return { error: 'You must be logged in to resend the verification email.' };
  }

  // Double check in DB for verified status
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true }
  });

  if (dbUser?.emailVerified) {
    return { error: 'Your email is already verified.' };
  }

  try {
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email }
    });

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires,
      }
    });

    const { sendVerificationEmail } = await import("@/lib/email-actions");
    await sendVerificationEmail(user.email, verificationToken);

    return { success: true };
  } catch (error: any) {
    console.error("RESEND_VERIFY_ERROR", error);
    return { error: 'Failed to resend verification email.' };
  }
}


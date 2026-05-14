
'use server';

import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

import type { PortfolioLink } from '@/app/lib/types';
import { getCountryFromIp } from '@/app/lib/location';
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

async function getAuthenticatedUser() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            console.log("getAuthenticatedUser: No session or user ID found.");
            return null;
        }
        
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });
        
        if (!user) {
            console.log(`getAuthenticatedUser: User ID ${session.user.id} from session not found in DB.`);
        }

        return user;
    } catch (error) {
        console.error("getAuthenticatedUser ERROR:", error);
        return null;
    }
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
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: 'You must be logged in to use this feature.' };
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

      // If successful, increment the proposal count
      await prisma.user.update({
          where: { id: user.id },
          data: { proposalCount: { increment: 1 } }
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
      
      await prisma.user.update({
          where: { id: user.id },
          data: { proposalCredits: { decrement: 1 } }
      });

      // Log the credit usage
      // @ts-ignore
      await prisma.creditHistory.create({
          data: {
              userId: user.id,
              amount: -1,
              reason: 'Improve Proposal'
          }
      });

      return { data: result };
    } catch (error) {
      console.error(error);
    return { error: 'Failed to improve proposal.' };
    }
  }


export async function getGoogleAuthUrl(referralCode: string | null) {
    const headersList = await headers();
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

export async function updateUserDisplayNameAction(formData: FormData) {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { error: 'You must be logged in to update your profile.' };
    }
    const validatedFields = updateDisplayNameSchema.safeParse({
        displayName: formData.get('displayName'),
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors.displayName?.[0] };
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { name: validatedFields.data.displayName }
        });
        
        revalidatePath('/profile');
        return { success: 'Display name updated successfully.' };
    } catch (error: any) {
        console.error("Error updating display name:", error);
        return { error: error.message || 'Failed to update display name.' };
    }
}

import { paddle } from './paddle/config';

export async function getBillingHistory(): Promise<{ invoices?: InvoiceDetails[]; error?: string }> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { error: 'You must be logged in to view billing history.' };
    }

    if (!user.paddleCustomerId) {
        return { invoices: [] };
    }

    try {
        const transactionsCollection = paddle.transactions.list({
            customerId: [user.paddleCustomerId],
        });

        const invoices: InvoiceDetails[] = [];
        let count = 0;
        for await (const t of transactionsCollection) {
            // Limit to 20 transactions for the history
            if (count >= 20) break;
            
            // Only show completed/billed transactions to users
            if (t.status !== 'completed' && t.status !== 'billed' && t.status !== 'paid') continue;
            
            invoices.push({
                id: t.id,
                date: new Date(t.billedAt || t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                total: `${(parseInt(t.details?.totals?.grandTotal || '0') / 100).toFixed(2)} ${t.currencyCode}`,
                status: t.status,
                invoiceUrl: (t as any).checkout?.url || null,
                description: t.items?.map((i: any) => i.price?.description || i.price?.name || 'Purchase').join(', ') || 'Subscription'
            });
            count++;
        }

        return { invoices };
    } catch (error) {
        console.error("Error fetching billing history:", error);
        return { error: 'Failed to load billing history.' };
    }
}


export async function getCreditPurchaseHistory(): Promise<{ invoices?: InvoiceDetails[]; error?: string }> {
    // TODO: Implement CreditBillingHistory with Prisma model
    // For now, we return empty as the model doesn't exist yet.
    return { invoices: [] };
}

/**
 * Syncs subscription status directly from Paddle API into the database.
 * This is a fallback for when webhooks are delayed or misconfigured.
 */
export async function syncSubscriptionFromPaddle(): Promise<{ success?: boolean; status?: string; error?: string }> {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'You must be logged in.' };

    try {
        let latestSub: any = null;

        // 1. Try by stored subscription ID first (fastest path)
        if (user.paddleSubscriptionId) {
            try {
                latestSub = await paddle.subscriptions.get(user.paddleSubscriptionId);
            } catch (e) {
                console.warn('syncSubscription: could not fetch by subscriptionId, falling back to customer search', e);
            }
        }

        // 2. Fall back to listing by customer ID
        if (!latestSub && user.paddleCustomerId) {
            const subs = paddle.subscriptions.list({ customerId: [user.paddleCustomerId] });
            for await (const s of subs) {
                // Take the most recently created active/trialing one
                if (!latestSub || new Date(s.createdAt) > new Date(latestSub.createdAt)) {
                    latestSub = s;
                }
            }
        }

        // 3. Fall back to listing by email
        if (!latestSub && user.email) {
            const customers = paddle.customers.list({ email: [user.email] });
            for await (const c of customers) {
                const subs = paddle.subscriptions.list({ customerId: [c.id] });
                for await (const s of subs) {
                    if (!latestSub || new Date(s.createdAt) > new Date(latestSub.createdAt)) {
                        latestSub = s;
                    }
                }
            }
        }

        if (!latestSub) {
            return { error: 'No Paddle subscription found for this account. Please complete a payment first.' };
        }

        const interval = latestSub.items?.[0]?.price?.billingCycle?.interval;
        const newStatus = latestSub.status;

        // Write to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                paddleCustomerId: latestSub.customerId || user.paddleCustomerId || undefined,
                paddleSubscriptionId: latestSub.id || user.paddleSubscriptionId || undefined,
                subscriptionStatus: newStatus,
                subscriptionInterval: interval,
                subscriptionCurrentPeriodEnd: latestSub.currentBillingPeriod
                    ? new Date(latestSub.currentBillingPeriod.endsAt)
                    : null,
            } as any,
        });

        // Award credits if now active and none yet awarded
        if (newStatus === 'active') {
            const reason = interval === 'year' ? 'Yearly plan activation' : 'Monthly plan activation';
            const amount = interval === 'year' ? 400 : 30;
            const existing = await prisma.creditHistory.findFirst({ where: { userId: user.id, reason } });
            if (!existing) {
                await prisma.user.update({ where: { id: user.id }, data: { proposalCredits: { increment: amount } } });
                await prisma.creditHistory.create({ data: { userId: user.id, amount, reason } });
            }
        }

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/pricing');
        revalidatePath('/subscription');

        return { success: true, status: newStatus };
    } catch (error: any) {
        console.error('syncSubscriptionFromPaddle ERROR:', error);
        return { error: error.message || 'Failed to sync subscription.' };
    }
}



export async function getCreditHistory(): Promise<{ history?: CreditHistoryItem[]; error?: string }> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { error: 'You must be logged in to view credit history.' };
    }

    try {
        // @ts-ignore
        const records = await prisma.creditHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const history: CreditHistoryItem[] = records.map((r: any) => ({
            id: r.id,
            amount: r.amount,
            reason: r.reason,
            createdAt: r.createdAt.toISOString(),
        }));

        return { history };
    } catch (error) {
        console.error("CREDIT_HISTORY_ERROR:", error);
        return { error: 'Failed to load credit history.' };
    }
}

export async function resendVerificationEmailAction(): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user || !user.email) {
    return { error: 'You must be logged in to resend the verification email.' };
  }

  if (user.emailVerified) {
    return { error: 'Your email is already verified.' };
  }

  try {
    // Generate new token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // I'll just use create and delete old ones for simplicity.
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

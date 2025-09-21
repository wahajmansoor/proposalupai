
"use server";

import { z } from 'zod';
import { analyzeJobForProposal } from '@/ai/flows/analyze-job-for-proposal';
import { autofillProposalSections } from '@/ai/flows/autofill-proposal-sections';
import { answerClientQuestions } from '@/ai/flows/answer-client-questions';
import { generateProposal } from '@/ai/flows/generate-proposal-from-job-analysis';
import { suggestProposalTemplate } from '@/ai/flows/suggest-proposal-template';
import { suggestOpeningStrategy } from '@/ai/flows/suggest-opening-strategy';
import { OAuth2Client } from 'google-auth-library';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { updateUserDisplayName } from '@/lib/firebase/auth';
import { revalidatePath } from 'next/cache';

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
    const validatedFields = analyzeAndSuggestSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for analysis and suggestions.' };
    }
    try {
        const [templateSuggestion, strategySuggestion] = await Promise.all([
          suggestProposalTemplate(validatedFields.data.projectDetails),
          suggestOpeningStrategy({
            ...validatedFields.data.projectDetails,
            strategies: validatedFields.data.strategies,
          })
        ]);
        
        return { 
          data: {
            template: templateSuggestion.template,
            templateReasoning: templateSuggestion.reasoning,
            strategyId: strategySuggestion.strategyId,
            strategyReasoning: strategySuggestion.reasoning,
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

const generateProposalSchema = z.object({
    projectTitle: z.string(),
    summary: z.string(),
    profileSummary: z.string(),
    relevantSkills: z.string(),
    pastSuccesses: z.string(),
    portfolioLinks: z.string().optional(),
    greeting: z.string(),
    openingStrategy: z.string().optional(),
    closingCta: z.string(),
    closingCta2: z.string().optional(),
    tone: z.string(),
    wordLimit: z.string().optional(),
    proposalTemplate: z.enum(['standard', 'video']).optional(),
});

export async function generateProposalAction(input: z.infer<typeof generateProposalSchema>) {
    const validatedFields = generateProposalSchema.safeParse(input);
    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten());
        return { error: 'Invalid input for generating proposal.' };
    }
  try {
    const result = await generateProposal(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to generate proposal.' };
  }
}

export async function getGoogleAuthUrl() {
    const headersList = headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    const oAuth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        prompt: 'consent'
    });
    
    return authorizeUrl;
}

const updateDisplayNameSchema = z.object({
    displayName: z.string().min(1, 'Display name cannot be empty.'),
});

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

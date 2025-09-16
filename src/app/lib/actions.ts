
"use server";

import { z } from 'zod';
import { analyzeJobForProposal } from '@/ai/flows/analyze-job-for-proposal';
import { autofillProposalSections } from '@/ai/flows/autofill-proposal-sections';
import { suggestIntroductionStrategies } from '@/ai/flows/suggest-introduction-strategies';
import { answerClientQuestions } from '@/ai/flows/answer-client-questions';
import { generateProposal } from '@/ai/flows/generate-proposal-from-job-analysis';
import { suggestProposalTemplate } from '@/ai/flows/suggest-proposal-template';
import { suggestOpeningStrategy } from '@/ai/flows/suggest-opening-strategy';

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
        const [templateResult, strategyResult] = await Promise.all([
            suggestProposalTemplate(validatedFields.data.projectDetails),
            suggestOpeningStrategy({
                ...validatedFields.data.projectDetails,
                strategies: validatedFields.data.strategies,
            }),
        ]);
        
        return { data: { template: templateResult, strategy: strategyResult } };
    } catch (error) {
        console.error("Error in analyzeAndSuggestAction:", error);
        return { error: 'Failed to get AI suggestions.' };
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

const suggestIntroductionsSchema = z.object({
  projectTitle: z.string(),
  summary: z.string(),
  profileSummary: z.string(),
  pastSuccesses: z.array(z.string()),
});

export async function suggestIntroductionsAction(input: z.infer<typeof suggestIntroductionsSchema>) {
    const validatedFields = suggestIntroductionsSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input for suggestions.' };
    }
  try {
    const result = await suggestIntroductionStrategies(validatedFields.data);
    return { data: result };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to suggest introductions.' };
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
    clientQuestions: z.string(),
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

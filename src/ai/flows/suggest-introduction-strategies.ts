'use server';

/**
 * @fileOverview AI flow to suggest personalized introduction strategies based on job details.
 *
 * - suggestIntroductionStrategies - Function to generate introduction suggestions.
 * - SuggestIntroductionStrategiesInput - Input type for the function.
 * - SuggestIntroductionStrategiesOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestIntroductionStrategiesInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job being applied for.'),
  jobDescription: z.string().describe('The description of the job.'),
  profileSummary: z.string().describe('A summary of the applicant\s profile.'),
  pastSuccesses: z.array(z.string()).describe('A list of past successes of the applicant.'),
});

export type SuggestIntroductionStrategiesInput = z.infer<
  typeof SuggestIntroductionStrategiesInputSchema
>;

const SuggestIntroductionStrategiesOutputSchema = z.object({
  introductionSuggestions: z
    .array(z.string())
    .describe('A list of suggested introduction strategies.'),
});

export type SuggestIntroductionStrategiesOutput = z.infer<
  typeof SuggestIntroductionStrategiesOutputSchema
>;

export async function suggestIntroductionStrategies(
  input: SuggestIntroductionStrategiesInput
): Promise<SuggestIntroductionStrategiesOutput> {
  return suggestIntroductionStrategiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIntroductionStrategiesPrompt',
  input: {schema: SuggestIntroductionStrategiesInputSchema},
  output: {schema: SuggestIntroductionStrategiesOutputSchema},
  prompt: `You are an AI assistant that helps users craft compelling introductions for job applications.
  Given the job details and the applicant's profile, suggest a few personalized introduction strategies.

  Job Title: {{{jobTitle}}}
  Job Description: {{{jobDescription}}}
  Profile Summary: {{{profileSummary}}}
  Past Successes: {{#each pastSuccesses}}- {{{this}}}
  {{/each}}

  Suggest 3 different introduction strategies that would be most effective for this job application. Return each suggestion in a separate line.
  `,
});

const suggestIntroductionStrategiesFlow = ai.defineFlow(
  {
    name: 'suggestIntroductionStrategiesFlow',
    inputSchema: SuggestIntroductionStrategiesInputSchema,
    outputSchema: SuggestIntroductionStrategiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

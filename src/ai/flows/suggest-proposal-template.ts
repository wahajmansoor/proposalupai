'use server';
/**
 * @fileOverview Suggests a proposal template based on job details.
 *
 * - suggestProposalTemplate - Function to generate template suggestions.
 * - SuggestProposalTemplateInput - Input type for the function.
 * - SuggestProposalTemplateOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestProposalTemplateInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job being applied for.'),
  jobDescription: z.string().describe('The description of the job.'),
});

export type SuggestProposalTemplateInput = z.infer<
  typeof SuggestProposalTemplateInputSchema
>;

const SuggestProposalTemplateOutputSchema = z.object({
  template: z
    .enum(['standard', 'video'])
    .describe('The suggested proposal template.'),
  reasoning: z
    .string()
    .describe('A brief explanation for the template suggestion.'),
});

export type SuggestProposalTemplateOutput = z.infer<
  typeof SuggestProposalTemplateOutputSchema
>;

export async function suggestProposalTemplate(
  input: SuggestProposalTemplateInput
): Promise<SuggestProposalTemplateOutput> {
  return suggestProposalTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProposalTemplatePrompt',
  input: {schema: SuggestProposalTemplateInputSchema},
  output: {schema: SuggestProposalTemplateOutputSchema},
  prompt: `You are an AI assistant that helps freelancers choose the best proposal template.
  Given the job details, suggest either a 'standard' or 'video' proposal template.

  - Use 'video' if the job requires strong communication skills, a personal connection, is for a creative role, or if the description is informal and friendly.
  - Otherwise, default to 'standard'.

  Provide a short, one-sentence reason for your choice.

  Job Title: {{{jobTitle}}}
  Job Description: {{{jobDescription}}}
  `,
});

const suggestProposalTemplateFlow = ai.defineFlow(
  {
    name: 'suggestProposalTemplateFlow',
    inputSchema: SuggestProposalTemplateInputSchema,
    outputSchema: SuggestProposalTemplateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

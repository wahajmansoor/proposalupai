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
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The summary of the project.'),
});

export type SuggestProposalTemplateInput = z.infer<
  typeof SuggestProposalTemplateInputSchema
>;

const SuggestProposalTemplateOutputSchema = z.object({
  template: z
    .enum(['standard', 'video'])
    .describe("The suggested proposal template. MUST be either 'standard' or 'video'."),
  reasoning: z
    .string()
    .describe('A brief, one-sentence explanation for the template suggestion.'),
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
  config: {
    temperature: 0,
  },
  prompt: `You are an AI assistant that helps freelancers choose the best proposal template.
  Given the job details, suggest either a 'standard' or 'video' proposal template.

  - Use 'video' if the job requires strong communication skills, a personal connection, is for a creative role, or if the description is informal and friendly.
  - Otherwise, default to 'standard'.

  Provide a short, one-sentence reason for your choice.

  Project Title: {{{projectTitle}}}
  Summary: {{{summary}}}

  CRITICAL: You MUST respond in the format defined by the output schema. The 'template' field must be either 'standard' or 'video'.
  `,
});

const suggestProposalTemplateFlow = ai.defineFlow(
  {
    name: 'suggestProposalTemplateFlow',
    inputSchema: SuggestProposalTemplateInputSchema,
    outputSchema: SuggestProposalTemplateOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (output && (output.template === 'standard' || output.template === 'video')) {
        return output;
      }
    } catch (e) {
      console.warn(`Error in suggestProposalTemplateFlow, falling back to default.`, e);
    }
    // Fallback in case of error or invalid output
    return {
      template: 'standard',
      reasoning: 'AI could not determine a specific template, defaulting to standard.',
    };
  }
);

'use server';
/**
 * @fileOverview Suggests an opening strategy based on job details.
 *
 * - suggestOpeningStrategy - Function to generate opening strategy suggestions.
 * - SuggestOpeningStrategyInput - Input type for the function.
 * - SuggestOpeningStrategyOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOpeningStrategyInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The summary of the project.'),
  strategies: z.record(z.string()).describe('A JSON object of available strategies where key is the ID and value is the description.')
});

export type SuggestOpeningStrategyInput = z.infer<
  typeof SuggestOpeningStrategyInputSchema
>;

const SuggestOpeningStrategyOutputSchema = z.object({
  strategyId: z
    .string()
    .describe("The ID of the suggested opening strategy. MUST be one of the keys from the input strategies."),
  reasoning: z
    .string()
    .describe('A brief, one-sentence explanation for the strategy suggestion.'),
});

export type SuggestOpeningStrategyOutput = z.infer<
  typeof SuggestOpeningStrategyOutputSchema
>;

export async function suggestOpeningStrategy(
  input: SuggestOpeningStrategyInput
): Promise<SuggestOpeningStrategyOutput> {
  return suggestOpeningStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOpeningStrategyPrompt',
  input: {schema: SuggestOpeningStrategyInputSchema},
  output: {schema: SuggestOpeningStrategyOutputSchema},
  config: {
    temperature: 0,
  },
  prompt: `You are an AI assistant that helps freelancers choose the best opening strategy for a proposal.
  Given the job details and a list of available strategies, suggest the most effective one.

  Project Title: {{{projectTitle}}}
  Summary: {{{summary}}}

  Available Strategies:
  {{#each strategies}}
  - ID: {{@key}}, Description: {{{this}}}
  {{/each}}

  Analyze the project title and summary and choose the strategy ID that would create the most compelling opening hook.
  Provide a short, one-sentence reason for your choice.

  CRITICAL: You MUST respond in the format defined by the output schema. The 'strategyId' field must be one of the provided strategy IDs.
  `,
});

const suggestOpeningStrategyFlow = ai.defineFlow(
  {
    name: 'suggestOpeningStrategyFlow',
    inputSchema: SuggestOpeningStrategyInputSchema,
    outputSchema: SuggestOpeningStrategyOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (output && Object.keys(input.strategies).includes(output.strategyId)) {
        return output;
      }
    } catch (e) {
      console.warn(`Error in suggestOpeningStrategyFlow, falling back to default.`, e);
    }
    // Fallback in case of error or invalid ID
    return { strategyId: 'none', reasoning: 'AI could not determine a specific strategy, a custom opening will be generated.' };
  }
);

'use server';
/**
 * @fileOverview Suggests a proposal template and an opening strategy based on job details.
 *
 * - suggestTemplateAndStrategy - Function to generate template and strategy suggestions.
 * - SuggestTemplateAndStrategyInput - Input type for the function.
 * - SuggestTemplateAndStrategyOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTemplateAndStrategyInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The summary of the project.'),
  strategies: z.record(z.string()).describe('A JSON object of available strategies where key is the ID and value is the description.')
});

export type SuggestTemplateAndStrategyInput = z.infer<
  typeof SuggestTemplateAndStrategyInputSchema
>;

const SuggestTemplateAndStrategyOutputSchema = z.object({
  template: z
    .enum(['standard', 'video'])
    .describe("The suggested proposal template. MUST be either 'standard' or 'video'."),
  templateReasoning: z
    .string()
    .describe('A brief, one-sentence explanation for the template suggestion.'),
  strategyId: z
    .string()
    .describe("The ID of the suggested opening strategy. MUST be one of the keys from the input strategies."),
  strategyReasoning: z
    .string()
    .describe('A brief, one-sentence explanation for the strategy suggestion.'),
});

export type SuggestTemplateAndStrategyOutput = z.infer<
  typeof SuggestTemplateAndStrategyOutputSchema
>;

export async function suggestTemplateAndStrategy(
  input: SuggestTemplateAndStrategyInput
): Promise<SuggestTemplateAndStrategyOutput> {
  return suggestTemplateAndStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTemplateAndStrategyPrompt',
  input: {schema: SuggestTemplateAndStrategyInputSchema},
  output: {schema: SuggestTemplateAndStrategyOutputSchema},
  config: {
    temperature: 0.5,
  },
  prompt: `You are an AI assistant that helps freelancers choose the best proposal template and opening strategy.
  Given the job details and a list of available strategies, suggest the most effective ones.

  **Analysis Task:**
  1.  **Template Suggestion:**
      - Analyze the job details to suggest either a 'standard' or 'video' proposal template.
      - Use 'video' if the job requires strong communication skills, a personal connection, is for a creative role, or if the description is informal and friendly.
      - Otherwise, default to 'standard'.
      - Provide a short, one-sentence reason for your choice in the 'templateReasoning' field.

  2.  **Opening Strategy Suggestion:**
      - Analyze the project title and summary and choose the strategy ID from the list below that would create the most compelling opening hook.
      - Provide a short, one-sentence reason for your choice in the 'strategyReasoning' field.

  **Job Details:**
  Project Title: {{{projectTitle}}}
  Summary: {{{summary}}}

  **Available Strategies:**
  {{#each strategies}}
  - ID: {{@key}}, Description: {{{this}}}
  {{/each}}

  CRITICAL: You MUST respond in the format defined by the output schema. The 'template' field must be either 'standard' or 'video'. The 'strategyId' field must be one of the provided strategy IDs.
  `,
});

const suggestTemplateAndStrategyFlow = ai.defineFlow(
  {
    name: 'suggestTemplateAndStrategyFlow',
    inputSchema: SuggestTemplateAndStrategyInputSchema,
    outputSchema: SuggestTemplateAndStrategyOutputSchema,
  },
  async (input) => {
    for (let i = 0; i < 3; i++) {
      try {
        const {output} = await prompt(input);
        if (output && Object.keys(input.strategies).includes(output.strategyId) && (output.template === 'standard' || output.template === 'video')) {
          return output;
        }
      } catch (e) {
        console.warn(`Attempt ${i + 1} failed for suggestTemplateAndStrategyFlow`, e);
      }
    }
    // Fallback in case of invalid response after retries
    console.warn("AI returned an invalid suggestion after multiple retries, using fallback.");
    return { 
        template: 'standard', 
        templateReasoning: 'AI could not determine a specific template, defaulting to standard.',
        strategyId: 'none', 
        strategyReasoning: 'AI could not determine a specific strategy, a custom opening will be generated.' 
    };
  }
);

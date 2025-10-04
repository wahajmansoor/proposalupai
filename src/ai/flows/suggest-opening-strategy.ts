
'use server';
/**
 * @fileOverview Suggests an opening strategy based on job details.
 *
 * - suggestOpeningStrategy - Function to generate opening strategy suggestions.
 * - SuggestOpeningStrategyInput - Input type for the function.
 * - SuggestOpeningStrategyOutput - Output type for the function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
  const availableStrategies = Object.entries(input.strategies).map(([id, desc]) => `- ID: ${id}, Description: ${desc}`).join('\n');

  const prompt = `You are an expert AI assistant specializing in sales psychology for freelancers. Your task is to select the *most impactful* opening strategy for a job proposal.

  Analyze the provided job details and the list of available strategies. Think about what would grab this specific client's attention. Is the job post formal or informal? Does it mention a company milestone? Is there a clear, urgent problem?

  Your goal is to choose the strategy ID that will create the most compelling and tailored opening hook, avoiding generic choices unless they are truly the best fit.

  Project Title: ${input.projectTitle}
  Summary: ${input.summary}

  Available Strategies:
  ${availableStrategies}

  Provide a short, one-sentence reason for your choice, explaining *why* it's the best psychological approach for this client.

  CRITICAL: You MUST respond in the format defined by the output schema. The 'strategyId' field must be one of the provided strategy IDs.
  `;

  try {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'suggest_opening_strategy',
                    description: 'Suggests an opening strategy for a proposal.',
                    parameters: zodToJsonSchema(SuggestOpeningStrategyOutputSchema),
                }
            }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_opening_strategy' } },
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    if (toolCall?.function.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = SuggestOpeningStrategyOutputSchema.parse(args);
        // Validate that the returned ID is one of the available strategies
        if (Object.keys(input.strategies).includes(result.strategyId)) {
            return result;
        }
    }
  } catch (e) {
      console.warn(`Error in suggestOpeningStrategy, falling back to default.`, e);
  }
  
  // Fallback in case of error or invalid ID
  return { strategyId: 'none', reasoning: 'AI could not determine a specific strategy, a custom opening will be generated.' };
}


'use server';
/**
 * @fileOverview Suggests a word limit based on job details.
 *
 * - suggestWordLimit - Function to generate word limit suggestions.
 * - SuggestWordLimitInput - Input type for the function.
 * - SuggestWordLimitOutput - Output type for the function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const SuggestWordLimitInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The summary of the project.'),
});

export type SuggestWordLimitInput = z.infer<
  typeof SuggestWordLimitInputSchema
>;

const SuggestWordLimitOutputSchema = z.object({
  wordLimit: z
    .array(z.number())
    .length(2)
    .describe("The suggested word limit range, e.g. [100, 150]."),
  reasoning: z
    .string()
    .describe('A brief, one-sentence explanation for the word limit suggestion.'),
});

export type SuggestWordLimitOutput = z.infer<
  typeof SuggestWordLimitOutputSchema
>;

export async function suggestWordLimit(
  input: SuggestWordLimitInput
): Promise<SuggestWordLimitOutput> {
  const prompt = `You are an AI assistant that helps freelancers write concise and impactful proposals.
  Based on the length and complexity of the job summary, suggest a word limit range for the proposal and a brief reason.

  - If the summary is very short and direct (under 50 words), suggest a range like [80, 120] and reason that a short job post expects a brief response.
  - If the summary is of average length (50-200 words), suggest a range like [120, 180] and reason that it's enough to show value without overwhelming the client.
  - If the summary is long and detailed (over 200 words), suggest a slightly larger range like [180, 250], but reason that it's important to be concise and respect the client's time despite the detailed post.

  Job Title: ${input.projectTitle}
  Job Summary: ${input.summary}

  CRITICAL: You MUST respond in the format defined by the output schema. The 'wordLimit' field must be an array of two numbers.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_word_limit',
            description: 'Suggests a word limit and reasoning for a proposal.',
            parameters: zodToJsonSchema(SuggestWordLimitOutputSchema),
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'suggest_word_limit' },
      },
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    if (toolCall?.function.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return SuggestWordLimitOutputSchema.parse(args);
    }
  } catch (e) {
    console.warn(
      `Error in suggestWordLimit, falling back to default.`,
      e
    );
  }

  // Fallback in case of error or invalid output
  return {
    wordLimit: [100, 150],
    reasoning: 'A concise proposal is generally more effective.'
  };
}

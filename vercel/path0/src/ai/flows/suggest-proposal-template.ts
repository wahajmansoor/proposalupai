
'use server';
/**
 * @fileOverview Suggests a proposal template based on job details.
 *
 * - suggestProposalTemplate - Function to generate template suggestions.
 * - SuggestProposalTemplateInput - Input type for the function.
 * - SuggestProposalTemplateOutput - Output type for the function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
  const prompt = `You are an AI assistant that helps freelancers choose the best proposal template.
  Given the job details, suggest either a 'standard' or 'video' proposal template.

  - Use 'video' if the job requires strong communication skills, a personal connection, is for a creative role, or if the description is informal and friendly.
  - Otherwise, default to 'standard'.

  Provide a short, one-sentence reason for your choice.

  Project Title: ${input.projectTitle}
  Summary: ${input.summary}

  CRITICAL: You MUST respond in the format defined by the output schema. The 'template' field must be either 'standard' or 'video'.
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
            name: 'suggest_proposal_template',
            description: 'Suggests a proposal template.',
            parameters: zodToJsonSchema(SuggestProposalTemplateOutputSchema),
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'suggest_proposal_template' },
      },
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];
    if (toolCall?.function.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = SuggestProposalTemplateOutputSchema.parse(args);
      if (result.template === 'standard' || result.template === 'video') {
        return result;
      }
    }
  } catch (e) {
    console.warn(
      `Error in suggestProposalTemplate, falling back to default.`,
      e
    );
  }

  // Fallback in case of error or invalid output
  return {
    template: 'standard',
    reasoning:
      'AI could not determine a specific template, defaulting to standard.',
  };
}

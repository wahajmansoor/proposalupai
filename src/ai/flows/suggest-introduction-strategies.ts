'use server';

/**
 * @fileOverview AI flow to suggest personalized introduction strategies based on job details.
 *
 * - suggestIntroductionStrategies - Function to generate introduction suggestions.
 * - SuggestIntroductionStrategiesInput - Input type for the function.
 * - SuggestIntroductionStrategiesOutput - Output type for the function.
 */
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const SuggestIntroductionStrategiesInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The summary of the project.'),
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
  const prompt = `You are an AI assistant that helps users craft compelling introductions for job applications.
  Given the project details and the applicant's profile, suggest a few personalized introduction strategies.

  Project Title: ${input.projectTitle}
  Summary: ${input.summary}
  Profile Summary: ${input.profileSummary}
  Past Successes: ${input.pastSuccesses.map(s => `- ${s}`).join('\n')}

  Suggest 3 different introduction strategies that would be most effective for this job application.
  `;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    tools: [
        {
            type: 'function',
            function: {
                name: 'provide_introduction_suggestions',
                description: 'Provides a list of introduction suggestions.',
                parameters: SuggestIntroductionStrategiesOutputSchema.openapi("IntroductionSuggestions"),
            }
        }
    ],
    tool_choice: { type: 'function', function: { name: 'provide_introduction_suggestions' } },
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];
  if (toolCall?.function.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return SuggestIntroductionStrategiesOutputSchema.parse(args);
  }

  throw new Error('Failed to suggest introduction strategies.');
}

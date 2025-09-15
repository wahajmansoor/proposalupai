'use server';

/**
 * @fileOverview An AI agent that answers specific client questions for a proposal.
 *
 * - answerClientQuestions - A function that handles answering client questions.
 * - AnswerClientQuestionsInput - The input type for the answerClientQuestions function.
 * - AnswerClientQuestionsOutput - The return type for the answerClientQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerClientQuestionsInputSchema = z.object({
  jobDescription: z.string().describe('The job description for the proposal.'),
  clientQuestions: z
    .array(z.string())
    .describe('An array of specific questions from the client.'),
  profileInformation: z
    .string()
    .describe('Information about the user to help tailor the answers.'),
});
export type AnswerClientQuestionsInput = z.infer<
  typeof AnswerClientQuestionsInputSchema
>;

const AnswerClientQuestionsOutputSchema = z.object({
  answers: z
    .array(z.string())
    .describe('An array of answers to the client questions.'),
});
export type AnswerClientQuestionsOutput = z.infer<
  typeof AnswerClientQuestionsOutputSchema
>;

export async function answerClientQuestions(
  input: AnswerClientQuestionsInput
): Promise<AnswerClientQuestionsOutput> {
  return answerClientQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerClientQuestionsPrompt',
  input: {schema: AnswerClientQuestionsInputSchema},
  output: {schema: AnswerClientQuestionsOutputSchema},
  prompt: `You are an AI assistant helping to create proposals.

You will be provided with a job description, some information about the user creating the proposal, and a series of questions from the client.

Your job is to answer each of the client's questions using the job description and the user's profile information to tailor the answers to the specific job and the user's skills and experience.

Job Description: {{{jobDescription}}}

Profile Information: {{{profileInformation}}}

Client Questions:
{{#each clientQuestions}}
- {{{this}}}
{{/each}}

Answers:
`,
});

const answerClientQuestionsFlow = ai.defineFlow(
  {
    name: 'answerClientQuestionsFlow',
    inputSchema: AnswerClientQuestionsInputSchema,
    outputSchema: AnswerClientQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Split the string by newlines to create the array of answers.
    const answers = output?.answers;

    if (!answers) {
      console.warn('No answers generated.');
      return { answers: [] };
    }

    return {answers};
  }
);

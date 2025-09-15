'use server';
/**
 * @fileOverview Generates a proposal based on job analysis and user profile.
 *
 * - generateProposal - A function that generates a proposal.
 * - GenerateProposalInput - The input type for the generateProposal function.
 * - GenerateProposalOutput - The return type for the generateProposal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProposalInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The description of the job.'),
  profileSummary: z.string().describe('A summary of the user profile.'),
  relevantSkills: z.string().describe('A comma separated list of relevant skills for the job'),
  pastSuccesses: z.string().describe('Description of past successes relevant to the job.'),
  clientQuestions: z.string().describe('Any questions from the client that need answering in the proposal.'),
});
export type GenerateProposalInput = z.infer<typeof GenerateProposalInputSchema>;

const GenerateProposalOutputSchema = z.object({
  proposal: z.string().describe('The generated proposal.'),
});
export type GenerateProposalOutput = z.infer<typeof GenerateProposalOutputSchema>;

export async function generateProposal(input: GenerateProposalInput): Promise<GenerateProposalOutput> {
  return generateProposalFlow(input);
}

const proposalPrompt = ai.definePrompt({
  name: 'proposalPrompt',
  input: {schema: GenerateProposalInputSchema},
  output: {schema: GenerateProposalOutputSchema},
  prompt: `You are an expert proposal writer. Based on the job details and the user's profile, create a compelling proposal.

Job Title: {{{jobTitle}}}
Job Description: {{{jobDescription}}}
Profile Summary: {{{profileSummary}}}
Relevant Skills: {{{relevantSkills}}}
Past Successes: {{{pastSuccesses}}}
Client Questions: {{{clientQuestions}}}

Compose a proposal that addresses the key requirements of the job, highlights the user's relevant skills and experiences, and answers any client questions. Focus on how the user can provide value to the client. Use a professional tone.
`,
});

const generateProposalFlow = ai.defineFlow(
  {
    name: 'generateProposalFlow',
    inputSchema: GenerateProposalInputSchema,
    outputSchema: GenerateProposalOutputSchema,
  },
  async input => {
    const {output} = await proposalPrompt(input);
    return output!;
  }
);

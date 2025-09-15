'use server';
/**
 * @fileOverview Analyzes a job description to extract key requirements for proposal generation.
 *
 * - analyzeJobForProposal - A function that analyzes the job description and extracts key requirements.
 * - AnalyzeJobForProposalInput - The input type for the analyzeJobForProposal function.
 * - AnalyzeJobForProposalOutput - The return type for the analyzeJobForProposal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeJobForProposalInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job posting.'),
  jobDescription: z.string().describe('The full text of the job description.'),
});
export type AnalyzeJobForProposalInput = z.infer<
  typeof AnalyzeJobForProposalInputSchema
>;

const AnalyzeJobForProposalOutputSchema = z.object({
  keyRequirements: z
    .array(z.string())
    .describe('A list of key requirements extracted from the job description.'),
  themes: z
    .array(z.string())
    .describe('A list of key themes extracted from the job description.'),
});
export type AnalyzeJobForProposalOutput = z.infer<
  typeof AnalyzeJobForProposalOutputSchema
>;

export async function analyzeJobForProposal(
  input: AnalyzeJobForProposalInput
): Promise<AnalyzeJobForProposalOutput> {
  return analyzeJobForProposalFlow(input);
}

const analyzeJobForProposalPrompt = ai.definePrompt({
  name: 'analyzeJobForProposalPrompt',
  input: {schema: AnalyzeJobForProposalInputSchema},
  output: {schema: AnalyzeJobForProposalOutputSchema},
  prompt: `You are an AI assistant helping users write better proposals.

  Analyze the following job description and extract the key requirements and themes.

  Job Title: {{{jobTitle}}}
  Job Description: {{{jobDescription}}}

  Output the key requirements as a list of strings, and the key themes as a list of strings.
  Themes are higher level concepts, for example "project management" or "software development".
  Requirements are more granular, for example "experience with React" or "strong communication skills".`,
});

const analyzeJobForProposalFlow = ai.defineFlow(
  {
    name: 'analyzeJobForProposalFlow',
    inputSchema: AnalyzeJobForProposalInputSchema,
    outputSchema: AnalyzeJobForProposalOutputSchema,
  },
  async input => {
    const {output} = await analyzeJobForProposalPrompt(input);
    return output!;
  }
);

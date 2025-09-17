'use server';
/**
 * @fileOverview Analyzes a job description to extract key requirements for proposal generation.
 *
 * - analyzeJobForProposal - A function that analyzes the job description and extracts key requirements.
 * - AnalyzeJobForProposalInput - The input type for the analyzeJobForProposal function.
 * - AnalyzeJobForProposalOutput - The return type for the analyzeJobForProposal function.
 */
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AnalyzeJobForProposalInputSchema = z.object({
  projectTitle: z.string().describe('The title of the job posting.'),
  summary: z.string().describe('The full text of the job description.'),
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
  const prompt = `You are an AI assistant helping users write better proposals.

  Analyze the following job description and extract the key requirements and themes.

  Project Title: ${input.projectTitle}
  Summary: ${input.summary}

  Themes are higher level concepts, for example "project management" or "software development".
  Requirements are more granular, for example "experience with React" or "strong communication skills".`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    tools: [
      {
        type: 'function',
        function: {
          name: 'extract_job_analysis',
          description:
            'Extracts key requirements and themes from a job description.',
          parameters: AnalyzeJobForProposalOutputSchema.openapi('JobAnalysis'),
        },
      },
    ],
    tool_choice: {
      type: 'function',
      function: { name: 'extract_job_analysis' },
    },
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];
  if (toolCall?.function.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return AnalyzeJobForProposalOutputSchema.parse(args);
  }

  throw new Error('Failed to analyze job for proposal.');
}

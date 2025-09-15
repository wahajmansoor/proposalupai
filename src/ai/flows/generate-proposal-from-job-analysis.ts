
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
  relevantSkills: z
    .string()
    .describe('A comma separated list of relevant skills for the job'),
  pastSuccesses: z
    .string()
    .describe('Description of past successes relevant to the job.'),
  clientQuestions: z
    .string()
    .describe(
      'Any questions from the client that need answering in the proposal.'
    ),
  portfolioLinks: z
    .string()
    .optional()
    .describe('A comma-separated list of portfolio links.'),
  greeting: z.string().describe('The desired greeting for the proposal.'),
  openingStrategy: z.string().optional().describe('An optional opening paragraph template.'),
  closingCta: z
    .string()
    .describe('The primary desired closing call-to-action for the proposal.'),
  closingCta2: z
    .string()
    .optional()
    .describe('An optional secondary closing call-to-action.'),
  tone: z.string().describe('The desired tone for the proposal.'),
  wordLimit: z.string().optional().describe('An optional word limit for the proposal, can be a range e.g. "100-150".'),
});
export type GenerateProposalInput = z.infer<typeof GenerateProposalInputSchema>;

const GenerateProposalOutputSchema = z.object({
  proposal: z.string().describe('The generated proposal.'),
});
export type GenerateProposalOutput = z.infer<
  typeof GenerateProposalOutputSchema
>;

export async function generateProposal(
  input: GenerateProposalInput
): Promise<GenerateProposalOutput> {
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
Portfolio Links: {{{portfolioLinks}}}

**CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE FORMATTING RULES:**
- **Greeting:** Start with the exact greeting provided: "{{{greeting}}}". Capitalize the first letter. This MUST be followed by two line breaks.
{{#if openingStrategy}}
- **Opening Paragraph:** Use the following "Opening Strategy" as the first paragraph. You MUST adapt it to the job by intelligently replacing placeholders like [CLIENT'S NAME], [SPECIFIC TASK], or [SPECIFIC SKILL] with relevant information from the job description and user profile. Do not leave the placeholders in the final output. The opening strategy is: "{{{openingStrategy}}}"
{{/if}}
- **Body:** The main body of the proposal is the most important part. It MUST be broken into multiple paragraphs for readability. DO NOT output a single block of text. Use line breaks to separate paragraphs.
{{#if portfolioLinks}}- **Portfolio:** If portfolio links are provided, introduce them naturally within the proposal body. For example, "Here are some examples of my work:" or "You can view my portfolio here:". Then list each link on a new line.{{/if}}
- **Closing:** End the proposal by intelligently integrating the closing phrase "{{{closingCta}}}" into a natural-sounding final sentence.
{{#if closingCta2}}- **Sign-off:** After the closing sentence, add two line breaks and then write the sign-off phrase: "{{{closingCta2}}}".{{/if}}
- **Signature:** After the sign-off phrase (or the closing sentence if no sign-off is provided), add one line break and then write the user's name, which you can find in the Profile Summary.
- **Tone:** Use a "{{{tone}}}" tone throughout the proposal.
{{#if wordLimit}}- **Word Count:** The proposal should be between {{{wordLimit}}} words.{{/if}}

Compose a proposal that addresses the key requirements of the job, highlights the user's relevant skills and experiences, and answers any client questions. Focus on how the user can provide value to the client. Ensure the final output is well-structured and professional.
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

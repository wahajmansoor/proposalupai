'use server';
/**
 * @fileOverview Generates a proposal based on job analysis and user profile.
 *
 * - generateProposal - A function that generates a proposal.
 * - GenerateProposalInput - The input type for the generateProposal function.
 * - GenerateProposalOutput - The return type for the generateProposal function.
 */
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GenerateProposalInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  summary: z.string().describe('The summary of the project.'),
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
  proposalTemplate: z.enum(['standard', 'video']).optional().describe("The selected proposal template, either 'standard' or 'video'."),
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
  const isVideo = input.proposalTemplate === 'video';
  const isStandard = input.proposalTemplate === 'standard' || !input.proposalTemplate;
  
  let prompt = `You are an expert proposal writer. Based on the project details and the user's profile, create a compelling proposal.

Project Title: ${input.projectTitle}
Project Summary: ${input.summary}
Profile Summary: ${input.profileSummary}
Relevant Skills: ${input.relevantSkills}
Past Successes: ${input.pastSuccesses}
Portfolio Links: ${input.portfolioLinks}

**CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE FORMATTING RULES:**
- **Greeting:** Always start with the exact greeting provided: "${input.greeting}". Capitalize the first letter. This should be followed by a single line break (\\n).
`;

  if (isVideo) {
    prompt += `
- **Video Template:** The user has selected the Video Intro template. You MUST follow this structure:
    1.  Start with the line: "Hey! I recorded a quick Loom video for you to check out:"
    2.  On the next line, add a placeholder for the URL: "[ENTER URL]"
    3.  Follow this with a paragraph break (a single \\n).
    4.  Write a paragraph based on this template, intelligently replacing placeholders like [SKILLSET] with information from the job summary and user profile: "Your project sounds exciting, and I understand how tough it can be to find the right [SKILLSET] specialist, someone reliable, motivated, and ready to get the job done right from the start."
    5.  Write another paragraph based on this template: "Unlike others who juggle too many clients and go quiet for days, I focus on a smaller, select group of clients. This allows me to work closely with you, ensuring we achieve the results you want without unnecessary stress."
    6.  Write a concluding paragraph based on this template: "If you’re looking for a dedicated, dependable partner to take this project off your plate and get it done RIGHT, let’s chat!"
    7.  Follow this with a paragraph break (a single \\n) and the heading: "Here’s how we can get started:"
    8.  List the following steps, each on a new line:
        - 1. Send me a message on Upwork
        - 2. We’ll schedule a call to discuss the details
        - 3. On the call, we’ll dive deeper into your project and plan the next steps
    9.  End the proposal by intelligently integrating the closing phrase "${input.closingCta}" into a natural-sounding final sentence.
`;
  }

  if (isStandard) {
    prompt += `
- **Standard Template:**
`;
    if (input.openingStrategy) {
      prompt += `    - **Opening Paragraph:** After the greeting, use the following "Opening Strategy" as the first paragraph. You MUST adapt the strategy to the job by intelligently replacing placeholders like [CLIENT'S NAME], [SPECIFIC TASK], or [SPECIFIC SKILL] with relevant information from the job description and user profile. Do not leave the placeholders in the final output. The opening strategy is: "${input.openingStrategy}" This should be followed by a single line break (\\n).\n`;
    }
    prompt += `    - **Body:** The main body of the proposal is the most important part. It MUST be broken into multiple paragraphs for readability. Use a single line break (\\n) to separate paragraphs. DO NOT output a single block of text. Compose a proposal that addresses the key requirements of the job and highlights the user's relevant skills and experiences. Focus on how the user can provide value to the client. Do NOT answer any specific client questions in this section.\n`;
    if (input.portfolioLinks) {
      prompt += `    - **Portfolio:** If portfolio links are provided, you must introduce them on a new line. For example, "Here are some examples of my work:". Then, you MUST list each link on its own new line.\n`;
    }
    prompt += `    - **Closing:** End the proposal by intelligently integrating the closing phrase "${input.closingCta}" into a natural-sounding final sentence.\n`;
    if (input.closingCta2) {
      prompt += `    - **Sign-off:** After the closing sentence, add a single line break (\\n) and then write the sign-off phrase: "${input.closingCta2}".\n`;
    }
    prompt += `    - **Signature:** After the sign-off phrase (or the closing sentence if no sign-off is provided), add one line break and then write the user's name, which you can find in the Profile Summary.\n`;
  }

  prompt += `
- **Tone:** Use a "${input.tone}" tone throughout the proposal.
- **Terminology**: Always use the word "website" instead of "site".
`;

  if (input.wordLimit) {
    prompt += `- **Word Count:** The proposal should be between ${input.wordLimit} words.\n`;
  }

  prompt += `
Ensure the final output is well-structured and professional. Output only the proposal text.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  const proposal = completion.choices[0].message.content;
  if (!proposal) {
    throw new Error('Failed to generate proposal.');
  }

  return { proposal };
}


'use server';
/**
 * @fileOverview Generates a proposal based on job analysis and user profile.
 *
 * - generateProposal - A function that generates a proposal.
 * - GenerateProposalInput - The input type for the generateProposal function.
 * - GenerateProposalOutput - The return type for the generateProposal function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';
import type { PortfolioLink } from '@/app/lib/types';

const linkSchema = z.object({
  title: z.string().optional(),
  url: z.string(),
});

const GenerateProposalInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  summary: z.string().describe('The summary of the project.'),
  profileSummary: z.string().describe('A summary of the user profile.'),
  userName: z.string().describe('The display name of the user.'),
  relevantSkills: z
    .string()
    .describe('A comma separated list of relevant skills for the job'),
  pastSuccesses: z
    .string()
    .describe('Description of past successes relevant to the job.'),
  profileLinks: z.array(linkSchema).optional().describe('An array of portfolio links from the user\'s skill profile.'),
  manualLinks: z.array(linkSchema).optional().describe('An array of manually added portfolio links for this specific proposal.'),
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

function formatLinks(links: PortfolioLink[] | undefined): string {
    if (!links || links.length === 0) return '';
    return links.map(link => `- ${link.title ? `${link.title}: ` : ''}${link.url}`).join('\n');
}

export async function generateProposal(
  input: GenerateProposalInput
): Promise<GenerateProposalOutput> {
  const isVideo = input.proposalTemplate === 'video';
  const isStandard = input.proposalTemplate === 'standard' || !input.proposalTemplate;
  
  const hasProfileLinks = input.profileLinks && input.profileLinks.length > 0;
  const hasManualLinks = input.manualLinks && input.manualLinks.length > 0;
  const hasAnyLinks = hasProfileLinks || hasManualLinks;

  let prompt = `You are an expert proposal writer, crafting short, impactful, and human-sounding proposals that get responses. You are writing on behalf of a user named ${input.userName}.

**CONTEXT FOR THIS PROPOSAL:**
- User's Name: ${input.userName}
- Project Title: ${input.projectTitle}
- Project Summary: ${input.summary}
- User's Profile Summary: ${input.profileSummary}
- User's Relevant Skills: ${input.relevantSkills}
- User's Relevant Experience / Past Successes: ${input.pastSuccesses}

**CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE RULES TO AVOID CREATING A BAD, AI-GENERATED PROPOSAL:**

- **TONE:** You MUST adopt a **${input.tone}** tone. Sound human, not like a robot filling a template. Avoid overly formal or "fluffy" language and jargon. Use "website" not "site".
- **GREETING:** Always start with the exact greeting provided: "${input.greeting},". This should be followed by a single line break (\n).
- **NO PLACEHOLDERS:** You MUST NOT leave any placeholders like [SPECIFIC TASK] or [INSERT LINK] in the final output. If information is missing, you must adapt and write a natural sentence without it.
- **AVOID GENERIC OPENERS:** NEVER start with "I am happy to apply...", "I am writing to express my interest...", or other generic, "watery" phrases.
- **CONCISENESS IS KEY:** Keep the entire proposal short and easy to read. Use multiple short paragraphs (2-3 sentences each) instead of long blocks of text. Respect the word limit.
- **CLIENT-FOCUSED:** Do not just talk about the user's experience. Focus on the client's problem and how the user will solve it.
- **NO BOLD FORMATTING:** Do not use bold formatting.
- **NO EMOJIS:** Do not use any emojis.
`;

  if (isVideo) {
    prompt += `
- **VIDEO TEMPLATE:** The user has selected the Video Intro template. You MUST follow this structure:
    1.  Start with the line: "Hey! I recorded a quick Loom video for you to check out:"
    2.  On the next line, add a placeholder for the URL: "[ENTER URL]"
    3.  Follow this with a paragraph break (a single \n).
    4.  Write a SHORT, natural-sounding paragraph (2-3 sentences) based on this idea, intelligently replacing placeholders like [SKILLSET] with information from the job summary and user profile: "Your project sounds exciting, and I understand how tough it can be to find the right [SKILLSET] specialist, someone reliable, motivated, and ready to get the job done right from the start."
    5.  Write another SHORT, punchy paragraph based on this idea: "Unlike others who juggle too many clients and go quiet for days, I focus on a smaller, select group of clients. This allows me to work closely with you, ensuring we achieve the results you want without unnecessary stress."
    6.  **FINAL CTA (CRITICAL):** The final paragraph MUST be a complete, natural-sounding sentence that achieves the user's goal for the call-to-action. The user's desired outcome is: "${input.closingCta}". You MUST NOT use this phrase verbatim. Instead, write an original sentence that accomplishes this goal in a human-sounding way.
    7.  **SIGNATURE (CRITICAL):** After the final CTA paragraph, add TWO line breaks (\n\n). If the user provided a sign-off phrase ("${input.closingCta2}"), write it on its own line. Then, on the VERY NEXT LINE, write the user's name: "${input.userName}".
`;
  }

  if (isStandard) {
    prompt += `
- **STANDARD TEMPLATE:**
`;
    if (input.openingStrategy && input.openingStrategy !== 'None') {
      prompt += `    - **OPENING PARAGRAPH:** Start with a powerful first paragraph based on the following strategy: "${input.openingStrategy}". You MUST adapt it to the job by intelligently replacing placeholders like [SPECIFIC TASK] or [SPECIFIC SKILL] with information from the job summary or user profile. Make it catchy and engaging. Do not leave placeholders in the final output. This should be followed by a single line break (\n).\n`;
    } else {
      prompt += `    - **OPENING PARAGRAPH:** Create a powerful, client-focused opening paragraph that immediately addresses their core need. This should be followed by a single line break (\n).\n`
    }
    prompt += `    - **BODY & PROJECT APPROACH:** The main body must be broken into multiple SHORT paragraphs (2-3 sentences each). It must show a clear understanding of the project. Based on the job summary, briefly outline a simple, logical plan for how you will tackle the project to show the client you have a process.
    - **QUESTIONS:** If you include questions, introduce them naturally with a phrase like, "I have a couple of quick questions to ensure we're on the same page:". Each question MUST be on its own new line.
`;
    if (hasAnyLinks) {
      prompt += `    - **PORTFOLIO:** Introduce the links naturally with a full sentence (e.g., "Here is some of my past work that is relevant to your project:"). Then, list ALL of the following links, with each link on a new line.\n`;
      if (hasProfileLinks) {
          prompt += `${formatLinks(input.profileLinks)}\n`;
      }
      if (hasManualLinks) {
          prompt += `${formatLinks(input.manualLinks)}\n`;
      }
    }
    prompt += `    - **FINAL CTA (CRITICAL):** The final paragraph MUST be a complete, natural-sounding sentence that achieves the user's goal for the call-to-action. The user's desired outcome is: "${input.closingCta}". You MUST NOT use this phrase verbatim. Instead, write an original sentence that accomplishes this goal in a human-sounding way.
    - **SIGNATURE (CRITICAL):** After the final CTA paragraph, add TWO line breaks (\n\n). If the user provided a sign-off phrase ("${input.closingCta2}"), write it on its own line. Then, on the VERY NEXT LINE, write the user's name: "${input.userName}".
`;
  }

  if (input.wordLimit) {
    prompt += `- **WORD COUNT (CRITICAL):** You MUST strictly adhere to the word limit. The total proposal should be between ${input.wordLimit} words. Brevity is critical.\n`;
  }

  prompt += `
Ensure the final output is well-structured, persuasive, and sounds like a confident human expert, not a generic AI.
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


'use server';
/**
 * @fileOverview Improves a generated proposal based on a specific user instruction.
 *
 * - improveProposal - A function that refines a proposal.
 * - ImproveProposalInput - The input type for the improveProposal function.
 * - ImproveProposalOutput - The return type for the improveProposal function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';

const ImproveProposalInputSchema = z.object({
  proposal: z.string().describe('The full original proposal text for context.'),
  instruction: z.string().describe('The specific instruction for how to improve the proposal (e.g., "Simplify language", "Use bullet points for the project plan").'),
  selectedText: z.string().optional().describe('The specific text selection to be improved. If not provided, the instruction applies to the whole proposal.'),
  closingCta: z.string().optional().describe("An optional updated closing call-to-action to incorporate.")
});
export type ImproveProposalInput = z.infer<typeof ImproveProposalInputSchema>;

const ImproveProposalOutputSchema = z.object({
  improvedProposal: z.string().describe('The improved version of the proposal text or an empty string if the instruction was to remove the text.'),
});
export type ImproveProposalOutput = z.infer<typeof ImproveProposalOutputSchema>;

export async function improveProposal(
  input: ImproveProposalInput
): Promise<ImproveProposalOutput> {

  const textToImprove = input.selectedText || input.proposal;

  const systemPrompt = "You are a professional proposal editor. Your goal is to follow user instructions precisely and maintain the original formatting of the text unless explicitly told otherwise.";

  let userPrompt = `**Full Proposal for Context:**
---
${input.proposal}
---

**Text to Modify:**
---
${textToImprove}
---

**User's Instruction:**
---
${input.instruction}
---

**Editing Rules:**
1.  Apply the user's instruction ONLY to the "Text to Modify".
2.  Preserve all single line breaks (\\n) and paragraph breaks (\\n\\n). Do not merge paragraphs or alter lists unless specifically instructed.
3.  If the original text contains a placeholder like "[ENTER URL]", you MUST preserve it exactly as is.
4.  Output ONLY the rewritten text — no commentary, markdown, or explanations.
5.  If the instruction is to delete or remove the text, you MUST output ONLY the token <<DELETED>>.
6.  Do not significantly change the overall length (±10%) unless the instruction is explicitly about shortening or expanding.
7.  Do not use em-dashes (—).
8.  Maintain the tone and language style of the original proposal.
`;

  if (input.closingCta && !input.selectedText) {
      userPrompt += `9.  **UPDATE CLOSING CTA:** The user has provided a new closing call-to-action idea: "${input.closingCta}". You MUST rewrite the final paragraph of the proposal to naturally incorporate this new idea.`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
  });

  const improvedProposal = completion.choices[0].message.content;
  
  if (improvedProposal?.includes('<<DELETED>>')) {
    return { improvedProposal: '' };
  }

  if (improvedProposal === null) {
    return { improvedProposal: textToImprove }; // Return original text if improvement fails
  }

  // Trim whitespace and remove potential markdown fences
  const cleanedProposal = improvedProposal.trim().replace(/^```[\s\S]*?```$/, '').trim();

  return { improvedProposal: cleanedProposal };
}

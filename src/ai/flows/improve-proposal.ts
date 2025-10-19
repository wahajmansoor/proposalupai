
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

  let prompt = `You are an expert copy editor and formatter. A user has provided a block of text and a specific instruction to improve it.

**Full Proposal for Context:**
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

**CRITICAL INSTRUCTIONS:**
1.  **EXECUTE THE INSTRUCTION:** Apply the user's instruction ONLY to the "Text to Modify".
2.  **PRESERVE ALL FORMATTING:** Your primary goal is to maintain the original text's structure.
    -   **Line Breaks & Paragraphs:** You MUST preserve all single line breaks (\n) and paragraph breaks (\n\n). Do not merge paragraphs unless explicitly asked.
    -   **Lists & Questions:** If the original text has a numbered list, bulleted list, or multiple questions, each item MUST remain on its own line.
    -   **Placeholders:** If the original text contains a placeholder like "[ENTER URL]", you MUST preserve it exactly as is.
3.  **OUTPUT ONLY THE REWRITTEN TEXT.** Your output should ONLY be the modified version of the "Text to Modify". Do not add any commentary, explanation, or markdown formatting like \`\`\`.
4.  **HANDLE DELETION:** If the instruction is to remove or delete the text, you MUST output an empty string.
5.  **MATCH WORD COUNT:** Adhere closely to the word count of the original text selection unless the instruction is specifically about length (e.g., "make it shorter").
6.  **NO EM-DASHES:** Do not use em-dashes (—) in your response.
`;

  if (input.closingCta && !input.selectedText) {
      prompt += `7.  **UPDATE CLOSING CTA:** The user has provided a new closing call-to-action idea: "${input.closingCta}". You MUST rewrite the final paragraph of the proposal to naturally incorporate this new idea.`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  const improvedProposal = completion.choices[0].message.content;
  if (improvedProposal === null) {
    // This can happen if the AI is instructed to delete the text.
    return { improvedProposal: '' };
  }

  // Trim whitespace and remove potential markdown fences
  const cleanedProposal = improvedProposal.trim().replace(/^```[\s\S]*?```$/, '').trim();

  return { improvedProposal: cleanedProposal };
}

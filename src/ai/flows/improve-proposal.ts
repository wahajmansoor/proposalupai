
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
  proposal: z.string().describe('The original proposal text or text selection to be improved.'),
  instruction: z.string().describe('The specific instruction for how to improve the proposal (e.g., "Simplify language", "Use bullet points for the project plan"). This may include the full proposal for context.'),
});
export type ImproveProposalInput = z.infer<typeof ImproveProposalInputSchema>;

const ImproveProposalOutputSchema = z.object({
  improvedProposal: z.string().describe('The improved version of the proposal text or an empty string if the instruction was to remove the text.'),
});
export type ImproveProposalOutput = z.infer<typeof ImproveProposalOutputSchema>;

export async function improveProposal(
  input: ImproveProposalInput
): Promise<ImproveProposalOutput> {
  const prompt = `You are an expert copy editor and formatter. A user has provided a block of text and a specific instruction to improve it.

**Full Text for Context:**
---
${input.proposal}
---

**User's Instruction:**
---
${input.instruction}
---

**CRITICAL INSTRUCTIONS:**
1.  **EXECUTE THE INSTRUCTION:** Apply the user's instruction ONLY to the specified part of the text.
2.  **PRESERVE ALL FORMATTING:** Your primary goal is to maintain the original text's structure.
    -   **Line Breaks:** You MUST preserve all single line breaks (\n) and paragraph breaks (\n\n).
    -   **Lists:** If the original text has a numbered or bulleted list, each item MUST remain on its own line.
    -   **Questions:** If there are multiple questions, ensure each one stays on its own separate line.
3.  **OUTPUT ONLY THE REWRITTEN TEXT.** Do not add any commentary, explanation, or markdown formatting like \`\`\`. Your output should be only the modified text itself, ready to be dropped back into the original document.
4.  **HANDLE DELETION:** If the instruction is to remove or delete the text, you MUST output an empty string.
5.  **MATCH THE WORD COUNT:** Adhere closely to the word count of the original text selection unless the instruction is specifically about length (e.g., "make it shorter").
`;

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

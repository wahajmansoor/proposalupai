
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
  const prompt = `${input.instruction}

Your output should ONLY be the rewritten text. Do not add any commentary, explanation, or markdown formatting like \`\`\`.
If you are rewriting a selection from a larger text, only output the new version of that selection.
If the instruction is to remove or delete the text, you MUST output an empty string.
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

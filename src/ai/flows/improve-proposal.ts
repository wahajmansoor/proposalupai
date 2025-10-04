
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
  proposal: z.string().describe('The original proposal text to be improved.'),
  instruction: z.string().describe('The specific instruction for how to improve the proposal (e.g., "Simplify language", "Use bullet points for the project plan").'),
});
export type ImproveProposalInput = z.infer<typeof ImproveProposalInputSchema>;

const ImproveProposalOutputSchema = z.object({
  improvedProposal: z.string().describe('The improved version of the proposal.'),
});
export type ImproveProposalOutput = z.infer<typeof ImproveProposalOutputSchema>;

export async function improveProposal(
  input: ImproveProposalInput
): Promise<ImproveProposalOutput> {
  const prompt = `You are an expert proposal writing assistant. A user has generated a proposal and now wants to improve it.

Your task is to rewrite the provided proposal based on the user's specific instruction. Adhere to the core principles of good proposal writing: be client-focused, concise, and sound human.

**Original Proposal:**
${input.proposal}

**User's Improvement Instruction:** "${input.instruction}"

Rewrite the proposal according to this instruction, ensuring the final output maintains a professional and persuasive tone. Do not add any commentary or explanation, only output the improved proposal text.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  const improvedProposal = completion.choices[0].message.content;
  if (!improvedProposal) {
    throw new Error('Failed to improve the proposal.');
  }

  return { improvedProposal };
}

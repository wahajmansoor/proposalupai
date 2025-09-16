'use server';
/**
 * @fileOverview This file defines a Genkit flow for automatically filling proposal sections like Skills & Expertise based on job description analysis.
 *
 * - autofillProposalSections - A function that handles the proposal section autofill process.
 * - AutofillProposalSectionsInput - The input type for the autofillProposalSections function.
 * - AutofillProposalSectionsOutput - The return type for the autofillProposalSections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutofillProposalSectionsInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project being applied for.'),
  summary: z.string().describe('The full project summary text.'),
  profileInformation: z.string().describe('Information about the user profile, including skills and experience.'),
});
export type AutofillProposalSectionsInput = z.infer<typeof AutofillProposalSectionsInputSchema>;

const AutofillProposalSectionsOutputSchema = z.object({
  skillsAndExpertise: z.array(z.string()).describe('A list of relevant skills and expertise.'),
});
export type AutofillProposalSectionsOutput = z.infer<typeof AutofillProposalSectionsOutputSchema>;

export async function autofillProposalSections(input: AutofillProposalSectionsInput): Promise<AutofillProposalSectionsOutput> {
  return autofillProposalSectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autofillProposalSectionsPrompt',
  input: {schema: AutofillProposalSectionsInputSchema},
  output: {schema: AutofillProposalSectionsOutputSchema},
  prompt: `You are an AI expert in proposal writing. Your task is to analyze the project summary and the user's profile information to automatically extract relevant skills.

Project Title: {{{projectTitle}}}
Summary: {{{summary}}}
Profile Information: {{{profileInformation}}}

Based on the project summary, identify the key skills and expertise required. Cross-reference these requirements with the user's profile information.
Output a list of the most relevant skills as short, one or two-word tags (e.g., "React", "Project Management").
`,
});

const autofillProposalSectionsFlow = ai.defineFlow(
  {
    name: 'autofillProposalSectionsFlow',
    inputSchema: AutofillProposalSectionsInputSchema,
    outputSchema: AutofillProposalSectionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

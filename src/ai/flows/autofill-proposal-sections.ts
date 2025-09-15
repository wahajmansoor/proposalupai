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
  jobTitle: z.string().describe('The title of the job being applied for.'),
  jobDescription: z.string().describe('The full job description text.'),
  profileInformation: z.string().describe('Information about the user profile, including skills and experience.'),
});
export type AutofillProposalSectionsInput = z.infer<typeof AutofillProposalSectionsInputSchema>;

const AutofillProposalSectionsOutputSchema = z.object({
  skillsAndExpertise: z.string().describe('A detailed section with relevant skills and expertise extracted from the job description and matched with the user profile.'),
});
export type AutofillProposalSectionsOutput = z.infer<typeof AutofillProposalSectionsOutputSchema>;

export async function autofillProposalSections(input: AutofillProposalSectionsInput): Promise<AutofillProposalSectionsOutput> {
  return autofillProposalSectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autofillProposalSectionsPrompt',
  input: {schema: AutofillProposalSectionsInputSchema},
  output: {schema: AutofillProposalSectionsOutputSchema},
  prompt: `You are an AI expert in proposal writing. Your task is to analyze the job description and the user's profile information to automatically fill the Skills & Expertise section of a proposal.

Job Title: {{{jobTitle}}}
Job Description: {{{jobDescription}}}
Profile Information: {{{profileInformation}}}

Based on the job description, identify the key skills and expertise required. Then, cross-reference these requirements with the user's profile information to create a compelling Skills & Expertise section for the proposal. Focus on highlighting the skills and experiences that directly address the job requirements.

Skills & Expertise:
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

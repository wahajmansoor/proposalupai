'use server';
/**
 * @fileOverview This file defines a function for automatically filling proposal sections like Skills & Expertise based on job description analysis.
 *
 * - autofillProposalSections - A function that handles the proposal section autofill process.
 * - AutofillProposalSectionsInput - The input type for the autofillProposalSections function.
 * - AutofillProposalSectionsOutput - The return type for the autofillProposalSections function.
 */
import { openai } from '@/lib/openai';
import { z } from 'zod';

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
  const prompt = `You are an AI expert in proposal writing. Your task is to analyze the project summary and the user's profile information to automatically extract relevant skills.

Project Title: ${input.projectTitle}
Summary: ${input.summary}
Profile Information: ${input.profileInformation}

Based on the project summary, identify the key skills and expertise required. Cross-reference these requirements with the user's profile information.
Output a comma-separated string of the most relevant skills (e.g., "React, Project Management, Node.js").
`;
  
  const SkillsSchema = z.object({
    skills: z
      .string()
      .describe('A comma-separated string of relevant skills.'),
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    tools: [
      {
        type: 'function',
        function: {
          name: 'extract_skills',
          description: 'Extracts relevant skills from text.',
          parameters: SkillsSchema.openapi('Skills'),
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'extract_skills' } },
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];
  if (toolCall?.function.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    const parsedSkills = SkillsSchema.parse(args);
    const skillsArray = parsedSkills.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
    return { skillsAndExpertise: skillsArray };
  }

  return { skillsAndExpertise: [] };
}

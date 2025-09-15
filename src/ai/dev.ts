import { config } from 'dotenv';
config();

import '@/ai/genkit';
import '@/ai/flows/suggest-introduction-strategies.ts';
import '@/ai/flows/generate-proposal-from-job-analysis.ts';
import '@/ai/flows/analyze-job-for-proposal.ts';
import '@/ai/flows/autofill-proposal-sections.ts';
import '@/ai/flows/answer-client-questions.ts';
import '@/ai/flows/suggest-proposal-template.ts';

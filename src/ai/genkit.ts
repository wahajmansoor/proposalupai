import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';
import {vertexAI} from '@genkit-ai/vertexai';
import {openAI} from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    firebase(),
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    googleAI({
      apiVersion: ['v1beta'],
    }),
    vertexAI({
      location: 'us-central1',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
  defaultModel: {
    name: 'openai/gpt-4o-mini',
  },
});

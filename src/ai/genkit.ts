import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';
import {vertexAI} from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: ['v1beta'],
    }),
    vertexAI({
      location: 'us-central1',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});


import OpenAI from 'openai';

let openaiInstance: OpenAI;

function getOpenAIInstance() {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API key. Please add it to your .env file.');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// We are exporting the client instance directly
export const openai = getOpenAIInstance();

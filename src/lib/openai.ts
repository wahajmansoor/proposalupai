import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key. Please add it to your .env file.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

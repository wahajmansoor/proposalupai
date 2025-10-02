import OpenAI from 'openai';

let openai: OpenAI;

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OpenAI API key. The app will run but AI features will fail. Please add it to your .env file.');
  // @ts-ignore
  openai = undefined;
} else {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

export { openai };

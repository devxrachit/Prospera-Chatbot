import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function embedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required for document embeddings. ' +
        'Set it in .env.local even if using a different chat provider.',
    );
  }
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  });
  return embedding;
}

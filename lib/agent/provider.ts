import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';

/**
 * Returns the active language model based on AI_PROVIDER + AI_MODEL env vars.
 * Swap providers by changing two env vars — no code changes needed.
 */
export function getModel(): LanguageModelV1 {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic') as string;
  const model = process.env.AI_MODEL ?? 'claude-sonnet-4-6';

  switch (provider) {
    case 'anthropic':
      return anthropic(model);
    case 'openai':
      return openai(model);
    case 'google':
      return google(model) as LanguageModelV1;
    default:
      throw new Error(`Unknown AI provider: ${provider}. Set AI_PROVIDER=anthropic|openai|google`);
  }
}

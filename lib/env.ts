import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid postgres:// URL'),
    REDIS_URL: z.string().url('REDIS_URL must be a valid redis:// URL'),

    // Auth.js v5 uses AUTH_SECRET (NEXTAUTH_SECRET also accepted as alias)
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.string().url().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),

    // AI provider selection
    AI_PROVIDER: z.enum(['anthropic', 'openai', 'google']).default('anthropic'),
    AI_MODEL: z.string().default('claude-sonnet-4-6'),

    // Provider API keys — at least one must be set in production
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

    // Tool API keys (all optional — tools degrade gracefully without them)
    TAVILY_API_KEY: z.string().optional(), // web search (https://tavily.com)
  },

  client: {
    // No client-side secrets — ever.
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

// Minimal env vars so @t3-oss/env-nextjs validation passes in tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.AUTH_SECRET = 'test-secret-value-minimum-32-characters-long!!';
process.env.AI_PROVIDER = 'anthropic';
process.env.AI_MODEL = 'claude-sonnet-4-6';

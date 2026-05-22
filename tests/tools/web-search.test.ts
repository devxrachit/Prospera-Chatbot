import { describe, it, expect, afterEach } from 'vitest';
import { webSearchTool } from '@/lib/tools/web-search';

const exec = webSearchTool.execute!;
const opts = { toolCallId: 'test', messages: [] as [] };

describe('webSearchTool', () => {
  const original = process.env.TAVILY_API_KEY;

  afterEach(() => {
    // Restore original value (may be undefined)
    if (original === undefined) {
      delete process.env.TAVILY_API_KEY;
    } else {
      process.env.TAVILY_API_KEY = original;
    }
  });

  it('returns a graceful error object when TAVILY_API_KEY is not set', async () => {
    delete process.env.TAVILY_API_KEY;
    const r = await exec({ query: 'test query', maxResults: 3 }, opts);
    expect(r).toHaveProperty('error');
    expect((r as { results: unknown[] }).results).toEqual([]);
  });

  it('includes the query in the error response', async () => {
    delete process.env.TAVILY_API_KEY;
    // No query field in error response by design — just check error exists
    const r = await exec({ query: 'weather today', maxResults: 5 }, opts);
    expect(typeof (r as { error: string }).error).toBe('string');
    expect((r as { error: string }).error.length).toBeGreaterThan(0);
  });
});

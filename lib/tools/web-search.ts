import { tool } from 'ai';
import { z } from 'zod';

const resultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

export const webSearchTool = tool({
  description:
    'Search the web for current information. Use when asked about recent events, live data, or anything outside your training data. Returns relevant snippets with source URLs.',
  parameters: z.object({
    query: z.string().describe('Concise search query (3-10 words recommended)'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(8)
      .default(5)
      .describe('Number of results to return'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return {
        error:
          'Web search is not configured. Set TAVILY_API_KEY to enable live web search.',
        results: [],
      };
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return { error: `Search API returned ${response.status}`, results: [] };
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ title: string; url: string; content?: string }>;
    };

    return {
      answer: data.answer ?? null,
      results: (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 600) ?? '',
      })),
      query,
    };
  },
});

export type WebSearchResult = z.infer<typeof resultSchema>;

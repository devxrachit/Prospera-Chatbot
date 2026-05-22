import { describe, it, expect, vi, beforeEach } from 'vitest';

// All mocks must be declared before any imports that transitively load these modules
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/client', () => ({ db: {}, pool: {} }));
vi.mock('@/lib/agent/provider', () => ({ getModel: vi.fn() }));
vi.mock('@/lib/tools', () => ({
  webSearchTool: {},
  codeSandboxTool: {},
  weatherTool: {},
  createRagTool: () => ({}),
}));
vi.mock('ai', () => ({ streamText: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true, limit: 20, remaining: 19, retryAfter: 60 }),
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when the request is unauthenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null as unknown as Awaited<ReturnType<typeof auth>>);

    const { POST } = await import('@/app/api/chat/route');

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], conversationId: 'cid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as unknown as Awaited<ReturnType<typeof auth>>);

    const { checkRateLimit } = await import('@/lib/rate-limit');
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ ok: false, limit: 20, remaining: 0, retryAfter: 60 });

    const { POST } = await import('@/app/api/chat/route');

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], conversationId: 'cid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});

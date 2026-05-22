import { streamText } from 'ai';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { getModel } from '@/lib/agent/provider';
import { webSearchTool, codeSandboxTool, weatherTool, createRagTool } from '@/lib/tools';
import { db } from '@/lib/db/client';
import { conversations, messages as messagesTable } from '@/lib/db/schema';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 120; // multi-step tool loops can take time

const SYSTEM_PROMPT = `\
You are Prospera — an intelligent, agentic AI assistant. You have access to powerful tools and use them autonomously when needed.

## Your tools
- **webSearch**: Search the web for current information, news, or anything outside your training data. Always cite the URLs from results.
- **executeCode**: Run JavaScript for precise calculations, data transforms, algorithm demos, or any computation. Use this instead of mental math.
- **getWeather**: Get real-time weather for any location.
- **ragSearch**: Search the user's uploaded documents. Use this when asked about files the user has shared, personal documents, or uploaded content.

## How to work
1. Break complex questions into steps and use tools as needed.
2. Chain tools freely within a single turn — e.g., search → extract data → compute.
3. When web searching, synthesise results into a coherent answer and always include source links.
4. For code execution, show the code you ran and explain the output.
5. Be concise but complete. Use markdown for structure, code blocks for code.
6. If a tool fails or returns an error, tell the user and reason from what you know.

Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limit: 20 messages / 60 s per user
  const { ok, remaining, retryAfter } = await checkRateLimit(`chat:${session.user.id}`);
  if (!ok) {
    return new Response('Too many requests. Please wait before sending another message.', {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  }

  const body = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
    conversationId: string;
  };

  const { messages, conversationId } = body;
  if (!conversationId) return new Response('conversationId required', { status: 400 });

  // Ownership check
  const convo = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, session.user.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!convo) return new Response('Not found', { status: 404 });

  // Persist the new user message (last in array)
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === 'user') {
    const content = typeof lastMsg.content === 'string' ? lastMsg.content : '';
    await db.insert(messagesTable).values({ conversationId, role: 'user', content });

    // Auto-title on first user message
    if (messages.filter((m) => m.role === 'user').length === 1 && content) {
      await db
        .update(conversations)
        .set({ title: content.slice(0, 60), updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  }

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: messages as Parameters<typeof streamText>[0]['messages'],
    tools: {
      webSearch: webSearchTool,
      executeCode: codeSandboxTool,
      getWeather: weatherTool,
      ragSearch: createRagTool(session.user.id),
    },
    maxSteps: 6,
    onFinish: async ({ text, steps }) => {
      // Build parts array: all tool calls + results from every step, then final text
      const parts: unknown[] = [];

      for (const step of steps ?? []) {
        for (const tc of (step.toolCalls ?? []) as Array<{
          toolCallId: string;
          toolName: string;
          args: unknown;
        }>) {
          parts.push({ type: 'tool-call', toolCallId: tc.toolCallId, toolName: tc.toolName, args: tc.args });
        }
        for (const tr of (step.toolResults ?? []) as Array<{
          toolCallId: string;
          toolName: string;
          result: unknown;
        }>) {
          parts.push({ type: 'tool-result', toolCallId: tr.toolCallId, toolName: tr.toolName, result: tr.result });
        }
      }

      if (text) parts.push({ type: 'text', text });

      await db.insert(messagesTable).values({
        conversationId,
        role: 'assistant',
        content: text || null,
        parts: parts.length > 0 ? parts : null,
      });

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    },
  });

  return result.toDataStreamResponse();
}

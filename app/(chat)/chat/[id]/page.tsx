import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import type { Message as AIMessage } from 'ai';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { conversations, messages } from '@/lib/db/schema';
import { Chat } from '@/components/chat/chat';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const { id } = await params;

  const convo = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!convo) redirect('/');

  const dbMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  type StoredPart =
    | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown> }
    | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
    | { type: 'text'; text: string };

  const initialMessages: AIMessage[] = dbMessages.map((m) => {
    const parts = (m.parts ?? []) as StoredPart[];

    const toolCallMap = new Map<string, StoredPart & { type: 'tool-call' }>();
    for (const p of parts) {
      if (p.type === 'tool-call') toolCallMap.set(p.toolCallId, p);
    }

    const toolInvocations = parts
      .filter((p): p is StoredPart & { type: 'tool-result' } => p.type === 'tool-result')
      .map((tr) => ({
        state: 'result' as const,
        toolCallId: tr.toolCallId,
        toolName: tr.toolName,
        args: toolCallMap.get(tr.toolCallId)?.args ?? {},
        result: tr.result,
      }));

    return {
      id: m.id,
      role: m.role as AIMessage['role'],
      content: m.content ?? '',
      createdAt: m.createdAt,
      ...(toolInvocations.length > 0 && { toolInvocations }),
    };
  });

  return (
    <Chat
      conversationId={id}
      initialMessages={initialMessages}
      conversationTitle={convo.title}
    />
  );
}

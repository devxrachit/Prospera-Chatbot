import { and, asc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { conversations, messages } from '@/lib/db/schema';

async function getOwned(id: string, userId: string) {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const convo = await getOwned(id, session.user.id);
  if (!convo) return new Response('Not found', { status: 404 });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return Response.json({ conversation: convo, messages: msgs });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const convo = await getOwned(id, session.user.id);
  if (!convo) return new Response('Not found', { status: 404 });

  const { title } = (await req.json()) as { title?: string };
  if (!title?.trim()) return new Response('title required', { status: 400 });

  const [updated] = await db
    .update(conversations)
    .set({ title: title.trim().slice(0, 100), updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const convo = await getOwned(id, session.user.id);
  if (!convo) return new Response('Not found', { status: 404 });

  await db.delete(conversations).where(eq(conversations.id, id));
  return new Response(null, { status: 204 });
}

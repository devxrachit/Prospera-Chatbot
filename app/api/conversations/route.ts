import { eq, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(100);

  return Response.json(rows);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const [convo] = await db
    .insert(conversations)
    .values({ userId: session.user.id })
    .returning();

  return Response.json(convo, { status: 201 });
}

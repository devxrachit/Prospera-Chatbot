import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';

export default async function ChatHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  // Redirect to most recent conversation, or create a new one
  const recent = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (recent) {
    redirect(`/chat/${recent.id}`);
  }

  // No conversations yet — create one
  const [fresh] = await db
    .insert(conversations)
    .values({ userId: session.user.id })
    .returning({ id: conversations.id });

  redirect(`/chat/${fresh.id}`);
}

import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { conversations } from '@/lib/db/schema';
import { Sidebar } from '@/components/layout/sidebar';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const userConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(100);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        conversations={userConversations}
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

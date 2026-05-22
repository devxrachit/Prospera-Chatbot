import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { DocumentsPage } from '@/components/documents/documents-page';

export const metadata = { title: 'Documents — Prospera' };

export default async function DocumentsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, session.user.id))
    .orderBy(desc(documents.createdAt));

  return <DocumentsPage initialDocuments={docs} />;
}

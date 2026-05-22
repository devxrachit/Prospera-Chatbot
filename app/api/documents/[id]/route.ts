import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { deleteStoredFile } from '@/lib/storage';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1);

  if (!doc) return new Response('Not found', { status: 404 });

  await deleteStoredFile(doc.storageKey);
  await db.delete(documents).where(eq(documents.id, id));

  return new Response(null, { status: 204 });
}

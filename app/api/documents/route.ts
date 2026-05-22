import { desc, eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { saveFile } from '@/lib/storage';
import { INGESTION_QUEUE, type IngestionJobData } from '@/lib/queue';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

function getQueue() {
  const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  return new Queue<IngestionJobData>(INGESTION_QUEUE, { connection });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, session.user.id))
    .orderBy(desc(documents.createdAt));

  return Response.json(docs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return new Response('No file provided', { status: 400 });
  if (file.size > MAX_SIZE) return new Response('File too large (max 10 MB)', { status: 413 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response('Unsupported file type. Upload PDF, TXT, or Markdown.', { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = await saveFile(buffer, file.name);

  const [doc] = await db
    .insert(documents)
    .values({
      userId: session.user.id,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      storageKey,
      status: 'pending',
    })
    .returning();

  const queue = getQueue();
  await queue.add('ingest', {
    documentId: doc.id,
    userId: session.user.id,
    storageKey,
    mimeType: file.type,
  });
  await queue.close();

  return Response.json(doc, { status: 201 });
}

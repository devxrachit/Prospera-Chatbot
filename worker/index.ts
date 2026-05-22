import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import { documents, documentChunks } from '../lib/db/schema';
import { readStoredFile } from '../lib/storage';
import { embedText } from '../lib/embeddings';
import { INGESTION_QUEUE, type IngestionJobData } from '../lib/queue';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://prospera:prospera@localhost:5432/prospera';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
const db = drizzle(pool, { schema });

function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    type PdfParseFn = (buf: Buffer) => Promise<{ text: string }>;
    // pdf-parse is CommonJS; the module itself is the callable function
    const pdfParse = (await import('pdf-parse')) as unknown as PdfParseFn;
    const data = await pdfParse(buffer);
    return data.text;
  }
  return buffer.toString('utf-8');
}

const worker = new Worker<IngestionJobData>(
  INGESTION_QUEUE,
  async (job) => {
    const { documentId, userId, storageKey, mimeType } = job.data;
    console.log(`[worker] ingesting document ${documentId}`);

    await db
      .update(documents)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    try {
      const buffer = await readStoredFile(storageKey);
      const text = await extractText(buffer, mimeType);
      const chunks = chunkText(text);

      console.log(`[worker] ${chunks.length} chunks — embedding...`);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedText(chunks[i]);
        await db.insert(documentChunks).values({
          documentId,
          userId,
          content: chunks[i],
          chunkIndex: i,
          embedding,
        });
      }

      await db
        .update(documents)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      console.log(`[worker] document ${documentId} ready (${chunks.length} chunks)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[worker] document ${documentId} failed:`, errorMessage);
      await db
        .update(documents)
        .set({ status: 'failed', errorMessage, updatedAt: new Date() })
        .where(eq(documents.id, documentId));
    }
  },
  { connection, concurrency: 2 },
);

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

connection.on('connect', () => {
  console.log('[worker] connected to Redis — ingestion queue active');
});

process.on('SIGTERM', async () => {
  await worker.close();
  await connection.quit();
  await pool.end();
  process.exit(0);
});

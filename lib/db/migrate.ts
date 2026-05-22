// Load .env.local first (Next.js convention), fallback to .env
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import path from 'path';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // pgvector extension must exist before running schema migrations
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('pgvector extension ready');

    const db = drizzle(pool);

    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'drizzle'),
    });

    // HNSW index for cosine-similarity RAG retrieval (idempotent)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    console.log('HNSW index ready');

    console.log('Migrations complete');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

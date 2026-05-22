import { tool } from 'ai';
import { z } from 'zod';
import { pool } from '@/lib/db/client';
import { embedText } from '@/lib/embeddings';

export function createRagTool(userId: string) {
  return tool({
    description:
      "Search the user's uploaded documents for information relevant to the query. " +
      'Use this when asked about uploaded files, personal documents, or content the user has shared. ' +
      "Do NOT use for general knowledge — only for the user's own documents.",
    parameters: z.object({
      query: z.string().describe('Natural language search query describing what to look for'),
    }),
    execute: async ({ query }) => {
      try {
        const queryEmbedding = await embedText(query);
        const vectorStr = `[${queryEmbedding.join(',')}]`;

        const { rows } = await pool.query<{
          content: string;
          document_name: string;
          similarity: string;
        }>(
          `SELECT dc.content,
                  d.name  AS document_name,
                  1 - (dc.embedding <=> $1::vector) AS similarity
           FROM   document_chunks dc
           JOIN   documents d ON dc.document_id = d.id
           WHERE  dc.user_id = $2
             AND  d.status   = 'ready'
           ORDER BY dc.embedding <=> $1::vector
           LIMIT 5`,
          [vectorStr, userId],
        );

        return {
          chunks: rows.map((r) => ({
            content: r.content,
            documentName: r.document_name,
            similarity: Math.round(parseFloat(r.similarity) * 100) / 100,
          })),
          query,
        };
      } catch (error) {
        return { error: String(error), chunks: [], query };
      }
    },
  });
}

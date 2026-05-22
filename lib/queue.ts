export const INGESTION_QUEUE = 'document-ingestion';

export interface IngestionJobData {
  documentId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
}

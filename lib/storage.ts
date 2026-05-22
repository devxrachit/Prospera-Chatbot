import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function saveFile(buffer: Buffer, originalName: string): Promise<string> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(originalName);
  const key = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOADS_DIR, key), buffer);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(path.join(UPLOADS_DIR, key));
}

export async function deleteStoredFile(key: string): Promise<void> {
  try {
    await unlink(path.join(UPLOADS_DIR, key));
  } catch {
    // file may already be gone
  }
}

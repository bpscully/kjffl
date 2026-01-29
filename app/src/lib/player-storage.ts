import * as fs from 'fs/promises';
import * as path from 'path';
import { PlayerIndexItem } from '@/app/api/admin/generate-index/route';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const INDEX_FILE = path.join(DATA_DIR, 'players-index.json');

/**
 * Abstracted storage for the Player Index.
 * Currently uses local filesystem (fs).
 * In the future, this can be swapped for Vercel Blob or S3.
 */

export async function savePlayerIndex(data: PlayerIndexItem[]): Promise<void> {
  // Ensure directory exists
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  await fs.writeFile(INDEX_FILE, JSON.stringify(data, null, 2));
}

export async function loadPlayerIndex(): Promise<PlayerIndexItem[]> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load player index, returning empty list.', error);
    return [];
  }
}

import { promises as fs } from 'fs';
import { Dirent } from 'fs';
import path from 'path';

export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

export async function readDirectory(dirPath: string): Promise<Dirent[]> {
  return await fs.readdir(dirPath, { withFileTypes: true });
}

export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

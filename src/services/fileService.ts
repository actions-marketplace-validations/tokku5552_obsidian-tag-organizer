import yaml from 'js-yaml';
import { ActionInputs, FrontMatter, TargetFile } from '../types';
import { readFile, readDirectory, joinPath } from '../infrastructure/files';
import { extractFrontMatter } from './frontMatterService';

export async function getAllFiles(props: ActionInputs): Promise<string[]> {
  const { targetFolder, excludeFolders } = props;
  const entries = await readDirectory(targetFolder);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = joinPath(targetFolder, entry.name);

    if (entry.isDirectory()) {
      if (!excludeFolders.includes(entry.name)) {
        const subFiles = await getAllFiles({
          ...props,
          targetFolder: fullPath,
        });
        files.push(...subFiles);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function getTargetFiles(
  filePaths: string[],
  skipInvalidFrontmatter: boolean
): Promise<TargetFile[]> {
  const targetFiles: TargetFile[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath);
    if (!content) {
      console.log(`Skipping ${filePath} due to missing content`);
      continue;
    }

    try {
      const frontMatter = extractFrontMatter(content);
      if (!frontMatter) {
        if (skipInvalidFrontmatter) {
          console.log(`Skipping ${filePath} due to invalid front matter`);
          continue;
        }
        throw new Error(`Invalid front matter in ${filePath}`);
      }

      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) {
        if (skipInvalidFrontmatter) {
          console.log(`Skipping ${filePath} due to missing front matter delimiters`);
          continue;
        }
        throw new Error(`Missing front matter delimiters in ${filePath}`);
      }

      let originalFrontMatter: FrontMatter;
      try {
        originalFrontMatter = yaml.load(match[1]) as FrontMatter;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (skipInvalidFrontmatter) {
          console.log(`Skipping ${filePath} due to YAML parsing error: ${errorMessage}`);
          continue;
        }
        throw new Error(`YAML parsing error in ${filePath}: ${errorMessage}`);
      }

      if (originalFrontMatter.tags && originalFrontMatter.tags.length >= 5) {
        console.log(`Skipping ${filePath} as it already has 5 or more tags`);
        continue;
      }

      targetFiles.push({ filePath, content, originalFrontMatter });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (skipInvalidFrontmatter) {
        console.log(`Skipping ${filePath} due to error: ${errorMessage}`);
        continue;
      }
      throw error;
    }
  }

  return targetFiles;
}

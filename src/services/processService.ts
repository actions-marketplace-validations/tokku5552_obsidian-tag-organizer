import { OpenAI } from 'openai';
import yaml from 'js-yaml';
import { TagChange, FrontMatter } from '../types';
import { readFile, writeFile, readDirectory, joinPath } from './fileService';
import { extractFrontMatter } from './frontMatterService';
import { analyzeContentWithAI } from './aiService';

/**
 * ファイル一覧を取得
 * @param dirPath ディレクトリパス
 * @param excludeFolders 除外フォルダ
 * @returns ファイル一覧
 */
export async function getFileList(dirPath: string, excludeFolders: string[]): Promise<string[]> {
  const entries = await readDirectory(dirPath);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = joinPath(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!excludeFolders.includes(entry.name)) {
        const subFiles = await getFileList(fullPath, excludeFolders);
        files.push(...subFiles);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 処理対象ファイルの抽出
export async function getTargetFiles(
  filePaths: string[],
  skipInvalidFrontmatter: boolean
): Promise<{ filePath: string; content: string; originalFrontMatter: FrontMatter }[]> {
  const targetFiles: { filePath: string; content: string; originalFrontMatter: FrontMatter }[] = [];

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

export async function processFile(
  filePath: string,
  content: string,
  originalFrontMatter: FrontMatter,
  openai: OpenAI,
  forbiddenTags: string[],
  model: string,
  temperature: number
): Promise<TagChange[] | null> {
  const suggestions = await analyzeContentWithAI(
    content,
    openai,
    forbiddenTags,
    model,
    temperature
  );

  if (!suggestions) return null;

  const uniqueOriginalTags = Array.from(new Set(originalFrontMatter.tags || []));

  const remainingSlots = 5 - uniqueOriginalTags.length;

  if (remainingSlots <= 0) {
    console.log(`Skipping ${filePath} as it already has 5 or more tags`);
    return null;
  }

  const uniqueSuggestions = Array.from(new Set(suggestions.map((s) => s.suggested)))
    .map((suggested) => suggestions.find((s) => s.suggested === suggested)!)
    .filter((suggestion) => !uniqueOriginalTags.includes(suggestion.suggested))
    .slice(0, remainingSlots);

  const newTags = new Set<string>(uniqueSuggestions.slice(0, 5).map((s) => s.suggested));

  const changes: TagChange[] = Array.from(newTags).map((tag) => ({
    file: filePath,
    oldTag: '',
    newTag: tag,
  }));

  for (const suggestion of uniqueSuggestions) {
    if (newTags.size >= 5) break;
    newTags.add(suggestion.suggested);
    changes.push({
      file: filePath,
      oldTag: '',
      newTag: suggestion.suggested,
    });
  }

  if (changes.length > 0) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const originalFrontMatterStr = match ? match[1] : '';

    const updatedFrontMatterStr = originalFrontMatterStr.replace(
      /^tags:.*$/m,
      `tags:\n${Array.from(newTags)
        .map((tag) => `  - "${tag}"`)
        .join('\n')}`
    );

    const newContent = content.replace(
      /^---\n([\s\S]*?)\n---/m,
      `---\n${updatedFrontMatterStr}\n---`
    );

    await writeFile(filePath, newContent);
  }

  return changes;
}

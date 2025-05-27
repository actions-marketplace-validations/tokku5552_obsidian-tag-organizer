import { OpenAI } from 'openai';
import yaml from 'js-yaml';
import { TagChange, FrontMatter } from '../types';
import { readFile, writeFile, readDirectory, joinPath } from './fileService';
import { extractFrontMatter } from './frontMatterService';
import { analyzeContentWithAI } from './aiService';

export async function processFile(
  filePath: string,
  openai: OpenAI,
  forbiddenTags: string[],
  model: string,
  temperature: number,
  skipInvalidFrontmatter: boolean
): Promise<TagChange[] | null> {
  const content = await readFile(filePath);
  if (!content) return null;

  if (filePath.toLowerCase().includes('readme.md')) {
    console.log(`Skipping ${filePath} as it is a README file`);
    return null;
  }

  try {
    const frontMatter = extractFrontMatter(content);
    if (!frontMatter) {
      if (skipInvalidFrontmatter) {
        console.log(`Skipping ${filePath} due to invalid front matter`);
        return null;
      }
      throw new Error(`Invalid front matter in ${filePath}`);
    }

    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      if (skipInvalidFrontmatter) {
        console.log(`Skipping ${filePath} due to missing front matter delimiters`);
        return null;
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
        return null;
      }
      throw new Error(`YAML parsing error in ${filePath}: ${errorMessage}`);
    }

    if (originalFrontMatter.tags && originalFrontMatter.tags.length >= 5) {
      console.log(`Skipping ${filePath} as it already has 5 or more tags`);
      return null;
    }

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
      const originalFrontMatterStr = match[1];

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (skipInvalidFrontmatter) {
      console.log(`Skipping ${filePath} due to error: ${errorMessage}`);
      return null;
    }
    throw error;
  }
}

export async function processDirectory(
  dirPath: string,
  excludeFolders: string[],
  openai: OpenAI,
  forbiddenTags: string[],
  model: string,
  temperature: number,
  skipInvalidFrontmatter: boolean
): Promise<TagChange[]> {
  const changes: TagChange[] = [];
  const entries = await readDirectory(dirPath);
  let processedFileCount = 0;
  const MAX_FILES = 5;
  let reachedMaxFiles = false;

  for (const entry of entries) {
    const fullPath = joinPath(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!excludeFolders.includes(entry.name)) {
        const subChanges = await processDirectory(
          fullPath,
          excludeFolders,
          openai,
          forbiddenTags,
          model,
          temperature,
          skipInvalidFrontmatter
        );
        changes.push(...subChanges);
        processedFileCount += subChanges.length;
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const fileChanges = await processFile(
          fullPath,
          openai,
          forbiddenTags,
          model,
          temperature,
          skipInvalidFrontmatter
        );
        if (fileChanges) {
          changes.push(...fileChanges);
          processedFileCount++;
        }
      } catch (error: unknown) {
        if (!skipInvalidFrontmatter) {
          throw error;
        }
        console.error(`Error processing ${fullPath}:`, error);
      }
    }

    if (processedFileCount >= MAX_FILES) {
      reachedMaxFiles = true;
      break;
    }
  }

  if (reachedMaxFiles) {
    console.log(`\nReached maximum file limit (${MAX_FILES}). Stopping processing.`);
  }

  return changes;
}

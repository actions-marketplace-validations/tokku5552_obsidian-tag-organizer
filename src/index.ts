import { promises as fs } from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import yaml from 'js-yaml';
import { parseInputs } from './config';
import { FrontMatter, TagSuggestion, TagChange } from './types';

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

export function extractFrontMatter(content: string): FrontMatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return yaml.load(match[1]) as FrontMatter;
  } catch (error) {
    console.error('Error parsing front matter:', error);
    return null;
  }
}

export function updateFrontMatter(content: string, newTags: string[]): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return content;

  const frontMatter = yaml.load(match[1]) as FrontMatter;
  frontMatter.tags = newTags;

  const newFrontMatter = yaml.dump(frontMatter);
  return content.replace(match[0], `---\n${newFrontMatter}---`);
}

export async function analyzeContentWithAI(
  content: string,
  openai: OpenAI,
  forbiddenTags: string[],
  model: string,
  temperature: number
): Promise<TagSuggestion[] | null> {
  const prompt = `
Please analyze the following text and suggest tags.
Tag rules:
- Use lowercase only
- Use hyphens (-) instead of spaces between words
- Use only content tags (no status or time tags)
- Use singular form as default
- Only use special characters: hyphen (-), underscore (_), and slash (/)
- Suggest maximum 5 tags
- The following tags are forbidden: ${forbiddenTags.join(', ')}

Text:
${content}

Please return tags in the following format (yaml):
suggestions:
  - original: "current-tag"
    suggested: "new-tag"
    reason: "reason for change"
`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a text analysis expert. Please suggest appropriate tags for the given text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
    });

    const result = response.choices[0].message.content;
    if (!result) return null;

    const match = result.match(/suggestions:\n([\s\S]*?)(?:\n\n|$)/);
    if (!match) return null;

    try {
      const parsed = yaml.load(match[0]) as { suggestions: TagSuggestion[] };
      return parsed.suggestions || [];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return null;
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

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

  const frontMatter = extractFrontMatter(content);
  if (!frontMatter) {
    if (skipInvalidFrontmatter) {
      console.log(`Skipping ${filePath} due to invalid front matter`);
      return null;
    }
    throw new Error(`Invalid front matter in ${filePath}`);
  }

  // Skip if tags already exist
  if (frontMatter.tags && frontMatter.tags.length > 0) {
    console.log(`Skipping ${filePath} as it already has tags`);
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

  const changes: TagChange[] = [];
  const newTags = new Set<string>();

  for (const suggestion of suggestions) {
    newTags.add(suggestion.suggested);
    changes.push({
      file: filePath,
      oldTag: '',
      newTag: suggestion.suggested,
    });
  }

  if (changes.length > 0) {
    // Preserve existing front matter and only add tags
    const newFrontMatter = { ...frontMatter, tags: Array.from(newTags) };
    const newContent = content.replace(
      /^---\n([\s\S]*?)\n---/,
      `---\n${yaml.dump(newFrontMatter)}---`
    );
    await writeFile(filePath, newContent);
  }

  return changes;
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
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let processedFileCount = 0;
  const MAX_FILES = 5;

  for (const entry of entries) {
    if (processedFileCount >= MAX_FILES) {
      console.log(`Reached maximum file limit (${MAX_FILES}). Stopping processing.`);
      break;
    }

    const fullPath = path.join(dirPath, entry.name);

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
      } catch (error) {
        if (!skipInvalidFrontmatter) {
          throw error;
        }
        console.error(`Error processing ${fullPath}:`, error);
      }
    }
  }

  return changes;
}

async function main(): Promise<void> {
  try {
    const inputs = parseInputs();
    const openai = new OpenAI({
      apiKey: inputs.openaiApiKey,
    });

    console.log('Starting tag organization...');
    console.log(`Target folder: ${inputs.targetFolder}`);
    console.log(`Exclude folders: ${inputs.excludeFolders.join(', ')}`);
    console.log(`Forbidden tags: ${inputs.forbiddenTags.join(', ')}`);
    console.log(`Skip invalid front matter: ${inputs.skipInvalidFrontmatter}`);

    const changes = await processDirectory(
      inputs.targetFolder,
      inputs.excludeFolders,
      openai,
      inputs.forbiddenTags,
      inputs.model,
      inputs.temperature,
      inputs.skipInvalidFrontmatter
    );

    if (changes.length > 0) {
      console.log('\nTag changes made:');
      changes.forEach((change) => {
        console.log(`${change.file}: ${change.oldTag} -> ${change.newTag}`);
      });
    } else {
      console.log('\nNo tag changes were necessary.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

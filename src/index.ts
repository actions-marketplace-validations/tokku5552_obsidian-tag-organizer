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
  const maxContentLength = 4000;
  const truncatedContent =
    content.length > maxContentLength ? content.substring(0, maxContentLength) + '...' : content;

  const frontMatter = extractFrontMatter(content);
  const existingTags = frontMatter?.tags || [];
  const remainingSlots = 5 - existingTags.length;

  if (remainingSlots <= 0) {
    console.log('File already has 5 or more tags, skipping AI analysis');
    return null;
  }

  const prompt = `
Please analyze the following text and suggest ${remainingSlots} additional tags to reach a total of 5 tags.
The text currently has the following tags: ${existingTags.join(', ')}

Tag rules:
- Use lowercase only
- Use hyphens (-) instead of spaces between words
- Use only content tags (no status or time tags)
- Use singular form as default
- Only use special characters: hyphen (-), underscore (_), and slash (/)
- Do not suggest tags that already exist
- The following tags are forbidden: ${forbiddenTags.join(', ')}

Text:
${truncatedContent}

IMPORTANT: You must respond with ONLY a YAML object in the following format:
tags:
  - name: "tag-name"
    reason: "reason for adding this tag"`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a text analysis expert. Your task is to suggest additional tags to reach a total of 5 tags for the given text. You must respond with ONLY a YAML object in the specified format.',
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

    // Clean up the response to ensure it's valid YAML
    const yamlContent = result
      .trim()
      .replace(/^```yaml\n?/, '') // Remove YAML code block if present
      .replace(/```$/, '') // Remove closing code block if present
      .trim();

    if (!yamlContent.startsWith('tags:')) {
      console.error('Invalid YAML format: missing tags: prefix');
      return null;
    }

    try {
      const parsed = yaml.load(yamlContent) as { tags: { name: string; reason: string }[] };
      if (!parsed.tags || !Array.isArray(parsed.tags)) {
        console.error('Invalid YAML format: tags array not found');
        return null;
      }

      // 既存のタグを除外
      const newTags = parsed.tags
        .filter((t) => !existingTags.includes(t.name))
        .slice(0, remainingSlots);

      return newTags.map((t) => ({
        original: '',
        suggested: t.name,
        reason: t.reason,
      }));
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

    const changes: TagChange[] = [];
    // 既存のタグを保持しつつ、重複を除去して最大5つに制限
    const newTags = new Set<string>(originalFrontMatter.tags || []);

    // 提案されたタグから重複を除去
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex((s) => s.suggested === suggestion.suggested)
    );

    for (const suggestion of uniqueSuggestions) {
      if (newTags.size >= 5) break;
      if (!newTags.has(suggestion.suggested)) {
        newTags.add(suggestion.suggested);
        changes.push({
          file: filePath,
          oldTag: '',
          newTag: suggestion.suggested,
        });
      }
    }

    if (changes.length > 0) {
      // 元のフロントマターを文字列として保持
      const originalFrontMatterStr = match[1];

      // タグのみを更新（重複は既に除去済み）
      const updatedFrontMatterStr = originalFrontMatterStr.replace(
        /^tags:.*$/m,
        `tags:\n${Array.from(newTags)
          .map((tag) => `  - "${tag}"`)
          .join('\n')}`
      );

      // 元の改行を保持して置換
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
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let processedFileCount = 0;
  const MAX_FILES = 5;
  let reachedMaxFiles = false;

  for (const entry of entries) {
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
    console.log(`Skip invalid front matter: ${inputs.skipInvalidFrontmatter}\n`);

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
      process.exit(0);
    } else {
      console.log('\nNo files needed tag updates. All files either:');
      console.log('- Already have 5 or more tags');
      console.log('- Have invalid front matter (and skip-invalid-frontmatter is true)');
      console.log('- Are README files');
      console.log('- Could not be processed due to other issues');
      process.exit(0);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

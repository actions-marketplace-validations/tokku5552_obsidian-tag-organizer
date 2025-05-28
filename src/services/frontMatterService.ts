import yaml from 'js-yaml';
import { FrontMatter, TargetFile } from '../types';
import { writeFile } from '../infrastructure/files';

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

export async function replaceFrontMatter(targetFile: TargetFile, newTags: string[]): Promise<void> {
  const { content, filePath } = targetFile;
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

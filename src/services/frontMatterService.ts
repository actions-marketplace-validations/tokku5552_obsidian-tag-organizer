import yaml from 'js-yaml';
import { FrontMatter } from '../types';

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

import { TagSuggestion, TargetFile } from '../types';

export function tagOrganizer(
  targetFile: TargetFile,
  suggestions: TagSuggestion[]
): string[] | null {
  const { originalFrontMatter, filePath } = targetFile;
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

  for (const suggestion of uniqueSuggestions) {
    if (newTags.size >= 5) break;
    newTags.add(suggestion.suggested);
  }

  return Array.from(newTags);
}

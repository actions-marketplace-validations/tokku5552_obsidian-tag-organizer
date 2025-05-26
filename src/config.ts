import { ActionInputs } from './types';
import * as yaml from 'js-yaml';

function parseYamlList(input: string): string[] {
  try {
    // Try to parse as YAML list
    const parsed = yaml.load(input) as string[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If parsing fails, fall back to comma-separated string
    return input.split(',').filter(Boolean);
  }
  return [];
}

export function parseInputs(): ActionInputs {
  const inputs: ActionInputs = {
    openaiApiKey: process.env.INPUT_OPENAI_API_KEY || '',
    targetFolder: process.env.INPUT_TARGET_FOLDER || '.',
    excludeFolders: parseYamlList(process.env.INPUT_EXCLUDE_FOLDERS || ''),
    forbiddenTags: parseYamlList(process.env.INPUT_FORBIDDEN_TAGS || ''),
    model: process.env.INPUT_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.INPUT_TEMPERATURE || '0.7'),
  };

  validateInputs(inputs);
  return inputs;
}

function validateInputs(inputs: ActionInputs): void {
  if (!inputs.openaiApiKey) {
    throw new Error('OpenAI API Key is required');
  }

  if (isNaN(inputs.temperature) || inputs.temperature < 0 || inputs.temperature > 1) {
    throw new Error('Temperature must be a number between 0 and 1');
  }

  if (!['gpt-3.5-turbo', 'gpt-4'].includes(inputs.model)) {
    throw new Error('Model must be either gpt-3.5-turbo or gpt-4');
  }
}

export const DEFAULT_CONFIG = {
  maxTokens: 2000,
  maxRetries: 3,
  retryDelay: 1000,
  supportedFileExtensions: ['.md'],
  tagPattern: /#[\w-]+/g,
  /**
   * Default target folders for tag organization.
   * These folders are processed recursively for tag updates.
   */
  targetFolders: ['Clippings', 'Daily', 'Zettelkasten'],
  /**
   * Folders to exclude from tag organization.
   * These folders and their contents will be skipped.
   */
  excludeFolders: ['Template'],
  /**
   * Tags that should not be used or suggested.
   * These tags are considered system tags and should not be modified.
   */
  forbiddenTags: ['TODO', 'ROUTINE', 'JOURNAL', 'STUDY', 'EXERCISE'],
};

import { ActionInputs } from './types';
import * as yaml from 'js-yaml';
import * as core from '@actions/core';

function parseYamlList(input: string): string[] {
  if (!input) return [];
  try {
    const parsed = yaml.load(input) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing YAML list:', error);
    return [];
  }
}

export function parseInputs(): ActionInputs {
  const openaiApiKey = core.getInput('openai-api-key', { required: true });
  const targetFolder = core.getInput('target-folder') || '.';
  const excludeFolders = parseYamlList(core.getInput('exclude-folders'));
  const forbiddenTags = parseYamlList(core.getInput('forbidden-tags'));
  const model = core.getInput('model') || 'gpt-4';
  const temperature = parseFloat(core.getInput('temperature') || '0.7');
  const skipInvalidFrontmatter = core.getBooleanInput('skip-invalid-frontmatter') || true;

  const inputs: ActionInputs = {
    openaiApiKey,
    targetFolder,
    excludeFolders,
    forbiddenTags,
    model,
    temperature,
    skipInvalidFrontmatter,
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

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
  const maxTags = parseInt(core.getInput('max-tags') || '5');
  const maxFiles = parseInt(core.getInput('max-files') || '5');
  const maxContentLength = parseInt(core.getInput('max-content-length') || '4000');

  const inputs: ActionInputs = {
    openaiApiKey,
    targetFolder,
    excludeFolders,
    forbiddenTags,
    model,
    temperature,
    skipInvalidFrontmatter,
    maxTags,
    maxFiles,
    maxContentLength,
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

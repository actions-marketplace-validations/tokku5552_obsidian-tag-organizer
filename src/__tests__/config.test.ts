import { jest } from '@jest/globals';
import * as core from '@actions/core';
import { parseInputs } from '../config';

jest.mock('@actions/core');

describe('parseInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse required inputs correctly', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'openai-api-key':
          return 'test-api-key';
        case 'target-folder':
          return 'test-folder';
        case 'exclude-folders':
          return '- folder1\n- folder2';
        case 'forbidden-tags':
          return '- tag1\n- tag2';
        case 'model':
          return 'gpt-4';
        case 'temperature':
          return '0.7';
        default:
          return '';
      }
    });

    const inputs = parseInputs();

    expect(inputs.openaiApiKey).toBe('test-api-key');
    expect(inputs.targetFolder).toBe('test-folder');
    expect(inputs.excludeFolders).toEqual(['folder1', 'folder2']);
    expect(inputs.forbiddenTags).toEqual(['tag1', 'tag2']);
    expect(inputs.model).toBe('gpt-4');
    expect(inputs.temperature).toBe(0.7);
  });

  it('should use default values when optional inputs are not provided', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'openai-api-key') {
        return 'test-api-key';
      }
      return '';
    });

    const inputs = parseInputs();

    expect(inputs.openaiApiKey).toBe('test-api-key');
    expect(inputs.targetFolder).toBe('.');
    expect(inputs.excludeFolders).toEqual([]);
    expect(inputs.forbiddenTags).toEqual([]);
    expect(inputs.model).toBe('gpt-4');
    expect(inputs.temperature).toBe(0.7);
  });

  it('should throw error when required openai-api-key is not provided', () => {
    (core.getInput as jest.Mock).mockReturnValue('');

    expect(() => parseInputs()).toThrow('OpenAI API Key is required');
  });

  it('should return empty array for non-YAML-list input', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'openai-api-key':
          return 'test-api-key';
        case 'exclude-folders':
          return 'folder1,folder2,folder3';
        case 'forbidden-tags':
          return 'tag1,tag2,tag3';
        default:
          return '';
      }
    });
    const inputs = parseInputs();
    expect(inputs.excludeFolders).toEqual([]);
    expect(inputs.forbiddenTags).toEqual([]);
  });

  it('should validate temperature range', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'openai-api-key':
          return 'test-api-key';
        case 'temperature':
          return '1.5';
        default:
          return '';
      }
    });

    expect(() => parseInputs()).toThrow('Temperature must be a number between 0 and 1');
  });

  it('should validate model name', () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      switch (name) {
        case 'openai-api-key':
          return 'test-api-key';
        case 'model':
          return 'invalid-model';
        default:
          return '';
      }
    });

    expect(() => parseInputs()).toThrow('Model must be either gpt-3.5-turbo or gpt-4');
  });
});

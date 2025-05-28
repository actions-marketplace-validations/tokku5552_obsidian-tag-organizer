"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core = __importStar(require("@actions/core"));
const config_1 = require("./config");
globals_1.jest.mock('@actions/core');
describe('parseInputs', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('should parse required inputs correctly', () => {
        core.getInput.mockImplementation((name) => {
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
        const inputs = (0, config_1.parseInputs)();
        expect(inputs.openaiApiKey).toBe('test-api-key');
        expect(inputs.targetFolder).toBe('test-folder');
        expect(inputs.excludeFolders).toEqual(['folder1', 'folder2']);
        expect(inputs.forbiddenTags).toEqual(['tag1', 'tag2']);
        expect(inputs.model).toBe('gpt-4');
        expect(inputs.temperature).toBe(0.7);
    });
    it('should use default values when optional inputs are not provided', () => {
        core.getInput.mockImplementation((name) => {
            if (name === 'openai-api-key') {
                return 'test-api-key';
            }
            return '';
        });
        const inputs = (0, config_1.parseInputs)();
        expect(inputs.openaiApiKey).toBe('test-api-key');
        expect(inputs.targetFolder).toBe('.');
        expect(inputs.excludeFolders).toEqual([]);
        expect(inputs.forbiddenTags).toEqual([]);
        expect(inputs.model).toBe('gpt-4');
        expect(inputs.temperature).toBe(0.7);
    });
    it('should throw error when required openai-api-key is not provided', () => {
        core.getInput.mockReturnValue('');
        expect(() => (0, config_1.parseInputs)()).toThrow('OpenAI API Key is required');
    });
    it('should return empty array for non-YAML-list input', () => {
        core.getInput.mockImplementation((name) => {
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
        const inputs = (0, config_1.parseInputs)();
        expect(inputs.excludeFolders).toEqual([]);
        expect(inputs.forbiddenTags).toEqual([]);
    });
    it('should validate temperature range', () => {
        core.getInput.mockImplementation((name) => {
            switch (name) {
                case 'openai-api-key':
                    return 'test-api-key';
                case 'temperature':
                    return '1.5';
                default:
                    return '';
            }
        });
        expect(() => (0, config_1.parseInputs)()).toThrow('Temperature must be a number between 0 and 1');
    });
    it('should validate model name', () => {
        core.getInput.mockImplementation((name) => {
            switch (name) {
                case 'openai-api-key':
                    return 'test-api-key';
                case 'model':
                    return 'invalid-model';
                default:
                    return '';
            }
        });
        expect(() => (0, config_1.parseInputs)()).toThrow('Model must be either gpt-3.5-turbo or gpt-4');
    });
});

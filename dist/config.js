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
exports.DEFAULT_CONFIG = void 0;
exports.parseInputs = parseInputs;
const yaml = __importStar(require("js-yaml"));
const core = __importStar(require("@actions/core"));
function parseYamlList(input) {
    try {
        const parsed = yaml.load(input);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }
    catch {
        return [];
    }
    return [];
}
function parseInputs() {
    const inputs = {
        openaiApiKey: core.getInput('openai-api-key', { required: true }),
        targetFolder: core.getInput('target-folder') || '.',
        excludeFolders: parseYamlList(core.getInput('exclude-folders') || ''),
        forbiddenTags: parseYamlList(core.getInput('forbidden-tags') || ''),
        model: core.getInput('model') || 'gpt-4',
        temperature: parseFloat(core.getInput('temperature') || '0.7'),
    };
    validateInputs(inputs);
    return inputs;
}
function validateInputs(inputs) {
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
exports.DEFAULT_CONFIG = {
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

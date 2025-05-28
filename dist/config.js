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
exports.parseInputs = parseInputs;
const yaml = __importStar(require("js-yaml"));
const core = __importStar(require("@actions/core"));
function parseYamlList(input) {
    if (!input)
        return [];
    try {
        const parsed = yaml.load(input);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.error('Error parsing YAML list:', error);
        return [];
    }
}
function parseInputs() {
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
    const inputs = {
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

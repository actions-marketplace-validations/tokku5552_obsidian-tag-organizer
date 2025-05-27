"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFile = processFile;
exports.processDirectory = processDirectory;
const js_yaml_1 = __importDefault(require("js-yaml"));
const fileService_1 = require("./fileService");
const frontMatterService_1 = require("./frontMatterService");
const aiService_1 = require("./aiService");
async function processFile(filePath, openai, forbiddenTags, model, temperature, skipInvalidFrontmatter) {
    const content = await (0, fileService_1.readFile)(filePath);
    if (!content)
        return null;
    if (filePath.toLowerCase().includes('readme.md')) {
        console.log(`Skipping ${filePath} as it is a README file`);
        return null;
    }
    try {
        const frontMatter = (0, frontMatterService_1.extractFrontMatter)(content);
        if (!frontMatter) {
            if (skipInvalidFrontmatter) {
                console.log(`Skipping ${filePath} due to invalid front matter`);
                return null;
            }
            throw new Error(`Invalid front matter in ${filePath}`);
        }
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) {
            if (skipInvalidFrontmatter) {
                console.log(`Skipping ${filePath} due to missing front matter delimiters`);
                return null;
            }
            throw new Error(`Missing front matter delimiters in ${filePath}`);
        }
        let originalFrontMatter;
        try {
            originalFrontMatter = js_yaml_1.default.load(match[1]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (skipInvalidFrontmatter) {
                console.log(`Skipping ${filePath} due to YAML parsing error: ${errorMessage}`);
                return null;
            }
            throw new Error(`YAML parsing error in ${filePath}: ${errorMessage}`);
        }
        if (originalFrontMatter.tags && originalFrontMatter.tags.length >= 5) {
            console.log(`Skipping ${filePath} as it already has 5 or more tags`);
            return null;
        }
        const suggestions = await (0, aiService_1.analyzeContentWithAI)(content, openai, forbiddenTags, model, temperature);
        if (!suggestions)
            return null;
        const uniqueOriginalTags = Array.from(new Set(originalFrontMatter.tags || []));
        const remainingSlots = 5 - uniqueOriginalTags.length;
        if (remainingSlots <= 0) {
            console.log(`Skipping ${filePath} as it already has 5 or more tags`);
            return null;
        }
        const uniqueSuggestions = Array.from(new Set(suggestions.map((s) => s.suggested)))
            .map((suggested) => suggestions.find((s) => s.suggested === suggested))
            .filter((suggestion) => !uniqueOriginalTags.includes(suggestion.suggested))
            .slice(0, remainingSlots);
        const newTags = new Set(uniqueSuggestions.slice(0, 5).map((s) => s.suggested));
        const changes = Array.from(newTags).map((tag) => ({
            file: filePath,
            oldTag: '',
            newTag: tag,
        }));
        for (const suggestion of uniqueSuggestions) {
            if (newTags.size >= 5)
                break;
            newTags.add(suggestion.suggested);
            changes.push({
                file: filePath,
                oldTag: '',
                newTag: suggestion.suggested,
            });
        }
        if (changes.length > 0) {
            const originalFrontMatterStr = match[1];
            const updatedFrontMatterStr = originalFrontMatterStr.replace(/^tags:.*$/m, `tags:\n${Array.from(newTags)
                .map((tag) => `  - "${tag}"`)
                .join('\n')}`);
            const newContent = content.replace(/^---\n([\s\S]*?)\n---/m, `---\n${updatedFrontMatterStr}\n---`);
            await (0, fileService_1.writeFile)(filePath, newContent);
        }
        return changes;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (skipInvalidFrontmatter) {
            console.log(`Skipping ${filePath} due to error: ${errorMessage}`);
            return null;
        }
        throw error;
    }
}
async function processDirectory(dirPath, excludeFolders, openai, forbiddenTags, model, temperature, skipInvalidFrontmatter) {
    const changes = [];
    const entries = await (0, fileService_1.readDirectory)(dirPath);
    let processedFileCount = 0;
    const MAX_FILES = 5;
    let reachedMaxFiles = false;
    for (const entry of entries) {
        const fullPath = (0, fileService_1.joinPath)(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!excludeFolders.includes(entry.name)) {
                const subChanges = await processDirectory(fullPath, excludeFolders, openai, forbiddenTags, model, temperature, skipInvalidFrontmatter);
                changes.push(...subChanges);
                processedFileCount += subChanges.length;
            }
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            try {
                const fileChanges = await processFile(fullPath, openai, forbiddenTags, model, temperature, skipInvalidFrontmatter);
                if (fileChanges) {
                    changes.push(...fileChanges);
                    processedFileCount++;
                }
            }
            catch (error) {
                if (!skipInvalidFrontmatter) {
                    throw error;
                }
                console.error(`Error processing ${fullPath}:`, error);
            }
        }
        if (processedFileCount >= MAX_FILES) {
            reachedMaxFiles = true;
            break;
        }
    }
    if (reachedMaxFiles) {
        console.log(`\nReached maximum file limit (${MAX_FILES}). Stopping processing.`);
    }
    return changes;
}

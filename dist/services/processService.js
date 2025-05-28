"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileList = getFileList;
exports.getTargetFiles = getTargetFiles;
exports.processFile = processFile;
const js_yaml_1 = __importDefault(require("js-yaml"));
const fileService_1 = require("./fileService");
const frontMatterService_1 = require("./frontMatterService");
const aiService_1 = require("./aiService");
/**
 * ファイル一覧を取得
 * @param dirPath ディレクトリパス
 * @param excludeFolders 除外フォルダ
 * @returns ファイル一覧
 */
async function getFileList(dirPath, excludeFolders) {
    const entries = await (0, fileService_1.readDirectory)(dirPath);
    const files = [];
    for (const entry of entries) {
        const fullPath = (0, fileService_1.joinPath)(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!excludeFolders.includes(entry.name)) {
                const subFiles = await getFileList(fullPath, excludeFolders);
                files.push(...subFiles);
            }
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    return files;
}
// 処理対象ファイルの抽出
async function getTargetFiles(filePaths, skipInvalidFrontmatter) {
    const targetFiles = [];
    for (const filePath of filePaths) {
        const content = await (0, fileService_1.readFile)(filePath);
        if (!content) {
            console.log(`Skipping ${filePath} due to missing content`);
            continue;
        }
        try {
            const frontMatter = (0, frontMatterService_1.extractFrontMatter)(content);
            if (!frontMatter) {
                if (skipInvalidFrontmatter) {
                    console.log(`Skipping ${filePath} due to invalid front matter`);
                    continue;
                }
                throw new Error(`Invalid front matter in ${filePath}`);
            }
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (!match) {
                if (skipInvalidFrontmatter) {
                    console.log(`Skipping ${filePath} due to missing front matter delimiters`);
                    continue;
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
                    continue;
                }
                throw new Error(`YAML parsing error in ${filePath}: ${errorMessage}`);
            }
            if (originalFrontMatter.tags && originalFrontMatter.tags.length >= 5) {
                console.log(`Skipping ${filePath} as it already has 5 or more tags`);
                continue;
            }
            targetFiles.push({ filePath, content, originalFrontMatter });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (skipInvalidFrontmatter) {
                console.log(`Skipping ${filePath} due to error: ${errorMessage}`);
                continue;
            }
            throw error;
        }
    }
    return targetFiles;
}
async function processFile(filePath, content, originalFrontMatter, openai, forbiddenTags, model, temperature) {
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
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        const originalFrontMatterStr = match ? match[1] : '';
        const updatedFrontMatterStr = originalFrontMatterStr.replace(/^tags:.*$/m, `tags:\n${Array.from(newTags)
            .map((tag) => `  - "${tag}"`)
            .join('\n')}`);
        const newContent = content.replace(/^---\n([\s\S]*?)\n---/m, `---\n${updatedFrontMatterStr}\n---`);
        await (0, fileService_1.writeFile)(filePath, newContent);
    }
    return changes;
}

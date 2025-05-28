"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFiles = getAllFiles;
exports.getTargetFiles = getTargetFiles;
const js_yaml_1 = __importDefault(require("js-yaml"));
const files_1 = require("../infrastructure/files");
const frontMatterService_1 = require("./frontMatterService");
async function getAllFiles(props) {
    const { targetFolder, excludeFolders } = props;
    const entries = await (0, files_1.readDirectory)(targetFolder);
    const files = [];
    for (const entry of entries) {
        const fullPath = (0, files_1.joinPath)(targetFolder, entry.name);
        if (entry.isDirectory()) {
            if (!excludeFolders.includes(entry.name)) {
                const subFiles = await getAllFiles({
                    ...props,
                    targetFolder: fullPath,
                });
                files.push(...subFiles);
            }
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    return files;
}
async function getTargetFiles(filePaths, skipInvalidFrontmatter) {
    const targetFiles = [];
    for (const filePath of filePaths) {
        const content = await (0, files_1.readFile)(filePath);
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

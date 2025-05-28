"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFrontMatter = extractFrontMatter;
exports.updateFrontMatter = updateFrontMatter;
exports.replaceFrontMatter = replaceFrontMatter;
const js_yaml_1 = __importDefault(require("js-yaml"));
const files_1 = require("../infrastructure/files");
function extractFrontMatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match)
        return null;
    try {
        return js_yaml_1.default.load(match[1]);
    }
    catch (error) {
        console.error('Error parsing front matter:', error);
        return null;
    }
}
function updateFrontMatter(content, newTags) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match)
        return content;
    const frontMatter = js_yaml_1.default.load(match[1]);
    frontMatter.tags = newTags;
    const newFrontMatter = js_yaml_1.default.dump(frontMatter);
    return content.replace(match[0], `---\n${newFrontMatter}---`);
}
async function replaceFrontMatter(targetFile, newTags) {
    const { content, filePath } = targetFile;
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const originalFrontMatterStr = match ? match[1] : '';
    const updatedFrontMatterStr = originalFrontMatterStr.replace(/^tags:.*$/m, `tags:\n${Array.from(newTags)
        .map((tag) => `  - "${tag}"`)
        .join('\n')}`);
    const newContent = content.replace(/^---\n([\s\S]*?)\n---/m, `---\n${updatedFrontMatterStr}\n---`);
    await (0, files_1.writeFile)(filePath, newContent);
}

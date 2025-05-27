"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFrontMatter = extractFrontMatter;
exports.updateFrontMatter = updateFrontMatter;
const js_yaml_1 = __importDefault(require("js-yaml"));
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

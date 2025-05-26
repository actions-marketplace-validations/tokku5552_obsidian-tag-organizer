"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const openai_1 = require("openai");
const js_yaml_1 = __importDefault(require("js-yaml"));
const config_1 = require("./config");
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// タグ整理の対象フォルダ
const TARGET_FOLDERS = ["Clippings", "Daily", "Zettelkasten"];
// 除外フォルダ
const EXCLUDE_FOLDERS = ["Template"];
// 禁止タグ
const FORBIDDEN_TAGS = [
    "TODO",
    "ROUTINE",
    "JOURNAL",
    "STUDY",
    "EXERCISE",
];
async function readFile(filePath) {
    try {
        return await fs_1.promises.readFile(filePath, "utf8");
    }
    catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}
async function writeFile(filePath, content) {
    try {
        await fs_1.promises.writeFile(filePath, content, "utf8");
    }
    catch (error) {
        console.error(`Error writing ${filePath}:`, error);
    }
}
function extractFrontMatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match)
        return null;
    try {
        return js_yaml_1.default.load(match[1]);
    }
    catch (error) {
        console.error("Error parsing front matter:", error);
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
async function analyzeContentWithAI(content, openai, forbiddenTags, model, temperature) {
    const prompt = `
以下のテキストを分析し、タグを提案してください。
タグのルール:
- 小文字のみ使用
- スペースは使用せず、単語間はハイフン(-)で区切る
- 内容タグのみを使用（状態タグや時間タグは使用しない）
- 単数形を基本とする
- 特殊文字はハイフン(-)、アンダースコア(_)、スラッシュ(/)のみ使用可能
- 最大5つまでのタグを提案
- 以下のタグは使用禁止: ${forbiddenTags.join(", ")}

テキスト:
${content}

タグを以下の形式で返してください（yaml形式）:
suggestions:
  - original: "current-tag"
    suggested: "new-tag"
    reason: "変更理由"
`;
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: "あなたはテキスト分析の専門家です。与えられたテキストから適切なタグを提案してください。",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature,
        });
        const result = response.choices[0].message.content;
        if (!result)
            return null;
        const match = result.match(/suggestions:\n([\s\S]*?)(?:\n\n|$)/);
        if (!match)
            return null;
        try {
            const parsed = js_yaml_1.default.load(match[0]);
            return parsed.suggestions || [];
        }
        catch (error) {
            console.error("Error parsing AI response:", error);
            return null;
        }
    }
    catch (error) {
        console.error("Error calling OpenAI API:", error);
        return null;
    }
}
async function processFile(filePath, openai, forbiddenTags, model, temperature) {
    const content = await readFile(filePath);
    if (!content)
        return null;
    const frontMatter = extractFrontMatter(content);
    if (!frontMatter || !frontMatter.tags)
        return null;
    const currentTags = frontMatter.tags;
    const suggestions = await analyzeContentWithAI(content, openai, forbiddenTags, model, temperature);
    if (!suggestions)
        return null;
    const changes = [];
    const newTags = new Set(currentTags);
    for (const suggestion of suggestions) {
        if (currentTags.includes(suggestion.original)) {
            newTags.delete(suggestion.original);
            newTags.add(suggestion.suggested);
            changes.push({
                file: filePath,
                oldTag: suggestion.original,
                newTag: suggestion.suggested,
            });
        }
    }
    if (changes.length > 0) {
        const newContent = updateFrontMatter(content, Array.from(newTags));
        await writeFile(filePath, newContent);
    }
    return changes;
}
async function processDirectory(dirPath, excludeFolders, openai, forbiddenTags, model, temperature) {
    const changes = [];
    const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path_1.default.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!excludeFolders.includes(entry.name)) {
                const subChanges = await processDirectory(fullPath, excludeFolders, openai, forbiddenTags, model, temperature);
                changes.push(...subChanges);
            }
        }
        else if (entry.isFile() && entry.name.endsWith(".md")) {
            const fileChanges = await processFile(fullPath, openai, forbiddenTags, model, temperature);
            if (fileChanges) {
                changes.push(...fileChanges);
            }
        }
    }
    return changes;
}
async function main() {
    try {
        const inputs = (0, config_1.parseInputs)();
        const openai = new openai_1.OpenAI({
            apiKey: inputs.openaiApiKey,
        });
        console.log("Starting tag organization...");
        console.log(`Target folder: ${inputs.targetFolder}`);
        console.log(`Exclude folders: ${inputs.excludeFolders.join(", ")}`);
        console.log(`Forbidden tags: ${inputs.forbiddenTags.join(", ")}`);
        const changes = await processDirectory(inputs.targetFolder, inputs.excludeFolders, openai, inputs.forbiddenTags, inputs.model, inputs.temperature);
        if (changes.length > 0) {
            console.log("\nTag changes made:");
            changes.forEach((change) => {
                console.log(`${change.file}: ${change.oldTag} -> ${change.newTag}`);
            });
        }
        else {
            console.log("\nNo tag changes were necessary.");
        }
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
main().catch(console.error);

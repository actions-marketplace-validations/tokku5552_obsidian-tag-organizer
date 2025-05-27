"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContentWithAI = analyzeContentWithAI;
const js_yaml_1 = __importDefault(require("js-yaml"));
const frontMatterService_1 = require("./frontMatterService");
async function analyzeContentWithAI(content, openai, forbiddenTags, model, temperature) {
    const maxContentLength = 4000;
    const truncatedContent = content.length > maxContentLength ? content.substring(0, maxContentLength) + '...' : content;
    const frontMatter = (0, frontMatterService_1.extractFrontMatter)(content);
    const existingTags = frontMatter?.tags || [];
    const remainingSlots = 5 - existingTags.length;
    if (remainingSlots <= 0) {
        console.log('File already has 5 or more tags, skipping AI analysis');
        return null;
    }
    const prompt = `
Please analyze the following text and suggest ${remainingSlots} additional tags to reach a total of 5 tags.
The text currently has the following tags: ${existingTags.join(', ')}

Tag rules:
- Use lowercase only
- Use hyphens (-) instead of spaces between words
- Use only content tags (no status or time tags)
- Use singular form as default
- Only use special characters: hyphen (-), underscore (_), and slash (/)
- Do not suggest tags that already exist
- The following tags are forbidden: ${forbiddenTags.join(', ')}

Text:
${truncatedContent}

IMPORTANT: You must respond with ONLY a YAML object in the following format:
tags:
  - name: "tag-name"
    reason: "reason for adding this tag"`;
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a text analysis expert. Your task is to suggest additional tags to reach a total of 5 tags for the given text. You must respond with ONLY a YAML object in the specified format.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature,
        });
        const result = response.choices[0].message.content;
        if (!result)
            return null;
        const yamlContent = result
            .trim()
            .replace(/^```yaml\n?/, '')
            .replace(/```$/, '')
            .trim();
        if (!yamlContent.startsWith('tags:')) {
            console.error('Invalid YAML format: missing tags: prefix');
            return null;
        }
        try {
            const parsed = js_yaml_1.default.load(yamlContent);
            if (!parsed.tags || !Array.isArray(parsed.tags)) {
                console.error('Invalid YAML format: tags array not found');
                return null;
            }
            const newTags = parsed.tags
                .filter((t) => !existingTags.includes(t.name))
                .slice(0, remainingSlots);
            return newTags.map((t) => ({
                original: '',
                suggested: t.name,
                reason: t.reason,
            }));
        }
        catch (error) {
            console.error('Error parsing AI response:', error);
            return null;
        }
    }
    catch (error) {
        console.error('Error calling OpenAI API:', error);
        return null;
    }
}

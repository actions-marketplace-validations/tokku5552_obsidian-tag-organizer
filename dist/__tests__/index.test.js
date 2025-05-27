"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const fs_1 = require("fs");
describe('extractFrontMatter (正常系)', () => {
    it('should extract front matter from content', () => {
        const content = `---\ntags: [test, example]\ntitle: Test Note\n---\n\nThis is a test note content.`;
        const expected = {
            tags: ['test', 'example'],
            title: 'Test Note',
        };
        expect((0, index_1.extractFrontMatter)(content)).toEqual(expected);
    });
});
describe('processDirectory (ファイル制限)', () => {
    const mockOpenAI = {
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [
                        {
                            message: {
                                content: 'suggestions:\n  - original: "test"\n    suggested: "new-test"\n    reason: "test reason"',
                            },
                        },
                    ],
                }),
            },
        },
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should process maximum 5 files', async () => {
        // モックの設定
        const mockReadDir = jest.spyOn(fs_1.promises, 'readdir');
        const mockReadFile = jest.spyOn(fs_1.promises, 'readFile');
        const mockWriteFile = jest.spyOn(fs_1.promises, 'writeFile');
        // 6つのファイルをモック
        const mockFiles = Array(6)
            .fill(null)
            .map((_, i) => ({
            name: `test${i}.md`,
            isFile: () => true,
            isDirectory: () => false,
        }));
        mockReadDir.mockResolvedValue(mockFiles);
        mockReadFile.mockResolvedValue('---\ntags: [test]\n---\ncontent');
        mockWriteFile.mockResolvedValue(undefined);
        const result = await (0, index_1.processDirectory)('/test/path', [], mockOpenAI, [], 'gpt-3.5-turbo', 0.7);
        // 5つのファイルのみが処理されたことを確認
        expect(mockReadFile).toHaveBeenCalledTimes(5);
        expect(mockWriteFile).toHaveBeenCalledTimes(5);
        expect(result.length).toBeLessThanOrEqual(5);
    });
});

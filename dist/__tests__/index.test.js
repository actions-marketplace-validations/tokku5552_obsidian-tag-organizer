"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const processService_1 = require("../services/processService");
const frontMatterService_1 = require("../services/frontMatterService");
const fs_1 = require("fs");
describe('extractFrontMatter (正常系)', () => {
    it('should extract front matter from content', () => {
        const content = `---\ntags: [test, example]\ntitle: Test Note\n---\n\nThis is a test note content.`;
        const expected = {
            tags: ['test', 'example'],
            title: 'Test Note',
        };
        expect((0, frontMatterService_1.extractFrontMatter)(content)).toEqual(expected);
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
                                content: `tags:
  - name: "new-tag"
    reason: "test reason"`,
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
        // @ts-expect-error: test mock for Dirent
        mockReadDir.mockResolvedValue(mockFiles);
        mockReadFile.mockResolvedValue('---\ntags: []\n---\ncontent');
        mockWriteFile.mockResolvedValue(undefined);
        await (0, processService_1.processDirectory)('/test/path', [], mockOpenAI, [], 'gpt-3.5-turbo', 0.7, false);
        // 5つのファイルのみが処理されたことを確認
        expect(mockReadFile).toHaveBeenCalledTimes(5);
        expect(mockWriteFile).toHaveBeenCalledTimes(5);
    });
    it('should limit tags to 5 even if AI returns more than 5 suggestions', async () => {
        // モックの設定
        const mockReadDir = jest.spyOn(fs_1.promises, 'readdir');
        const mockReadFile = jest.spyOn(fs_1.promises, 'readFile');
        const mockWriteFile = jest.spyOn(fs_1.promises, 'writeFile');
        // 1つのファイルをモック
        const mockFiles = [
            {
                name: 'test.md',
                isFile: () => true,
                isDirectory: () => false,
            },
        ];
        // @ts-expect-error: test mock for Dirent
        mockReadDir.mockResolvedValue(mockFiles);
        mockReadFile.mockResolvedValue('---\ntags: []\n---\ncontent');
        mockWriteFile.mockResolvedValue(undefined);
        // AIが6個のタグを返すようにモック
        const mockOpenAIOver5 = {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: `tags:
  - name: "tag1"
    reason: "reason1"
  - name: "tag2"
    reason: "reason2"
  - name: "tag3"
    reason: "reason3"
  - name: "tag4"
    reason: "reason4"
  - name: "tag5"
    reason: "reason5"
  - name: "tag6"
    reason: "reason6"`,
                                },
                            },
                        ],
                    }),
                },
            },
        };
        await (0, processService_1.processDirectory)('/test/path', [], mockOpenAIOver5, [], 'gpt-3.5-turbo', 0.7, false);
        // 書き込まれた内容のタグ数が5個であることを確認
        const writtenContent = mockWriteFile.mock.calls[0][1];
        const frontMatter = (0, frontMatterService_1.extractFrontMatter)(writtenContent);
        expect(frontMatter?.tags).toHaveLength(5);
    });
});

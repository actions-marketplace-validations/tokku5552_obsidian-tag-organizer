import { extractFrontMatter, processDirectory } from '../index';
import { promises as fs, Dirent } from 'fs';
import { OpenAI } from 'openai';

describe('extractFrontMatter (正常系)', () => {
  it('should extract front matter from content', () => {
    const content = `---\ntags: [test, example]\ntitle: Test Note\n---\n\nThis is a test note content.`;
    const expected = {
      tags: ['test', 'example'],
      title: 'Test Note',
    };
    expect(extractFrontMatter(content)).toEqual(expected);
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
  } as unknown as OpenAI;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process maximum 5 files', async () => {
    // モックの設定
    const mockReadDir = jest.spyOn(fs, 'readdir');
    const mockReadFile = jest.spyOn(fs, 'readFile');
    const mockWriteFile = jest.spyOn(fs, 'writeFile');

    // 6つのファイルをモック
    const mockFiles = Array(6)
      .fill(null)
      .map((_, i) => ({
        name: `test${i}.md`,
        isFile: (): boolean => true,
        isDirectory: (): boolean => false,
      })) as Partial<Dirent>[];

    // @ts-expect-error: test mock for Dirent
    mockReadDir.mockResolvedValue(mockFiles);
    mockReadFile.mockResolvedValue('---\ntags: []\n---\ncontent');
    mockWriteFile.mockResolvedValue(undefined);

    const result = await processDirectory(
      '/test/path',
      [],
      mockOpenAI,
      [],
      'gpt-3.5-turbo',
      0.7,
      false
    );

    // 5つのファイルのみが処理されたことを確認
    expect(mockReadFile).toHaveBeenCalledTimes(5);
    expect(mockWriteFile).toHaveBeenCalledTimes(5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('should limit tags to 5 even if AI returns more than 5 suggestions', async () => {
    // モックの設定
    const mockReadDir = jest.spyOn(fs, 'readdir');
    const mockReadFile = jest.spyOn(fs, 'readFile');
    const mockWriteFile = jest.spyOn(fs, 'writeFile');

    // 1つのファイルをモック
    const mockFiles = [
      {
        name: 'test.md',
        isFile: (): boolean => true,
        isDirectory: (): boolean => false,
      },
    ] as Partial<Dirent>[];

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
    } as unknown as OpenAI;

    const result = await processDirectory(
      '/test/path',
      [],
      mockOpenAIOver5,
      [],
      'gpt-3.5-turbo',
      0.7,
      false
    );

    // 書き込まれた内容のタグ数が5個であることを確認
    const writtenContent = mockWriteFile.mock.calls[0][1] as string;
    const tagLines =
      writtenContent.match(/tags:\\n([\\s\\S]*?)\\n---/) ||
      writtenContent.match(/tags:\n([\s\S]*?)\n---/);
    const tags = tagLines
      ? (tagLines[1].match(/- ".*?"/g) || []).map((s) => s.replace(/- "|"/g, ''))
      : [];
    expect(tags.length).toBe(5);
    expect(result.length).toBe(5);
  });
});

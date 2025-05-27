import { extractFrontMatter, processDirectory } from '../index';
import { promises as fs } from 'fs';
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
                content:
                  'suggestions:\n  - original: "test"\n    suggested: "new-test"\n    reason: "test reason"',
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
        isFile: () => true,
        isDirectory: () => false,
      }));

    mockReadDir.mockResolvedValue(mockFiles as any);
    mockReadFile.mockResolvedValue('---\ntags: [test]\n---\ncontent');
    mockWriteFile.mockResolvedValue(undefined);

    const result = await processDirectory('/test/path', [], mockOpenAI, [], 'gpt-3.5-turbo', 0.7);

    // 5つのファイルのみが処理されたことを確認
    expect(mockReadFile).toHaveBeenCalledTimes(5);
    expect(mockWriteFile).toHaveBeenCalledTimes(5);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

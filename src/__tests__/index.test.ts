import { extractFrontMatter } from '../index';

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

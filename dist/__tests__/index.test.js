"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
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

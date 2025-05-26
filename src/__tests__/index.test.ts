import { promises as fs } from "fs";
import { OpenAI } from "openai";
import {
    extractFrontMatter,
    updateFrontMatter,
    analyzeContentWithAI,
    processFile,
    processDirectory,
} from "../index";

// Add Jest type definitions
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock fs promises
jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readdir: jest.fn(),
    },
}));

// Mock OpenAI
jest.mock("openai", () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn(),
            },
        },
    })),
}));

describe("Tag Organizer", () => {
    const mockContent = `---
tags: [test, example]
title: Test Note
---

This is a test note content.`;

    const mockFrontMatter = {
        tags: ["test", "example"],
        title: "Test Note",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("extractFrontMatter", () => {
        it("should extract front matter from content", () => {
            const result = extractFrontMatter(mockContent);
            expect(result).toEqual(mockFrontMatter);
        });

        it("should return null for content without front matter", () => {
            const result = extractFrontMatter("No front matter here");
            expect(result).toBeNull();
        });
    });

    describe("updateFrontMatter", () => {
        it("should update tags in front matter", () => {
            const newTags = ["updated", "tags"];
            const result = updateFrontMatter(mockContent, newTags);
            expect(result).toContain("tags: [updated, tags]");
        });

        it("should return original content if no front matter", () => {
            const content = "No front matter";
            const result = updateFrontMatter(content, ["new", "tags"]);
            expect(result).toBe(content);
        });
    });

    describe("analyzeContentWithAI", () => {
        const mockOpenAI = new OpenAI();
        const mockResponse = {
            choices: [
                {
                    message: {
                        content: `suggestions:
  - original: "test"
    suggested: "testing"
    reason: "More descriptive tag"`,
                    },
                },
            ],
        };

        beforeEach(() => {
            (mockOpenAI.chat.completions.create as unknown as jest.Mock).mockResolvedValue(
                mockResponse
            );
        });

        it("should analyze content and return suggestions", async () => {
            const result = await analyzeContentWithAI(
                mockContent,
                mockOpenAI,
                ["forbidden"],
                "gpt-4",
                0.7
            );

            expect(result).toEqual([
                {
                    original: "test",
                    suggested: "testing",
                    reason: "More descriptive tag",
                },
            ]);
        });

        it("should handle API errors", async () => {
            (mockOpenAI.chat.completions.create as unknown as jest.Mock).mockRejectedValue(
                new Error("API Error")
            );
            const result = await analyzeContentWithAI(
                mockContent,
                mockOpenAI,
                ["forbidden"],
                "gpt-4",
                0.7
            );
            expect(result).toBeNull();
        });
    });

    describe("processFile", () => {
        const mockFilePath = "test.md";
        const mockOpenAI = new OpenAI();

        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockResolvedValue(mockContent);
            (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
        });

        it("should process file and update tags", async () => {
            const mockSuggestions = [
                {
                    original: "test",
                    suggested: "testing",
                    reason: "More descriptive",
                },
            ];

            (mockOpenAI.chat.completions.create as unknown as jest.Mock).mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: `suggestions:
  - original: "test"
    suggested: "testing"
    reason: "More descriptive"`,
                        },
                    },
                ],
            });

            const result = await processFile(mockFilePath, mockOpenAI, ["forbidden"], "gpt-4", 0.7);

            expect(result).toEqual([
                {
                    file: mockFilePath,
                    oldTag: "test",
                    newTag: "testing",
                },
            ]);
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it("should return null for file without tags", async () => {
            (fs.readFile as unknown as jest.Mock).mockResolvedValue("No tags here");
            const result = await processFile(mockFilePath, mockOpenAI, ["forbidden"], "gpt-4", 0.7);
            expect(result).toBeNull();
        });
    });

    describe("processDirectory", () => {
        const mockDirPath = "test-dir";
        const mockOpenAI = new OpenAI();

        beforeEach(() => {
            (fs.readdir as unknown as jest.Mock).mockResolvedValue([
                { name: "test.md", isFile: () => true, isDirectory: () => false },
                { name: "subdir", isFile: () => false, isDirectory: () => true },
            ]);
        });

        it("should process directory recursively", async () => {
            const mockChanges = [
                {
                    file: "test.md",
                    oldTag: "test",
                    newTag: "testing",
                },
            ];

            (fs.readFile as unknown as jest.Mock).mockResolvedValue(mockContent);
            (mockOpenAI.chat.completions.create as unknown as jest.Mock).mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: `suggestions:
  - original: "test"
    suggested: "testing"
    reason: "More descriptive"`,
                        },
                    },
                ],
            });

            const result = await processDirectory(
                mockDirPath,
                ["exclude"],
                mockOpenAI,
                ["forbidden"],
                "gpt-4",
                0.7
            );

            expect(result).toEqual(mockChanges);
        });

        it("should skip excluded directories", async () => {
            (fs.readdir as unknown as jest.Mock).mockResolvedValue([
                { name: "exclude", isFile: () => false, isDirectory: () => true },
            ]);

            const result = await processDirectory(
                mockDirPath,
                ["exclude"],
                mockOpenAI,
                ["forbidden"],
                "gpt-4",
                0.7
            );

            expect(result).toEqual([]);
        });
    });
});

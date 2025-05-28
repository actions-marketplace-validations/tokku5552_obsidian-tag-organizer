"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.readDirectory = readDirectory;
exports.joinPath = joinPath;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
async function readFile(filePath) {
    try {
        return await fs_1.promises.readFile(filePath, 'utf8');
    }
    catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}
async function writeFile(filePath, content) {
    try {
        await fs_1.promises.writeFile(filePath, content, 'utf8');
    }
    catch (error) {
        console.error(`Error writing ${filePath}:`, error);
    }
}
async function readDirectory(dirPath) {
    return await fs_1.promises.readdir(dirPath, { withFileTypes: true });
}
function joinPath(...paths) {
    return path_1.default.join(...paths);
}

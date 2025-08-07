"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
// Ensure platform-agnostic 'path.basename' function
const basename = process.platform === 'win32' ? path_1.default.win32.basename : path_1.default.basename;
function resolveGlob(workingDirectory, pattern) {
    // 'glob.sync()' does not resolve paths, only glob patterns
    if (glob_1.default.hasMagic(pattern)) {
        return glob_1.default
            .sync(pattern, { cwd: workingDirectory })
            .map((matchingPath) => path_1.default.resolve(workingDirectory, matchingPath));
    }
    const resolvedPath = path_1.default.resolve(workingDirectory, pattern);
    return fs_1.default.existsSync(resolvedPath) ? [resolvedPath] : [];
}
/**
 * Resolve paths to files
 *
 * Resolves glob patterns and sorts the files alphabetically by their basename.
 * Throws in case there's a pattern which doesn't resolve to any existing files.
 */
function resolvePaths(workingDirectory, patterns) {
    if (!patterns || patterns.length < 1) {
        return [];
    }
    const resolvedPaths = patterns
        .map((pattern) => {
        const paths = resolveGlob(workingDirectory, pattern);
        if (paths.length < 1) {
            throw new Error(`Could not find any files on path: '${pattern}'`);
        }
        return paths;
    })
        .reduce((flatPaths, paths) => flatPaths.concat(paths), [])
        .sort((p1, p2) => {
        const [basename1, basename2] = [basename(p1), basename(p2)];
        if (basename1 < basename2)
            return -1;
        if (basename1 > basename2)
            return 1;
        return 0;
    });
    return Array.from(new Set(resolvedPaths)); // keep only unique items
}
exports.default = resolvePaths;

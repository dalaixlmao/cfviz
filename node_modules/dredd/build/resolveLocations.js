"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resolvePaths_1 = __importDefault(require("./resolvePaths"));
const isURL_1 = __importDefault(require("./isURL"));
/**
 * Takes an array of strings representing API description document locations
 * and resolves all relative paths and globs
 *
 * Keeps URLs intact. Keeps the original order. Throws in case there's a glob
 * pattern which doesn't resolve to any existing files.
 */
function resolveLocations(workingDirectory, locations) {
    const resolvedLocations = locations
        // resolves paths to local files, produces an array of arrays
        .map((location) => isURL_1.default(location) ? [location] : resolvePaths_1.default(workingDirectory, [location]))
        // flattens the array of arrays
        .reduce((flatArray, array) => flatArray.concat(array), []);
    return Array.from(new Set(resolvedLocations));
}
exports.default = resolveLocations;

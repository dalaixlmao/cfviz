"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function resolveModule(workingDirectory, moduleName) {
    const absolutePath = path_1.default.resolve(workingDirectory, moduleName);
    return fs_1.default.existsSync(absolutePath) || fs_1.default.existsSync(`${absolutePath}.js`)
        ? absolutePath
        : moduleName;
}
exports.default = resolveModule;

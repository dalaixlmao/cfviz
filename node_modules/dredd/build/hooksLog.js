"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
function hooksLog(logs = [], logger, content) {
    // Log to logger
    if (logger && typeof logger.hook === 'function') {
        logger.hook(content);
    }
    // Append to array of logs to allow further operations, e.g. send all hooks logs to Apiary
    logs.push({
        timestamp: Date.now(),
        content: typeof content === 'object' ? util_1.default.format(content) : `${content}`,
    });
    return logs;
}
exports.default = hooksLog;

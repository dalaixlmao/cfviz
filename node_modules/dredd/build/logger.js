"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger = new winston_1.default.Logger({
    transports: [new winston_1.default.transports.Console({ colorize: true })],
    levels: {
        debug: 2,
        warn: 1,
        error: 0,
    },
    colors: {
        debug: 'cyan',
        warn: 'yellow',
        error: 'red',
    },
});
exports.default = logger;

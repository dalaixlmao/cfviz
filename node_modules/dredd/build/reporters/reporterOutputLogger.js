"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger = new winston_1.default.Logger({
    transports: [
        new winston_1.default.transports.Console({ colorize: true, level: 'info' }),
    ],
    levels: {
        info: 10,
        test: 9,
        pass: 8,
        fail: 7,
        complete: 6,
        actual: 5,
        expected: 4,
        hook: 3,
        request: 2,
        skip: 1,
        error: 0,
    },
    colors: {
        info: 'blue',
        test: 'yellow',
        pass: 'green',
        fail: 'red',
        complete: 'green',
        actual: 'red',
        expected: 'red',
        hook: 'green',
        request: 'green',
        skip: 'yellow',
        error: 'red',
    },
});
exports.default = logger;

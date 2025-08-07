"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
function BaseReporter(emitter, stats) {
    this.type = 'base';
    this.stats = stats;
    this.configureEmitter(emitter);
    logger_1.default.debug(`Using '${this.type}' reporter.`);
}
BaseReporter.prototype.configureEmitter = function configureEmitter(emitter) {
    emitter.on('start', (apiDescriptions, callback) => {
        this.stats.start = new Date();
        callback();
    });
    emitter.on('end', (callback) => {
        this.stats.end = new Date();
        this.stats.duration = this.stats.end - this.stats.start;
        callback();
    });
    emitter.on('test start', (test) => {
        this.stats.tests += 1;
        test.start = new Date();
    });
    emitter.on('test pass', (test) => {
        this.stats.passes += 1;
        test.end = new Date();
        if (typeof test.start === 'string') {
            test.start = new Date(test.start);
        }
        test.duration = test.end - test.start;
    });
    emitter.on('test skip', () => {
        this.stats.skipped += 1;
    });
    emitter.on('test fail', (test) => {
        this.stats.failures += 1;
        test.end = new Date();
        if (typeof test.start === 'string') {
            test.start = new Date(test.start);
        }
        test.duration = test.end - test.start;
    });
    emitter.on('test error', (error, test) => {
        this.stats.errors += 1;
        test.end = new Date();
        if (typeof test.start === 'string') {
            test.start = new Date(test.start);
        }
        test.duration = test.end - test.start;
    });
};
exports.default = BaseReporter;

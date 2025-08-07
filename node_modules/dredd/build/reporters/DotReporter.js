"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const reporterOutputLogger_1 = __importDefault(require("./reporterOutputLogger"));
const prettifyResponse_1 = __importDefault(require("../prettifyResponse"));
function DotReporter(emitter, stats) {
    this.type = 'dot';
    this.stats = stats;
    this.errors = [];
    this.configureEmitter(emitter);
    logger_1.default.debug(`Using '${this.type}' reporter.`);
}
DotReporter.prototype.configureEmitter = function configureEmitter(emitter) {
    emitter.on('start', (apiDescriptions, callback) => {
        logger_1.default.debug('Beginning Dredd testing...');
        callback();
    });
    emitter.on('end', (callback) => {
        if (this.stats.tests > 0) {
            if (this.errors.length > 0) {
                this.write('\n');
                reporterOutputLogger_1.default.info('Displaying failed tests...');
                for (const test of this.errors) {
                    reporterOutputLogger_1.default.fail(`${test.title} duration: ${test.duration}ms`);
                    reporterOutputLogger_1.default.fail(test.message);
                    reporterOutputLogger_1.default.request(`\n${prettifyResponse_1.default(test.request)}\n`);
                    reporterOutputLogger_1.default.expected(`\n${prettifyResponse_1.default(test.expected)}\n`);
                    reporterOutputLogger_1.default.actual(`\n${prettifyResponse_1.default(test.actual)}\n\n`);
                }
            }
            this.write('\n');
            reporterOutputLogger_1.default.complete(`\
${this.stats.passes} passing, ${this.stats.failures} failing, \
${this.stats.errors} errors, ${this.stats.skipped} skipped\
`);
            reporterOutputLogger_1.default.complete(`Tests took ${this.stats.duration}ms`);
            callback();
        }
    });
    emitter.on('test pass', () => {
        this.write('.');
    });
    emitter.on('test skip', () => {
        this.write('-');
    });
    emitter.on('test fail', (test) => {
        this.write('F');
        this.errors.push(test);
    });
    emitter.on('test error', (error, test) => {
        this.write('E');
        test.message = `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
        this.errors.push(test);
    });
};
DotReporter.prototype.write = function write(str) {
    process.stdout.write(str);
};
exports.default = DotReporter;

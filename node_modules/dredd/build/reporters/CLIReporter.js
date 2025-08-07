"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const reporterOutputLogger_1 = __importDefault(require("./reporterOutputLogger"));
const prettifyResponse_1 = __importDefault(require("../prettifyResponse"));
const CONNECTION_ERRORS = [
    'ECONNRESET',
    'ENOTFOUND',
    'ESOCKETTIMEDOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'EPIPE',
];
function CLIReporter(emitter, stats, inlineErrors, details) {
    this.type = 'cli';
    this.stats = stats;
    this.inlineErrors = inlineErrors;
    this.details = details;
    this.errors = [];
    this.configureEmitter(emitter);
    logger_1.default.debug(`Using '${this.type}' reporter.`);
}
CLIReporter.prototype.configureEmitter = function configureEmitter(emitter) {
    emitter.on('start', (apiDescriptions, callback) => {
        logger_1.default.debug('Beginning Dredd testing...');
        callback();
    });
    emitter.on('end', (callback) => {
        if (!this.inlineErrors) {
            if (this.errors.length) {
                reporterOutputLogger_1.default.info('Displaying failed tests...');
            }
            this.errors.forEach((test) => {
                reporterOutputLogger_1.default.fail(`${test.title} duration: ${test.duration}ms`);
                reporterOutputLogger_1.default.fail(test.message);
                if (test.request)
                    reporterOutputLogger_1.default.request(`\n${prettifyResponse_1.default(test.request)}\n`);
                if (test.expected)
                    reporterOutputLogger_1.default.expected(`\n${prettifyResponse_1.default(test.expected)}\n`);
                if (test.actual)
                    reporterOutputLogger_1.default.actual(`\n${prettifyResponse_1.default(test.actual)}\n\n`);
            });
        }
        if (this.stats.tests > 0) {
            reporterOutputLogger_1.default.complete(`${this.stats.passes} passing, ` +
                `${this.stats.failures} failing, ` +
                `${this.stats.errors} errors, ` +
                `${this.stats.skipped} skipped, ` +
                `${this.stats.tests} total`);
        }
        reporterOutputLogger_1.default.complete(`Tests took ${this.stats.duration}ms`);
        callback();
    });
    emitter.on('test pass', (test) => {
        reporterOutputLogger_1.default.pass(`${test.title} duration: ${test.duration}ms`);
        if (this.details) {
            reporterOutputLogger_1.default.request(`\n${prettifyResponse_1.default(test.request)}\n`);
            reporterOutputLogger_1.default.expected(`\n${prettifyResponse_1.default(test.expected)}\n`);
            reporterOutputLogger_1.default.actual(`\n${prettifyResponse_1.default(test.actual)}\n\n`);
        }
    });
    emitter.on('test skip', (test) => reporterOutputLogger_1.default.skip(test.title));
    emitter.on('test fail', (test) => {
        reporterOutputLogger_1.default.fail(`${test.title} duration: ${test.duration}ms`);
        if (this.inlineErrors) {
            reporterOutputLogger_1.default.fail(test.message);
            if (test.request) {
                reporterOutputLogger_1.default.request(`\n${prettifyResponse_1.default(test.request)}\n`);
            }
            if (test.expected) {
                reporterOutputLogger_1.default.expected(`\n${prettifyResponse_1.default(test.expected)}\n`);
            }
            if (test.actual) {
                reporterOutputLogger_1.default.actual(`\n${prettifyResponse_1.default(test.actual)}\n\n`);
            }
        }
        else {
            this.errors.push(test);
        }
    });
    emitter.on('test error', (error, test) => {
        if (CONNECTION_ERRORS.includes(error.code)) {
            test.message = 'Error connecting to server under test!';
            reporterOutputLogger_1.default.error(test.message);
        }
        else {
            reporterOutputLogger_1.default.error(error.stack);
        }
        reporterOutputLogger_1.default.error(`${test.title} duration: ${test.duration}ms`);
        if (!this.inlineErrors) {
            this.errors.push(test);
        }
    });
};
exports.default = CLIReporter;

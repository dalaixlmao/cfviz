"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const htmlencode_1 = __importDefault(require("htmlencode"));
const untildify_1 = __importDefault(require("untildify"));
const make_dir_1 = __importDefault(require("make-dir"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../logger"));
const reporterOutputLogger_1 = __importDefault(require("./reporterOutputLogger"));
const prettifyResponse_1 = __importDefault(require("../prettifyResponse"));
function XUnitReporter(emitter, stats, path, details) {
    events_1.EventEmitter.call(this);
    this.type = 'xunit';
    this.stats = stats;
    this.details = details;
    this.path = this.sanitizedPath(path);
    this.configureEmitter(emitter);
    logger_1.default.debug(`Using '${this.type}' reporter.`);
}
XUnitReporter.prototype.updateSuiteStats = function updateSuiteStats(path, stats, callback) {
    fs_1.default.readFile(path, (err, data) => {
        if (!err) {
            data = data.toString();
            const position = data.toString().indexOf('\n');
            if (position !== -1) {
                const restOfFile = data.substr(position + 1);
                const newStats = this.toTag('testsuite', {
                    name: 'Dredd Tests',
                    tests: stats.tests,
                    failures: stats.failures,
                    errors: stats.errors,
                    skip: stats.skipped,
                    timestamp: new Date().toUTCString(),
                    time: stats.duration / 1000,
                }, false);
                const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
                fs_1.default.writeFile(path, `${xmlHeader}\n${newStats}\n${restOfFile}</testsuite>`, (error) => {
                    if (error) {
                        reporterOutputLogger_1.default.error(error);
                    }
                    callback();
                });
            }
            else {
                callback();
            }
        }
        else {
            reporterOutputLogger_1.default.error(err);
            callback();
        }
    });
};
XUnitReporter.prototype.cdata = function cdata(str) {
    return `<![CDATA[${str}]]>`;
};
XUnitReporter.prototype.appendLine = function appendLine(path, line) {
    fs_1.default.appendFileSync(path, `${line}\n`);
};
XUnitReporter.prototype.toTag = function toTag(name, attrs, close, content) {
    const end = close ? '/>' : '>';
    const pairs = [];
    if (attrs) {
        Object.keys(attrs).forEach((key) => pairs.push(`${key}="${attrs[key]}"`));
    }
    let tag = `<${name}${pairs.length ? ` ${pairs.join(' ')}` : ''}${end}`;
    if (content) {
        tag += `${content}</${name}${end}`;
    }
    return tag;
};
XUnitReporter.prototype.sanitizedPath = function sanitizedPath(path = './report.xml') {
    const filePath = path_1.default.resolve(untildify_1.default(path));
    if (fs_1.default.existsSync(filePath)) {
        logger_1.default.warn(`File exists at ${filePath}, will be overwritten...`);
        fs_1.default.unlinkSync(filePath);
    }
    return filePath;
};
XUnitReporter.prototype.configureEmitter = function configureEmitter(emitter) {
    emitter.on('start', (apiDescriptions, callback) => {
        make_dir_1.default(path_1.default.dirname(this.path))
            .then(() => {
            this.appendLine(this.path, this.toTag('testsuite', {
                name: 'Dredd Tests',
                tests: this.stats.tests,
                failures: this.stats.failures,
                errors: this.stats.errors,
                skip: this.stats.skipped,
                timestamp: new Date().toUTCString(),
                time: this.stats.duration / 1000,
            }, false));
            callback();
        })
            .catch((err) => {
            reporterOutputLogger_1.default.error(err);
            callback();
        });
    });
    emitter.on('end', (callback) => {
        this.updateSuiteStats(this.path, this.stats, callback);
    });
    emitter.on('test pass', (test) => {
        const attrs = {
            name: htmlencode_1.default.htmlEncode(test.title),
            time: test.duration / 1000,
        };
        if (this.details) {
            const deets = `\
\nRequest:
${prettifyResponse_1.default(test.request)}
Expected:
${prettifyResponse_1.default(test.expected)}
Actual:
${prettifyResponse_1.default(test.actual)}\
`;
            this.appendLine(this.path, this.toTag('testcase', attrs, false, this.toTag('system-out', null, false, this.cdata(deets))));
        }
        else {
            this.appendLine(this.path, this.toTag('testcase', attrs, true));
        }
    });
    emitter.on('test skip', (test) => {
        const attrs = {
            name: htmlencode_1.default.htmlEncode(test.title),
            time: test.duration / 1000,
        };
        this.appendLine(this.path, this.toTag('testcase', attrs, false, this.toTag('skipped', null, true)));
    });
    emitter.on('test fail', (test) => {
        const attrs = {
            name: htmlencode_1.default.htmlEncode(test.title),
            time: test.duration / 1000,
        };
        const diff = `\
Message:
${test.message}
Request:
${prettifyResponse_1.default(test.request)}
Expected:
${prettifyResponse_1.default(test.expected)}
Actual:
${prettifyResponse_1.default(test.actual)}\
`;
        this.appendLine(this.path, this.toTag('testcase', attrs, false, this.toTag('failure', null, false, this.cdata(diff))));
    });
    emitter.on('test error', (error, test) => {
        const attrs = {
            name: htmlencode_1.default.htmlEncode(test.title),
            time: test.duration / 1000,
        };
        const errorMessage = `\nError: \n${error}\nStacktrace: \n${error.stack}`;
        this.appendLine(this.path, this.toTag('testcase', attrs, false, this.toTag('failure', null, false, this.cdata(errorMessage))));
    });
};
util_1.inherits(XUnitReporter, events_1.EventEmitter);
exports.default = XUnitReporter;

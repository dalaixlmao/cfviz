"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ApiaryReporter_1 = __importDefault(require("./reporters/ApiaryReporter"));
const BaseReporter_1 = __importDefault(require("./reporters/BaseReporter"));
const CLIReporter_1 = __importDefault(require("./reporters/CLIReporter"));
const DotReporter_1 = __importDefault(require("./reporters/DotReporter"));
const HTMLReporter_1 = __importDefault(require("./reporters/HTMLReporter"));
const MarkdownReporter_1 = __importDefault(require("./reporters/MarkdownReporter"));
const NyanReporter_1 = __importDefault(require("./reporters/NyanReporter"));
const XUnitReporter_1 = __importDefault(require("./reporters/XUnitReporter"));
const logger_1 = __importDefault(require("./logger"));
const fileReporters = ['xunit', 'html', 'markdown', 'apiary'];
const cliReporters = ['dot', 'nyan'];
function intersection(a, b) {
    if (a.length > b.length) {
        [a, b] = Array.from([b, a]);
    }
    return Array.from(a).filter((value) => Array.from(b).includes(value));
}
function configureReporters(config, stats, runner) {
    addReporter('base', config.emitter, stats);
    const reporters = config.reporter;
    const outputs = config.output;
    logger_1.default.debug('Configuring reporters:', reporters, outputs);
    function addCli(reportersArr) {
        if (reportersArr.length > 0) {
            const usedCliReporters = intersection(reportersArr, cliReporters);
            if (usedCliReporters.length === 0) {
                return new CLIReporter_1.default(config.emitter, stats, config['inline-errors'], config.details);
            }
            return addReporter(usedCliReporters[0], config.emitter, stats);
        }
        return new CLIReporter_1.default(config.emitter, stats, config['inline-errors'], config.details);
    }
    function addReporter(reporter, emitter, statistics, path) {
        switch (reporter) {
            case 'xunit':
                return new XUnitReporter_1.default(emitter, statistics, path, config.details);
            case 'dot':
                return new DotReporter_1.default(emitter, statistics);
            case 'nyan':
                return new NyanReporter_1.default(emitter, statistics);
            case 'html':
                return new HTMLReporter_1.default(emitter, statistics, path, config.details);
            case 'markdown':
                return new MarkdownReporter_1.default(emitter, statistics, path, config.details);
            case 'apiary':
                return new ApiaryReporter_1.default(emitter, statistics, config, runner);
            default:
                // I don't even know where to begin...
                // TODO: DESIGN / REFACTOR WHOLE REPORTER(S) API FROM SCRATCH, THIS IS MADNESS!!1
                new BaseReporter_1.default(emitter, statistics);
        }
    }
    addCli(reporters);
    const usedFileReporters = intersection(reporters, fileReporters);
    stats.fileBasedReporters = usedFileReporters.length;
    if (usedFileReporters.length > 0) {
        let usedFileReportersLength = usedFileReporters.length;
        if (reporters.indexOf('apiary') > -1) {
            usedFileReportersLength -= 1;
        }
        if (usedFileReportersLength > outputs.length) {
            logger_1.default.warn(`
There are more reporters requiring output paths than there are output paths
provided. Using default paths for additional file-based reporters.
`);
        }
        return usedFileReporters.map((usedFileReporter, index) => {
            const path = outputs[index] ? outputs[index] : undefined;
            return addReporter(usedFileReporter, config.emitter, stats, path);
        });
    }
}
exports.default = configureReporters;

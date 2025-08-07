"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const reporterOutputLogger_1 = __importDefault(require("../reporters/reporterOutputLogger"));
/**
 * Applies logging options from the given configuration.
 * Operates on the validated normalized config.
 */
function applyLoggingOptions(config) {
    if (config.color === false) {
        logger_1.default.transports.console.colorize = false;
        reporterOutputLogger_1.default.transports.console.colorize = false;
    }
    // TODO https://github.com/apiaryio/dredd/issues/1346
    if (config.loglevel) {
        const loglevel = config.loglevel.toLowerCase();
        if (loglevel === 'silent') {
            logger_1.default.transports.console.silent = true;
        }
        else if (loglevel === 'warning') {
            logger_1.default.transports.console.level = 'warn';
        }
        else if (loglevel === 'debug') {
            logger_1.default.transports.console.level = 'debug';
            logger_1.default.transports.console.timestamp = true;
        }
        else if (['warn', 'error'].includes(loglevel)) {
            logger_1.default.transports.console.level = loglevel;
        }
        else {
            logger_1.default.transports.console.level = 'warn';
            throw new Error(`The logging level '${loglevel}' is unsupported, ` +
                'supported are: silent, error, warning, debug');
        }
    }
    else {
        logger_1.default.transports.console.level = 'warn';
    }
}
exports.default = applyLoggingOptions;

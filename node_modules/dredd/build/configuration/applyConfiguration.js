"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ramda_1 = __importDefault(require("ramda"));
const events_1 = require("events");
const logger_1 = __importDefault(require("../logger"));
const getProxySettings_1 = __importDefault(require("../getProxySettings"));
const applyLoggingOptions_1 = __importDefault(require("./applyLoggingOptions"));
const validateConfig_1 = __importDefault(require("./validateConfig"));
const normalizeConfig_1 = __importDefault(require("./normalizeConfig"));
exports.DEFAULT_CONFIG = {
    http: {},
    endpoint: null,
    // TODO https://github.com/apiaryio/dredd/issues/1345
    // When the next line is uncommented, "emitter" property will be processed
    // during "R.mergeDeepX" call, resulting into EventEmitter's instance prototype
    // not being copied. This breaks event emitter.
    // emitter: new EventEmitter(),
    custom: {
        cwd: process.cwd(),
    },
    path: [],
    apiDescriptions: [],
    'dry-run': false,
    reporter: null,
    output: null,
    header: null,
    user: null,
    'inline-errors': false,
    details: false,
    method: [],
    only: [],
    color: true,
    loglevel: 'warn',
    sorted: false,
    names: false,
    hookfiles: [],
    language: 'nodejs',
    'hooks-worker-timeout': 5000,
    'hooks-worker-connect-timeout': 1500,
    'hooks-worker-connect-retry': 500,
    'hooks-worker-after-connect-wait': 100,
    'hooks-worker-term-timeout': 5000,
    'hooks-worker-term-retry': 500,
    'hooks-worker-handler-host': '127.0.0.1',
    'hooks-worker-handler-port': 61321,
};
// Flattens given configuration Object, removing nested "options" key.
// This makes it possible to use nested "options" key without introducing
// a breaking change to the library's public API.
// TODO https://github.com/apiaryio/dredd/issues/1344
function flattenConfig(config) {
    // Rename "root.server" key to "root.endpoint".
    // Necessary to prevent options values collision between:
    // - root.server - stands for server url.
    // - options.server - stands for a server command (i.e. "npm start").
    // - options.endpoint - semantically the same as "root.server"
    //
    // NOTE It's important to rename the option here, as when flattened
    // there is no difference between "root.server" and "options.server"
    // which serve entirely different purposes. Thus it cannot be coerced
    // on the normalization layer.
    const aliasedConfig = ramda_1.default.when(ramda_1.default.has('server'), ramda_1.default.compose(ramda_1.default.dissoc('server'), ramda_1.default.assoc('endpoint', ramda_1.default.prop('server', config))))(config);
    const rootOptions = ramda_1.default.omit(['options'], aliasedConfig);
    const nestedOptions = ramda_1.default.prop('options', aliasedConfig);
    if (nestedOptions) {
        logger_1.default.warn('Deprecated usage of `options` in Dredd configuration.');
    }
    return ramda_1.default.mergeDeepLeft(nestedOptions || {}, rootOptions);
}
function resolveConfig(config) {
    const inConfig = ramda_1.default.compose(
    // Set "emitter" property explicitly to preserve its prototype.
    // During deep merge Ramda omits prototypes, breaking emitter.
    ramda_1.default.assoc('emitter', ramda_1.default.propOr(new events_1.EventEmitter(), 'emitter', config)), ramda_1.default.mergeDeepRight(exports.DEFAULT_CONFIG), flattenConfig)(config);
    // Validate Dredd configuration
    const { warnings, errors } = validateConfig_1.default(inConfig);
    warnings.forEach((message) => logger_1.default.warn(message));
    errors.forEach((message) => logger_1.default.error(message));
    // Fail fast upon any Dredd configuration errors
    if (errors.length > 0) {
        throw new Error('Could not configure Dredd');
    }
    return {
        config: normalizeConfig_1.default(inConfig),
        warnings,
        errors,
    };
}
exports.resolveConfig = resolveConfig;
function applyConfiguration(config) {
    const { config: resolvedConfig } = resolveConfig(config);
    applyLoggingOptions_1.default(resolvedConfig);
    // Log information about the HTTP proxy settings
    const proxySettings = getProxySettings_1.default(process.env);
    if (proxySettings.length) {
        logger_1.default.warn(`HTTP(S) proxy specified by environment variables: ${proxySettings.join(', ')}. ` +
            'Please read documentation on how Dredd works with proxies: ' +
            'https://dredd.org/en/latest/how-it-works/#using-https-proxy');
    }
    return resolvedConfig;
}
exports.default = applyConfiguration;

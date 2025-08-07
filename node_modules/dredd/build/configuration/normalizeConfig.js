"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ramda_1 = __importDefault(require("ramda"));
/**
 * Removes options that are no longer supported by Dredd.
 * Any coercion will not be performed, as they are removed prior to coercion.
 */
exports.removeUnsupportedOptions = ramda_1.default.compose(ramda_1.default.dissoc('q'), ramda_1.default.dissoc('silent'), ramda_1.default.dissoc('t'), ramda_1.default.dissoc('timestamp'), ramda_1.default.dissoc('blueprintPath'), ramda_1.default.dissoc('b'), ramda_1.default.dissoc('sandbox'));
const getUserHeader = ramda_1.default.compose((token) => `Authorization: Basic ${token}`, (user) => Buffer.from(user).toString('base64'));
const updateHeaderWithUser = ramda_1.default.compose(ramda_1.default.unnest, ramda_1.default.adjust(0, getUserHeader), ramda_1.default.values, ramda_1.default.pick(['user', 'header']));
exports.coerceToArray = ramda_1.default.cond([
    [ramda_1.default.is(String), (v) => [v]],
    [ramda_1.default.isNil, ramda_1.default.always([])],
    [ramda_1.default.T, ramda_1.default.identity],
]);
function coerceToBoolean(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    if (value)
        return true;
    return false;
}
exports.coerceToBoolean = coerceToBoolean;
/**
 * Appends authorization header when supplied with "user" option.
 */
exports.coerceUserOption = ramda_1.default.when(ramda_1.default.propSatisfies(ramda_1.default.complement(ramda_1.default.isNil), 'user'), ramda_1.default.compose(ramda_1.default.dissoc('user'), ramda_1.default.over(ramda_1.default.lens(updateHeaderWithUser, ramda_1.default.assoc('header')), ramda_1.default.identity)));
const mapIndexed = ramda_1.default.addIndex(ramda_1.default.map);
exports.coerceApiDescriptions = ramda_1.default.compose(mapIndexed((content, index) => ({
    location: `configuration.apiDescriptions[${index}]`,
    content: ramda_1.default.when(ramda_1.default.has('content'), ramda_1.default.prop('content'), content),
})), exports.coerceToArray);
const coerceLevel = ramda_1.default.compose(ramda_1.default.cond([
    [ramda_1.default.includes(ramda_1.default.__, ['silly', 'debug', 'verbose']), ramda_1.default.always('debug')],
    [ramda_1.default.equals('error'), ramda_1.default.always('error')],
    [ramda_1.default.equals('silent'), ramda_1.default.always('silent')],
    [ramda_1.default.T, ramda_1.default.always('warn')],
]), ramda_1.default.either(ramda_1.default.prop('l'), ramda_1.default.prop('level')));
/**
 * Coerces the given deprecated value of the "level" option
 * and returns the supported value for "loglevel" option.
 */
exports.coerceDeprecatedLevelOption = ramda_1.default.when(ramda_1.default.either(ramda_1.default.has('l'), ramda_1.default.has('level')), ramda_1.default.compose(ramda_1.default.dissoc('l'), ramda_1.default.dissoc('level'), ramda_1.default.over(ramda_1.default.lens(coerceLevel, ramda_1.default.assoc('loglevel')), ramda_1.default.identity)));
const coerceDataToApiDescriptions = ramda_1.default.compose(ramda_1.default.unnest, ramda_1.default.values, ramda_1.default.evolve({
    data: ramda_1.default.compose(ramda_1.default.map(([location, content]) => {
        const apiDescription = typeof content === 'string'
            ? { location, content }
            : {
                location: content.filename,
                content: content.raw,
            };
        return apiDescription;
    }), ramda_1.default.toPairs),
}), ramda_1.default.pick(['apiDescriptions', 'data']));
exports.coerceDeprecatedDataOption = ramda_1.default.when(ramda_1.default.propSatisfies(ramda_1.default.complement(ramda_1.default.isNil), 'data'), ramda_1.default.compose(ramda_1.default.dissoc('data'), ramda_1.default.over(ramda_1.default.lens(coerceDataToApiDescriptions, ramda_1.default.assoc('apiDescriptions')), ramda_1.default.identity)));
exports.coerceColorOption = ramda_1.default.when(ramda_1.default.has('c'), ramda_1.default.compose(ramda_1.default.dissoc('c'), ramda_1.default.over(ramda_1.default.lens(ramda_1.default.prop('c'), ramda_1.default.assoc('color')), coerceToBoolean)));
const coerceDeprecatedOptions = ramda_1.default.compose(exports.coerceColorOption, exports.coerceDeprecatedDataOption, exports.coerceDeprecatedLevelOption);
const coerceOptions = ramda_1.default.compose(coerceDeprecatedOptions, exports.coerceUserOption, ramda_1.default.evolve({
    color: coerceToBoolean,
    apiDescriptions: exports.coerceApiDescriptions,
    reporter: exports.coerceToArray,
    output: exports.coerceToArray,
    header: exports.coerceToArray,
    method: ramda_1.default.compose(ramda_1.default.map(ramda_1.default.toUpper), exports.coerceToArray),
    only: exports.coerceToArray,
    path: exports.coerceToArray,
    hookfiles: exports.coerceToArray,
}));
const normalizeConfig = ramda_1.default.compose(coerceOptions, exports.removeUnsupportedOptions);
exports.default = normalizeConfig;

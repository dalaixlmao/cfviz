"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clone_1 = __importDefault(require("clone"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
function save(argsOrigin, path) {
    if (!path) {
        path = './dredd.yml';
    }
    const args = clone_1.default(argsOrigin);
    args.blueprint = args._[0];
    args.endpoint = args._[1];
    Object.keys(args).forEach((key) => {
        if (key.length === 1) {
            delete args[key];
        }
    });
    delete args.$0;
    delete args._;
    fs_1.default.writeFileSync(path, js_yaml_1.default.dump(args));
}
exports.save = save;
function load(path) {
    if (!path) {
        path = './dredd.yml';
    }
    const yamlData = fs_1.default.readFileSync(path);
    const data = js_yaml_1.default.safeLoad(yamlData);
    data._ = [data.blueprint, data.endpoint];
    delete data.blueprint;
    delete data.endpoint;
    return data;
}
exports.load = load;
function parseCustom(customArray) {
    const output = {};
    if (Array.isArray(customArray)) {
        for (const string of customArray) {
            const splitted = string.split(/:(.+)?/);
            output[splitted[0]] = splitted[1];
        }
    }
    return output;
}
exports.parseCustom = parseCustom;

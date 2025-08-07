"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = __importDefault(require("child_process"));
const path_1 = __importDefault(require("path"));
// Docs:
// - https://golang.org/doc/code.html#GOPATH
// - https://golang.org/cmd/go/#hdr-GOPATH_environment_variable
function getGoBinary(callback) {
    const goBin = process.env.GOBIN;
    if (goBin) {
        process.nextTick(() => callback(null, goBin));
    }
    else if (process.env.GOPATH) {
        process.nextTick(() => callback(null, path_1.default.join(process.env.GOPATH, 'bin')));
    }
    else {
        child_process_1.default.exec('go env GOPATH', (err, stdout) => {
            if (err) {
                return callback(err);
            }
            callback(null, path_1.default.join(stdout.trim(), 'bin'));
        });
    }
}
exports.default = getGoBinary;

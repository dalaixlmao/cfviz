"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const request_1 = __importDefault(require("request"));
const isURL_1 = __importDefault(require("./isURL"));
function getErrorFromResponse(response, hasBody) {
    const contentType = response.headers['content-type'];
    if (hasBody) {
        const bodyDescription = contentType
            ? `'${contentType}' body`
            : 'body without Content-Type';
        return new Error(`Dredd got HTTP ${response.statusCode} response with ${bodyDescription}`);
    }
    return new Error(`Dredd got HTTP ${response.statusCode} response without body`);
}
function readRemoteFile(uri, options, callback) {
    if (typeof options === 'function') {
        [options, callback] = [{}, options];
    }
    const request = options.request || request_1.default;
    const httpOptions = Object.assign({}, options.http || {});
    httpOptions.uri = uri;
    httpOptions.timeout = 5000; // ms, limits both connection time and server response time
    try {
        request(httpOptions, (error, response, responseBody) => {
            if (error) {
                callback(error);
            }
            else if (!response) {
                callback(new Error('Unexpected error'));
            }
            else if (!responseBody ||
                response.statusCode < 200 ||
                response.statusCode >= 300) {
                callback(getErrorFromResponse(response, !!responseBody));
            }
            else {
                callback(null, responseBody);
            }
        });
    }
    catch (error) {
        process.nextTick(() => callback(error));
    }
}
function readLocalFile(path, callback) {
    fs_1.default.readFile(path, 'utf8', (error, data) => {
        if (error) {
            callback(error);
            return;
        }
        callback(null, data);
    });
}
function readLocation(location, options, callback) {
    if (typeof options === 'function') {
        [options, callback] = [{}, options];
    }
    if (isURL_1.default(location)) {
        readRemoteFile(location, options, callback);
    }
    else {
        readLocalFile(location, callback);
    }
}
exports.default = readLocation;

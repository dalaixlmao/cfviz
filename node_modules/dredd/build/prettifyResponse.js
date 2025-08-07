"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const html_1 = __importDefault(require("html"));
const logger_1 = __importDefault(require("./logger"));
function prettifyResponse(response) {
    let contentType;
    function stringify(obj) {
        try {
            if (typeof obj === 'string') {
                obj = JSON.parse(obj);
            }
            obj = JSON.stringify(obj, null, 2);
        }
        catch (e) {
            logger_1.default.debug(`Could not stringify: ${obj}`);
        }
        return obj;
    }
    function prettifyBody(body, contentKind) {
        switch (contentKind) {
            case 'text/html':
                body = html_1.default.prettyPrint(body, { indent_size: 2 });
                break;
            default:
                body = stringify(body);
        }
        return body;
    }
    if (response && response.headers) {
        contentType =
            response.headers['content-type'] || response.headers['Content-Type'];
    }
    let stringRepresentation = '';
    for (const key of Object.keys(response || {})) {
        let value = response[key];
        if (key === 'body') {
            value = `\n${prettifyBody(value, contentType)}`;
        }
        else if (key === 'schema') {
            value = `\n${stringify(value)}`;
        }
        else if (key === 'headers') {
            let header = '\n';
            for (const hkey of Object.keys(value || {})) {
                const hval = value[hkey];
                header += `    ${hkey}: ${hval}\n`;
            }
            value = header;
        }
        stringRepresentation += `${key}: ${value}\n`;
    }
    return stringRepresentation;
}
exports.default = prettifyResponse;

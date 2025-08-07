"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Decides whether given string is a URL or not
 */
function isURL(location) {
    return /^http(s)?:\/\//.test(location);
}
exports.default = isURL;

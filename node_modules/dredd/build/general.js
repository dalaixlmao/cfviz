"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HTTPMethod;
(function (HTTPMethod) {
    HTTPMethod["CONNECT"] = "CONNECT";
    HTTPMethod["OPTIONS"] = "OPTIONS";
    HTTPMethod["POST"] = "POST";
    HTTPMethod["GET"] = "GET";
    HTTPMethod["HEAD"] = "HEAD";
    HTTPMethod["PUT"] = "PUT";
    HTTPMethod["PATCH"] = "PATCH";
    HTTPMethod["LINK"] = "LINK";
    HTTPMethod["UNLINK"] = "UNLINK";
    HTTPMethod["DELETE"] = "DELETE";
    HTTPMethod["TRACE"] = "TRACE";
})(HTTPMethod = exports.HTTPMethod || (exports.HTTPMethod = {}));
var BodyEncoding;
(function (BodyEncoding) {
    BodyEncoding[BodyEncoding["utf-8"] = 0] = "utf-8";
    BodyEncoding[BodyEncoding["base64"] = 1] = "base64";
})(BodyEncoding = exports.BodyEncoding || (exports.BodyEncoding = {}));
var TransactionTestStatus;
(function (TransactionTestStatus) {
    TransactionTestStatus[TransactionTestStatus["pass"] = 0] = "pass";
    TransactionTestStatus[TransactionTestStatus["fail"] = 1] = "fail";
    TransactionTestStatus[TransactionTestStatus["skip"] = 2] = "skip";
})(TransactionTestStatus = exports.TransactionTestStatus || (exports.TransactionTestStatus = {}));

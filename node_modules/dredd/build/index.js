"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// This is an explicit package entry for proper exports.
// When exported via "export default", the Dredd package
// would need to be required as:
//
// const Dredd = require('dredd').default
//
// To prevent this, using "module.exports".
const Dredd_1 = __importDefault(require("./Dredd"));
module.exports = Dredd_1.default;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const which_1 = __importDefault(require("which"));
exports.default = {
    which(command) {
        try {
            which_1.default.sync(command);
            return true;
        }
        catch (e) {
            return false;
        }
    },
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static info(message, data) {
        console.log(`ℹ️ [${new Date().toISOString()}] ${message}`, data || "");
    }
    static error(message, error) {
        console.error(`❌ [${new Date().toISOString()}] ${message}`, error || "");
    }
    static warn(message, data) {
        console.warn(`⚠️ [${new Date().toISOString()}] ${message}`, data || "");
    }
    static success(message, data) {
        console.log(`✅ [${new Date().toISOString()}] ${message}`, data || "");
    }
}
exports.Logger = Logger;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceProvider = void 0;
// AI 服务商枚举（方便扩展）
var AIServiceProvider;
(function (AIServiceProvider) {
    AIServiceProvider["OpenAI"] = "openai";
    AIServiceProvider["XunFei"] = "xunfei";
    AIServiceProvider["Baidu"] = "baidu";
    AIServiceProvider["Qwen"] = "qwen";
})(AIServiceProvider || (exports.AIServiceProvider = AIServiceProvider = {}));

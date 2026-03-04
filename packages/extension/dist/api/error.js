"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIResponseParseError = exports.AIRequestFailedError = exports.APIKeyMissingError = exports.AIError = void 0;
// AI 调用错误基类
class AIError extends Error {
    constructor(message, code = 'AI_ERROR') {
        super(message);
        this.name = 'AIError';
        this.code = code;
    }
}
exports.AIError = AIError;
// API Key 缺失错误
class APIKeyMissingError extends AIError {
    constructor() {
        super('AI API Key 未配置，请在 VSCode 设置中填写 aiComment.apiKey', 'API_KEY_MISSING');
        this.name = 'APIKeyMissingError';
    }
}
exports.APIKeyMissingError = APIKeyMissingError;
// 接口请求失败错误（修复：不再拼接"AI 请求失败："前缀，避免重复）
class AIRequestFailedError extends AIError {
    constructor(message, statusCode) {
        super(message, 'REQUEST_FAILED');
        this.name = 'AIRequestFailedError';
        this.statusCode = statusCode;
    }
}
exports.AIRequestFailedError = AIRequestFailedError;
// 响应解析错误
class AIResponseParseError extends AIError {
    constructor() {
        super('AI 响应格式解析失败，请检查服务商接口是否正常', 'RESPONSE_PARSE_ERROR');
        this.name = 'AIResponseParseError';
    }
}
exports.AIResponseParseError = AIResponseParseError;

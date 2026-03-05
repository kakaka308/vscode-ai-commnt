"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommentWithOpenAI = generateCommentWithOpenAI;
const axios_1 = __importStar(require("axios"));
const error_1 = require("./error");
const config_1 = require("../config/config");
const shared_1 = require("shared");
async function generateCommentWithOpenAI(params) {
    const config = (0, config_1.getExtensionConfig)();
    const apiKey = config.apiKey;
    const model = config.model || 'gpt-3.5-turbo';
    const endpoint = config.openaiEndpoint || 'https://api.openai.com/v1/chat/completions';
    if (!apiKey)
        throw new error_1.APIKeyMissingError();
    const { code, language, commentStyle, isWholeFile } = params;
    // 统一使用 shared 的 buildPrompt 构建
    const { system: systemPrompt, user: userPrompt } = (0, shared_1.buildPrompt)(config.commentMode, language, code, commentStyle, isWholeFile ?? false);
    const requestData = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
    };
    try {
        const response = await axios_1.default.post(endpoint, requestData, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        const data = response.data;
        if (!data?.choices?.[0]?.message?.content) {
            throw new error_1.AIResponseParseError();
        }
        const rawContent = data.choices[0].message.content;
        // 统一使用 shared 的清洗函数处理响应
        const comment = config.commentMode === 'concise'
            ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(rawContent), isWholeFile ?? false, language)
            : (0, shared_1.cleanDetailedResponse)(rawContent);
        return { comment, success: true };
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            const message = error.response?.data?.error?.message || error.message;
            throw new error_1.AIRequestFailedError(message, error.response?.status);
        }
        if (error instanceof error_1.AIError)
            throw error;
        throw new error_1.AIError(`未知错误：${error.message}`);
    }
}

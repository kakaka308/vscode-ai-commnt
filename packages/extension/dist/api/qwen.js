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
exports.generateCommentWithQwen = generateCommentWithQwen;
const axios_1 = __importStar(require("axios"));
const error_1 = require("./error");
const config_1 = require("../config/config");
const shared_1 = require("shared");
async function generateCommentWithQwen(params) {
    const config = await (0, config_1.getExtensionConfig)();
    const apiKey = config.qwenApiKey;
    const model = config.qwenModel || 'qwen-turbo';
    const endpoint = config.qwenEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    if (!apiKey)
        throw new error_1.AIError('未配置 Qwen API Key');
    const { code, language, commentStyle, isWholeFile } = params;
    if (!code?.trim())
        throw new error_1.AIError('代码内容为空，无法生成注释');
    const { system, user } = (0, shared_1.buildPrompt)(config.commentMode, language, code, commentStyle, isWholeFile ?? false);
    const userPrompt = `${system}\n\n${user}`;
    try {
        const response = await axios_1.default.post(endpoint, { model, messages: [{ role: 'user', content: userPrompt }] }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        const data = response.data;
        if (data?.code && data.code !== 'Success') {
            throw new error_1.AIError(`Qwen API Error: [${data.code}] ${data.message}`);
        }
        if (!data?.choices?.[0]?.message?.content) {
            throw new error_1.AIResponseParseError();
        }
        const rawContent = data.choices[0].message.content;
        const comment = config.commentMode === 'concise'
            ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(rawContent), isWholeFile ?? false, language)
            : (0, shared_1.cleanDetailedResponse)(rawContent);
        return { success: true, comment };
    }
    catch (error) {
        if (error instanceof error_1.AIError)
            throw error;
        if (error instanceof axios_1.AxiosError) {
            const detail = error.response?.data?.message || error.message;
            const status = error.response?.status ?? 0;
            throw new error_1.AIRequestFailedError(`[${status}] ${detail}`, status);
        }
        throw new error_1.AIError(`Qwen API Error: ${error.message}`);
    }
}

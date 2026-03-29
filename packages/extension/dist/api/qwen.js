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
const retry_1 = require("./retry");
const shared_1 = require("shared");
async function generateCommentWithQwen(params, onChunk, signal // ← 新增
) {
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
    if (onChunk && config.commentMode === 'detailed') {
        return qwenStreamRequest(endpoint, apiKey, model, userPrompt, onChunk, signal);
    }
    try {
        const response = await (0, retry_1.withRetry)(() => axios_1.default.post(endpoint, { model, messages: [{ role: 'user', content: userPrompt }] }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }), { signal } // ← 传入 signal
        );
        const data = response.data;
        if (data?.code && data.code !== 'Success') {
            throw new error_1.AIError(`Qwen API Error: [${data.code}] ${data.message}`);
        }
        if (!data?.choices?.[0]?.message?.content) {
            throw new error_1.AIResponseParseError();
        }
        const raw = data.choices[0].message.content;
        const comment = config.commentMode === 'concise'
            ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(raw), isWholeFile ?? false, language)
            : (0, shared_1.cleanDetailedResponse)(raw);
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
async function qwenStreamRequest(endpoint, apiKey, model, userPrompt, onChunk, signal // ← 新增
) {
    const response = await (0, retry_1.withRetry)(() => axios_1.default.post(endpoint, {
        model,
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
        max_tokens: 4096
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 0
    }), { signal } // ← 传入 signal
    );
    return new Promise((resolve, reject) => {
        let fullText = '';
        let buffer = '';
        signal?.addEventListener('abort', () => {
            reject(new Error('用户已取消'));
        });
        response.data.on('data', (chunk) => {
            if (signal?.aborted)
                return;
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:'))
                    continue;
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr === '[DONE]') {
                    resolve({ success: true, comment: fullText });
                    return;
                }
                try {
                    const parsed = JSON.parse(jsonStr);
                    const delta = parsed.choices?.[0]?.delta?.content ?? '';
                    if (delta) {
                        fullText += delta;
                        onChunk(delta);
                    }
                }
                catch {
                    // 忽略解析失败的行
                }
            }
        });
        response.data.on('error', (err) => {
            reject(new error_1.AIError(`Qwen 流式请求失败: ${err.message}`));
        });
        response.data.on('end', () => {
            if (fullText)
                resolve({ success: true, comment: fullText });
            else
                reject(new error_1.AIError('Qwen 流式响应提前结束'));
        });
    });
}

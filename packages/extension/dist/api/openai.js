"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommentWithOpenAI = generateCommentWithOpenAI;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config/config");
const shared_1 = require("shared");
const error_1 = require("./error");
const retry_1 = require("./retry");
async function generateCommentWithOpenAI(params, onChunk, signal // ← 新增
) {
    const config = await (0, config_1.getExtensionConfig)();
    const apiKey = config.apiKey;
    if (!apiKey)
        throw new error_1.APIKeyMissingError();
    const { code, language, commentStyle, isWholeFile } = params;
    const { system, user } = (0, shared_1.buildPrompt)(config.commentMode, language, code, commentStyle, isWholeFile ?? false);
    if (onChunk && config.commentMode === 'detailed') {
        return streamRequest(config.openaiEndpoint, apiKey, config.model, system, user, onChunk, signal);
    }
    const response = await (0, retry_1.withRetry)(() => axios_1.default.post(config.openaiEndpoint, {
        model: config.model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ],
        temperature: 0.2
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 30000
    }), { signal } // ← 传入 signal
    );
    const raw = response.data.choices[0].message.content;
    const comment = config.commentMode === 'concise'
        ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(raw), isWholeFile ?? false, language)
        : (0, shared_1.cleanDetailedResponse)(raw);
    return { success: true, comment };
}
async function streamRequest(endpoint, apiKey, model, system, user, onChunk, signal // ← 新增
) {
    const response = await (0, retry_1.withRetry)(() => axios_1.default.post(endpoint, {
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ],
        stream: true,
        temperature: 0.2,
        max_tokens: 4096
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        responseType: 'stream',
        timeout: 0
    }), { signal } // ← 传入 signal
    );
    return new Promise((resolve, reject) => {
        let fullText = '';
        let buffer = '';
        // 用户取消时中断流
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
        response.data.on('error', reject);
        response.data.on('end', () => {
            if (fullText)
                resolve({ success: true, comment: fullText });
            else
                reject(new Error('流式响应提前结束'));
        });
    });
}

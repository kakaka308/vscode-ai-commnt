"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommentWithBaidu = generateCommentWithBaidu;
const axios_1 = __importDefault(require("axios"));
const error_1 = require("./error");
const config_1 = require("../config/config");
const retry_1 = require("./retry");
const shared_1 = require("shared");
// token 缓存
let cachedToken = null;
let tokenExpiresTime = 0;
async function getAccessToken(apiKey, secretKey) {
    if (cachedToken && Date.now() < tokenExpiresTime) {
        return cachedToken;
    }
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
    const response = await axios_1.default.post(url);
    if (response.data.error) {
        throw new error_1.AIError(`Baidu Auth Failed: ${response.data.error_description}`);
    }
    cachedToken = response.data.access_token;
    tokenExpiresTime = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
}
function getEndpoint(baiduModel) {
    if (baiduModel?.includes('4.0')) {
        return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
    }
    return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
}
async function generateCommentWithBaidu(params, onChunk) {
    const config = await (0, config_1.getExtensionConfig)();
    const apiKey = config.baiduApiKey;
    const secretKey = config.baiduSecretKey;
    if (!apiKey || !secretKey)
        throw new error_1.AIError('未配置 Baidu API Key 或 Secret Key');
    const accessToken = await getAccessToken(apiKey, secretKey);
    const endpoint = getEndpoint(config.baiduModel);
    const { code, language, commentStyle, isWholeFile } = params;
    const { system, user } = (0, shared_1.buildPrompt)(config.commentMode, language, code, commentStyle, isWholeFile ?? false);
    const userPrompt = `${system}\n\n${user}`;
    if (onChunk && config.commentMode === 'detailed') {
        return baiduStreamRequest(endpoint, accessToken, userPrompt, onChunk);
    }
    // 普通请求接入 withRetry
    try {
        const response = await (0, retry_1.withRetry)(() => axios_1.default.post(`${endpoint}?access_token=${accessToken}`, {
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.1
        }, { headers: { 'Content-Type': 'application/json' } }));
        const data = response.data;
        if (data.error_code) {
            throw new error_1.AIError(`Baidu API Error: ${data.error_msg}`);
        }
        const raw = data.result;
        const comment = config.commentMode === 'concise'
            ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(raw), isWholeFile ?? false, language)
            : (0, shared_1.cleanDetailedResponse)(raw);
        return { success: true, comment };
    }
    catch (error) {
        if (error instanceof error_1.AIError)
            throw error;
        throw new error_1.AIError(`Baidu Request Error: ${error.message}`);
    }
}
async function baiduStreamRequest(endpoint, accessToken, userPrompt, onChunk) {
    // 流式请求也接入 withRetry
    const response = await (0, retry_1.withRetry)(() => axios_1.default.post(`${endpoint}?access_token=${accessToken}`, {
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.1,
        stream: true
    }, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 60000
    }));
    return new Promise((resolve, reject) => {
        let fullText = '';
        let buffer = '';
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:'))
                    continue;
                const jsonStr = trimmed.slice(5).trim();
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error_code) {
                        reject(new error_1.AIError(`Baidu Stream Error: ${parsed.error_msg}`));
                        return;
                    }
                    const delta = parsed.result ?? '';
                    if (delta) {
                        fullText += delta;
                        onChunk(delta);
                    }
                    if (parsed.is_end) {
                        resolve({ success: true, comment: fullText });
                    }
                }
                catch {
                    // 忽略解析失败的行
                }
            }
        });
        response.data.on('error', (err) => {
            reject(new error_1.AIError(`Baidu 流式请求失败: ${err.message}`));
        });
        response.data.on('end', () => {
            if (fullText)
                resolve({ success: true, comment: fullText });
            else
                reject(new error_1.AIError('Baidu 流式响应提前结束'));
        });
    });
}

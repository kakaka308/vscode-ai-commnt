"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommentWithBaidu = generateCommentWithBaidu;
const axios_1 = __importDefault(require("axios"));
const error_1 = require("./error");
const config_1 = require("../config/config");
const shared_1 = require("shared");
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
async function generateCommentWithBaidu(params) {
    const config = await (0, config_1.getExtensionConfig)();
    const apiKey = config.baiduApiKey;
    const secretKey = config.baiduSecretKey;
    if (!apiKey || !secretKey)
        throw new error_1.AIError('未配置 Baidu API Key 或 Secret Key');
    const accessToken = await getAccessToken(apiKey, secretKey);
    let endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
    if (config.baiduModel?.includes('4.0')) {
        endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
    }
    const { code, language, commentStyle, isWholeFile } = params;
    const { system, user } = (0, shared_1.buildPrompt)(config.commentMode, language, code, commentStyle, isWholeFile ?? false);
    const userPrompt = `${system}\n\n${user}`;
    try {
        const response = await axios_1.default.post(`${endpoint}?access_token=${accessToken}`, { messages: [{ role: 'user', content: userPrompt }], temperature: 0.1 }, { headers: { 'Content-Type': 'application/json' } });
        const data = response.data;
        if (data.error_code) {
            throw new error_1.AIError(`Baidu API Error: ${data.error_msg}`);
        }
        const rawContent = data.result;
        const comment = config.commentMode === 'concise'
            ? (0, shared_1.generateConciseComment)((0, shared_1.cleanConciseResponse)(rawContent), isWholeFile ?? false, language)
            : (0, shared_1.cleanDetailedResponse)(rawContent);
        return { success: true, comment };
    }
    catch (error) {
        if (error instanceof error_1.AIError)
            throw error;
        throw new error_1.AIError(`Baidu Request Error: ${error.message}`);
    }
}

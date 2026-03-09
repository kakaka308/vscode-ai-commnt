"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComment = generateComment;
const types_1 = require("./types");
const openai_1 = require("./openai");
const qwen_1 = require("./qwen");
const baidu_1 = require("./baidu");
const error_1 = require("./error");
const config_1 = require("../config/config");
async function generateComment(params) {
    const config = await (0, config_1.getExtensionConfig)(); // 加 await
    const provider = (config.aiProvider || types_1.AIServiceProvider.OpenAI);
    switch (provider) {
        case types_1.AIServiceProvider.OpenAI:
            return await (0, openai_1.generateCommentWithOpenAI)(params);
        case types_1.AIServiceProvider.Qwen:
            return await (0, qwen_1.generateCommentWithQwen)(params);
        case types_1.AIServiceProvider.Baidu:
            return await (0, baidu_1.generateCommentWithBaidu)(params);
        case types_1.AIServiceProvider.XunFei:
            throw new error_1.AIError('讯飞星火暂未支持 (需要 WebSocket)');
        default:
            throw new error_1.AIError(`不支持的 AI 服务商：${provider}`);
    }
}

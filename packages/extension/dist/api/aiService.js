"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComment = generateComment;
const types_1 = require("./types");
const openai_1 = require("./openai");
const error_1 = require("./error");
const config_1 = require("../config/config");
/**
 * 统一 AI 注释生成入口（工厂模式：大厂扩展常用）
 * @param params 注释生成参数
 * @returns AIResponse
 */
async function generateComment(params) {
    // 获取当前配置的 AI 服务商（默认 OpenAI）
    const config = (0, config_1.getExtensionConfig)();
    const provider = (config.aiProvider || types_1.AIServiceProvider.OpenAI);
    // 根据服务商选择具体实现（扩展时只需加 case）
    switch (provider) {
        case types_1.AIServiceProvider.OpenAI:
            return await (0, openai_1.generateCommentWithOpenAI)(params);
        // case AIServiceProvider.XunFei:
        //   return await generateCommentWithXunFei(params); // 后续扩展
        // case AIServiceProvider.Baidu:
        //   return await generateCommentWithBaidu(params); // 后续扩展
        default:
            throw new error_1.AIError(`不支持的 AI 服务商：${provider}`);
    }
}

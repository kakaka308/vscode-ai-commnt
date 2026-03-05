"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripMarkdownCodeBlock = stripMarkdownCodeBlock;
exports.cleanDetailedResponse = cleanDetailedResponse;
exports.cleanConciseResponse = cleanConciseResponse;
/**
 * 去除 AI 返回内容中可能包裹的 Markdown 代码块标记
 * 例如：```typescript\n...\n``` → 纯代码
 */
function stripMarkdownCodeBlock(content) {
    return content
        .replace(/^```[\w]*\r?\n?/, '') // 去除开头的 ```lang
        .replace(/\r?\n?```$/, '') // 去除结尾的 ```
        .trim();
}
/**
 * 清洗详细模式的 AI 响应
 * - 去除 Markdown 代码块
 * - 统一换行符
 */
function cleanDetailedResponse(content) {
    return stripMarkdownCodeBlock(content)
        .replace(/\r\n/g, '\n'); // 统一换行符
}
/**
 * 清洗简洁模式的 AI 响应
 * - 去除多余空行和首尾空白
 * - 只保留第一行（防止 AI 多输出）
 */
function cleanConciseResponse(content) {
    const firstLine = content.trim().split('\n')[0];
    return firstLine.trim();
}

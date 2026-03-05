/**
 * 去除 AI 返回内容中可能包裹的 Markdown 代码块标记
 * 例如：```typescript\n...\n``` → 纯代码
 */
export declare function stripMarkdownCodeBlock(content: string): string;
/**
 * 清洗详细模式的 AI 响应
 * - 去除 Markdown 代码块
 * - 统一换行符
 */
export declare function cleanDetailedResponse(content: string): string;
/**
 * 清洗简洁模式的 AI 响应
 * - 去除多余空行和首尾空白
 * - 只保留第一行（防止 AI 多输出）
 */
export declare function cleanConciseResponse(content: string): string;
//# sourceMappingURL=cleanResponse.d.ts.map
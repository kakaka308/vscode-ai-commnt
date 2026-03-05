export interface PromptMessages {
    system: string;
    user: string;
}
/**
 * 构建简洁模式 Prompt
 */
export declare function buildConcisePrompt(language: string, code: string, isWholeFile: boolean): PromptMessages;
/**
 * 构建详细模式 Prompt
 * 会利用 commentTemplates 生成格式示例，让 AI 输出更准确的注释风格
 */
export declare function buildDetailedPrompt(language: string, code: string, commentStyle: string, isWholeFile: boolean): PromptMessages;
/**
 * 统一入口：根据 commentMode 自动选择构建函数
 */
export declare function buildPrompt(commentMode: string, language: string, code: string, commentStyle: string, isWholeFile: boolean): PromptMessages;
//# sourceMappingURL=buildPrompt.d.ts.map
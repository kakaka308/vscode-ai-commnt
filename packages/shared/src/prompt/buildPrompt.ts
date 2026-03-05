import { commentTemplates, getDefaultStyleByLanguage } from '../comment-style/commentTemplates';

export interface PromptMessages {
  system: string;
  user: string;
}

/**
 * 构建简洁模式 Prompt
 */
export function buildConcisePrompt(
  language: string,
  code: string,
  isWholeFile: boolean
): PromptMessages {
  const scope = isWholeFile ? `${language}文件` : `${language}代码片段`;
  return {
    system: `你是代码总结专家，需严格遵循以下规则：
1. 仅输出一句话总结（不超过50字），无换行、无多余解释；
2. 语言为中文，简洁易懂；
3. 不修改原有代码，仅输出总结文本（无注释符号）。`,
    user: `总结以下${scope}的核心功能（仅一句话）：\n${code}`
  };
}

/**
 * 构建详细模式 Prompt
 * 会利用 commentTemplates 生成格式示例，让 AI 输出更准确的注释风格
 */
export function buildDetailedPrompt(
  language: string,
  code: string,
  commentStyle: string,
  isWholeFile: boolean
): PromptMessages {
  const actualStyle = commentStyle === 'default'
    ? getDefaultStyleByLanguage(language)
    : commentStyle;

  const template = commentTemplates[actualStyle as keyof typeof commentTemplates]
    ?? commentTemplates.default;

  // 根据模板生成格式示例，给 AI 明确的格式参考
  const formatExample = 'suffix' in template && template.suffix
    ? `${template.prefix}\n${template.linePrefix}说明\n${template.suffix}`
    : `${template.linePrefix}说明`;

  const scope = isWholeFile ? `${language}文件` : `${language}代码片段`;

  return {
    system: `你是专业的代码注释生成工具，需遵循以下规则：
1. 注释风格：${actualStyle}，格式示例：
${formatExample}
2. 注释语言：中文；
3. 详细注释需包含功能说明、参数说明（如有）、返回值说明（如有）；
4. ${isWholeFile ? '全文件注释需按模块/函数逐一注释' : '仅针对选中的代码片段生成注释'}；
5. 仅返回带注释的完整代码，不要使用 Markdown 代码块包裹，不要额外解释。`,
    user: `为以下${scope}生成${actualStyle}风格的详细注释：\n${code}`
  };
}

/**
 * 统一入口：根据 commentMode 自动选择构建函数
 */
export function buildPrompt(
  commentMode: string,
  language: string,
  code: string,
  commentStyle: string,
  isWholeFile: boolean
): PromptMessages {
  if (commentMode === 'concise') {
    return buildConcisePrompt(language, code, isWholeFile);
  }
  return buildDetailedPrompt(language, code, commentStyle, isWholeFile);
}
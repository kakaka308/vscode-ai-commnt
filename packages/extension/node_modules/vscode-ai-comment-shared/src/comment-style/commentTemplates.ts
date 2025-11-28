// 注释风格映射表
export const commentTemplates = {
  // 简洁风格
  concise: {
    prefix: '//',
    suffix: '',
    linePrefix: '// ',
    summary: '// %s',
    fileHeader: '// File Summary: %s\n'
  },
  // 详细风格
  javadoc: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@param {type} name - description',
    return: '@return {type} description'
  },
  godoc: {
    prefix: '//',
    suffix: '',
    linePrefix: '// ',
    param: '// param name: description',
    return: '// return: description'
  },
  jsdoc: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@param {type} name - description',
    returns: '@returns {type} description'
  },
  doxygen: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@brief description\n * @param name description',
    return: '@return description'
  },
  default: {
    prefix: '/*',
    suffix: ' */',
    linePrefix: ' * ',
    param: 'param: name - description',
    return: 'return: description'
  }
};

// 默认风格映射（详细模式用）
export function getDefaultStyleByLanguage(language: string): string {
  const map: Record<string, string> = {
    'java': 'javadoc',
    'go': 'godoc',
    'javascript': 'jsdoc',
    'typescript': 'jsdoc',
    'c': 'doxygen',
    'cpp': 'doxygen'
  };
  return map[language] || 'default';
}

// 简洁注释生成函数
export function generateConciseComment(summary: string, isWholeFile = false): string {
  const template = commentTemplates.concise;
  if (isWholeFile) {
    return template.fileHeader.replace('%s', summary.trim());
  } else {
    return template.summary.replace('%s', summary.trim());
  }
}

// 详细注释辅助函数
export function generateDetailedComment(content: string): string {
  // 兼容 AI 返回的详细注释格式，仅做简单清洗
  return content.trim().replace(/\n+/g, '\n');
}
// packages/shared/src/comment-style/commentTemplates.ts

export const commentTemplates = {
  // 简洁风格 (行内注释)
  concise: {
    prefix: '//',
    suffix: '',
    linePrefix: '// ',
    summary: '// %s',
    fileHeader: '// File Summary: %s\n'
  },
  // JavaDoc 风格 (Java, JS, TS)
  javadoc: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@param {type} name - description',
    return: '@return {type} description'
  },
  // GoDoc 风格 (Go, Rust)
  godoc: {
    prefix: '//',
    suffix: '',
    linePrefix: '// ',
    param: '// param name: description',
    return: '// return: description'
  },
  // JSDoc 风格 (JS, TS 变体)
  jsdoc: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@param {type} name - description',
    returns: '@returns {type} description'
  },
  // Doxygen 风格 (C, C++)
  doxygen: {
    prefix: '/**',
    suffix: ' */',
    linePrefix: ' * ',
    param: '@brief description\n * @param name description',
    return: '@return description'
  },
  // 新增：Python Docstring 风格 (Google Style)
  docstring: {
    prefix: '"""',
    suffix: '"""',
    linePrefix: '',
    param: 'Args:\n    name (type): description',
    return: 'Returns:\n    type: description'
  },
  // 默认风格
  default: {
    prefix: '/*',
    suffix: ' */',
    linePrefix: ' * ',
    param: 'param: name - description',
    return: 'return: description'
  }
};

// 根据语言 ID 获取默认详细注释风格
export function getDefaultStyleByLanguage(language: string): string {
  const map: Record<string, string> = {
    'java': 'javadoc',
    'javascript': 'jsdoc',
    'typescript': 'jsdoc',
    'javascriptreact': 'jsdoc',
    'typescriptreact': 'jsdoc',
    'go': 'godoc',
    'rust': 'godoc',       // Rust 官方推荐用 /// 或 //，这里复用 godoc 结构
    'c': 'doxygen',
    'cpp': 'doxygen',
    'python': 'docstring', // Python 默认使用 Docstring
    'php': 'javadoc',
    'swift': 'javadoc'
  };
  return map[language] || 'default';
}

// 生成简洁注释（处理不同语言的前缀）
export function generateConciseComment(summary: string, isWholeFile = false, language: string = ''): string {
  // Python, Ruby, Shell, YAML 等使用 #
  const hashCommentLanguages = ['python', 'ruby', 'shellscript', 'yaml', 'dockerfile'];
  const isHashStyle = hashCommentLanguages.includes(language);
  
  const prefix = isHashStyle ? '# ' : '// ';
  
  if (isWholeFile) {
    return `${prefix}File Summary: ${summary.trim()}\n`;
  } else {
    return `${prefix}${summary.trim()}`;
  }
}

// 辅助函数：处理详细注释的换行格式
export function generateDetailedComment(content: string): string {
  return content.trim().replace(/\n+/g, '\n');
}
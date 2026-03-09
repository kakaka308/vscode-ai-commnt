import { describe, it, expect } from 'vitest'
import {
  commentTemplates,
  getDefaultStyleByLanguage,
  generateConciseComment,
  generateDetailedComment,
} from '../src/comment-style/commentTemplates'

describe('commentTemplates 结构', () => {
  const expectedStyles = ['concise', 'javadoc', 'godoc', 'jsdoc', 'doxygen', 'docstring', 'default']

  it.each(expectedStyles)('"%s" 风格存在且有 prefix 字段', (style) => {
    expect(commentTemplates).toHaveProperty(style)
    expect(commentTemplates[style as keyof typeof commentTemplates]).toHaveProperty('prefix')
  })

  it('javadoc prefix 是 /**', () => {
    expect(commentTemplates.javadoc.prefix).toBe('/**')
  })

  it('godoc prefix 是 //', () => {
    expect(commentTemplates.godoc.prefix).toBe('//')
  })

  it('docstring prefix 是 """', () => {
    expect(commentTemplates.docstring.prefix).toBe('"""')
  })
})

describe('getDefaultStyleByLanguage', () => {
  const cases: [string, string][] = [
    ['java',            'javadoc'],
    ['javascript',      'jsdoc'],
    ['typescript',      'jsdoc'],
    ['javascriptreact', 'jsdoc'],
    ['typescriptreact', 'jsdoc'],
    ['go',              'godoc'],
    ['rust',            'godoc'],
    ['c',               'doxygen'],
    ['cpp',             'doxygen'],
    ['python',          'docstring'],
    ['php',             'javadoc'],
    ['swift',           'javadoc'],
  ]

  it.each(cases)('语言 "%s" → 默认风格 "%s"', (lang, expected) => {
    expect(getDefaultStyleByLanguage(lang)).toBe(expected)
  })

  it('未知语言回退到 "default"', () => {
    expect(getDefaultStyleByLanguage('cobol')).toBe('default')
    expect(getDefaultStyleByLanguage('')).toBe('default')
  })
})

describe('generateConciseComment', () => {
  it('默认使用 // 前缀', () => {
    expect(generateConciseComment('初始化配置')).toBe('// 初始化配置')
  })

  it('TypeScript 使用 // 前缀', () => {
    expect(generateConciseComment('解析参数', false, 'typescript')).toBe('// 解析参数')
  })

  it('Python 使用 # 前缀', () => {
    expect(generateConciseComment('解析参数', false, 'python')).toBe('# 解析参数')
  })

  it('Ruby 使用 # 前缀', () => {
    expect(generateConciseComment('处理请求', false, 'ruby')).toBe('# 处理请求')
  })

  it('shellscript 使用 # 前缀', () => {
    expect(generateConciseComment('启动服务', false, 'shellscript')).toBe('# 启动服务')
  })

  it('yaml 使用 # 前缀', () => {
    expect(generateConciseComment('配置项', false, 'yaml')).toBe('# 配置项')
  })

  it('isWholeFile=true 时加 File Summary: 且末尾换行', () => {
    expect(generateConciseComment('用户登录模块', true, 'typescript'))
      .toBe('// File Summary: 用户登录模块\n')
  })

  it('isWholeFile=true Python 使用 # File Summary:', () => {
    expect(generateConciseComment('数据处理脚本', true, 'python'))
      .toBe('# File Summary: 数据处理脚本\n')
  })

  it('自动去除 summary 首尾空白', () => {
    expect(generateConciseComment('  初始化配置  ', false, 'typescript'))
      .toBe('// 初始化配置')
  })
})

describe('generateDetailedComment', () => {
  it('去除首尾多余空白', () => {
    expect(generateDetailedComment('  内容  ')).toBe('内容')
  })

  it('将连续多个换行压缩为单个换行', () => {
    expect(generateDetailedComment('line1\n\n\nline2')).toBe('line1\nline2')
  })

  it('内容本身正常时不变', () => {
    expect(generateDetailedComment('line1\nline2')).toBe('line1\nline2')
  })
})
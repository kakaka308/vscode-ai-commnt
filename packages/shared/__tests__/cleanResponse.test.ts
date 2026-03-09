import { describe, it, expect } from 'vitest'
import {
  stripMarkdownCodeBlock,
  cleanDetailedResponse,
  cleanConciseResponse,
} from '../src/utils/cleanResponse'

describe('stripMarkdownCodeBlock', () => {
  it('去除 ```typescript 开头和结尾的 ```', () => {
    const input = '```typescript\nconst a = 1;\n```'
    expect(stripMarkdownCodeBlock(input)).toBe('const a = 1;')
  })

  it('去除没有语言标记的 ``` 包裹', () => {
    const input = '```\nconst a = 1;\n```'
    expect(stripMarkdownCodeBlock(input)).toBe('const a = 1;')
  })

  it('内容本身没有 ``` 包裹时原样返回', () => {
    expect(stripMarkdownCodeBlock('const a = 1;')).toBe('const a = 1;')
  })

  it('去除首尾空白', () => {
    expect(stripMarkdownCodeBlock('  const a = 1;  ')).toBe('const a = 1;')
  })

  it('处理 Windows 换行符 \\r\\n', () => {
    const input = '```typescript\r\nconst a = 1;\r\n```'
    expect(stripMarkdownCodeBlock(input)).toBe('const a = 1;')
  })

  it('多行代码保留内部换行', () => {
    const input = '```javascript\nfunction foo() {\n  return 1;\n}\n```'
    expect(stripMarkdownCodeBlock(input)).toBe('function foo() {\n  return 1;\n}')
  })
})

describe('cleanDetailedResponse', () => {
  it('去除 Markdown 包裹并统一换行符', () => {
    const input = '```typescript\r\nconst a = 1;\r\n```'
    expect(cleanDetailedResponse(input)).toBe('const a = 1;')
  })

  it('将 \\r\\n 统一替换为 \\n', () => {
    expect(cleanDetailedResponse('line1\r\nline2\r\nline3')).toBe('line1\nline2\nline3')
  })

  it('无 Markdown 且已是 \\n 换行时内容不变', () => {
    const input = 'function foo() {\n  return 1;\n}'
    expect(cleanDetailedResponse(input)).toBe(input)
  })

  it('空字符串返回空字符串', () => {
    expect(cleanDetailedResponse('')).toBe('')
  })
})

describe('cleanConciseResponse', () => {
  it('只保留第一行', () => {
    expect(cleanConciseResponse('初始化用户数据\n多余的第二行\n第三行')).toBe('初始化用户数据')
  })

  it('去除首尾空白', () => {
    expect(cleanConciseResponse('  初始化用户数据  ')).toBe('初始化用户数据')
  })

  it('AI 多输出了换行时只取第一行', () => {
    expect(cleanConciseResponse('计算两数之和\n\n这是多余解释')).toBe('计算两数之和')
  })

  it('单行内容正常返回', () => {
    expect(cleanConciseResponse('解析 JSON 配置文件')).toBe('解析 JSON 配置文件')
  })

  it('空字符串返回空字符串', () => {
    expect(cleanConciseResponse('')).toBe('')
  })
})
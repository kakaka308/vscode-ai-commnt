import { describe, it, expect } from 'vitest'
import {
  buildConcisePrompt,
  buildDetailedPrompt,
  buildPrompt,
} from '../src/prompt/buildPrompt'

const CODE = 'function add(a: number, b: number) { return a + b; }'

describe('buildConcisePrompt', () => {
  it('返回 system 和 user 两个字段', () => {
    const result = buildConcisePrompt('typescript', CODE, false)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('isWholeFile=false 时 user 包含 "代码片段"', () => {
    const result = buildConcisePrompt('typescript', CODE, false)
    expect(result.user).toContain('typescript代码片段')
    expect(result.user).toContain(CODE)
  })

  it('isWholeFile=true 时 user 包含 "文件"', () => {
    const result = buildConcisePrompt('typescript', CODE, true)
    expect(result.user).toContain('typescript文件')
  })

  it('system 包含字数限制关键词 "50字"', () => {
    expect(buildConcisePrompt('javascript', CODE, false).system).toContain('50字')
  })

  it('system 强调不输出注释符号', () => {
    expect(buildConcisePrompt('javascript', CODE, false).system).toContain('注释符号')
  })

  it('不同语言正确拼入 scope', () => {
    expect(buildConcisePrompt('go', CODE, false).user).toContain('go代码片段')
    expect(buildConcisePrompt('python', CODE, true).user).toContain('python文件')
  })
})

describe('buildDetailedPrompt', () => {
  it('返回 system 和 user 两个字段', () => {
    const result = buildDetailedPrompt('typescript', CODE, 'jsdoc', false)
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
  })

  it('commentStyle="default" 时自动推断 typescript → jsdoc', () => {
    const result = buildDetailedPrompt('typescript', CODE, 'default', false)
    expect(result.system).toContain('jsdoc')
  })

  it('显式指定 commentStyle 时使用该风格', () => {
    const result = buildDetailedPrompt('typescript', CODE, 'javadoc', false)
    expect(result.system).toContain('javadoc')
  })

  it('isWholeFile=false 时 system 包含 "选中的代码片段"', () => {
    expect(buildDetailedPrompt('typescript', CODE, 'jsdoc', false).system)
      .toContain('选中的代码片段')
  })

  it('isWholeFile=true 时 system 包含 "全文件注释"', () => {
    expect(buildDetailedPrompt('typescript', CODE, 'jsdoc', true).system)
      .toContain('全文件注释')
  })

  it('jsdoc 格式示例包含 /**', () => {
    expect(buildDetailedPrompt('typescript', CODE, 'jsdoc', false).system).toContain('/**')
  })

  it('godoc suffix 为空时格式示例只有 linePrefix，不含 */', () => {
    const result = buildDetailedPrompt('go', CODE, 'godoc', false)
    expect(result.system).toContain('// 说明')
    expect(result.system).not.toContain('*/')
  })

  it('docstring 格式示例包含 """', () => {
    expect(buildDetailedPrompt('python', CODE, 'docstring', false).system).toContain('"""')
  })

  it('user 包含原始代码', () => {
    expect(buildDetailedPrompt('typescript', CODE, 'jsdoc', false).user).toContain(CODE)
  })

  it('未知 commentStyle 不抛出错误', () => {
    expect(() => buildDetailedPrompt('typescript', CODE, 'unknown-style', false))
      .not.toThrow()
  })
})

describe('buildPrompt（统一入口）', () => {
  it('commentMode="concise" 时 system 包含 "50字"', () => {
    expect(buildPrompt('concise', 'typescript', CODE, 'jsdoc', false).system)
      .toContain('50字')
  })

  it('commentMode="detailed" 时 system 包含注释风格', () => {
    expect(buildPrompt('detailed', 'typescript', CODE, 'jsdoc', false).system)
      .toContain('jsdoc')
  })

  it('未知 commentMode 默认走详细模式', () => {
    expect(buildPrompt('unknown', 'typescript', CODE, 'jsdoc', false).system)
      .toContain('jsdoc')
  })

  it('isWholeFile 正确透传给 concise', () => {
    expect(buildPrompt('concise', 'typescript', CODE, 'default', true).user)
      .toContain('文件')
  })

  it('isWholeFile 正确透传给 detailed', () => {
    expect(buildPrompt('detailed', 'typescript', CODE, 'default', true).system)
      .toContain('全文件注释')
  })
})
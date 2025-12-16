// 注释相关类型
export type CommentMode = 'concise' | 'detailed'
export type CommentStyle = 'default' | 'javadoc' | 'godoc' | 'jsdoc' | 'doxygen'

// AI 提供者类型
export type AIProvider = 'openai' | 'xunfei' | 'baidu' | 'qwen'

// 配置接口
export interface Config {
  commentStyle: CommentStyle
  commentMode: CommentMode
  targetLanguage: string
  aiProvider: AIProvider
  
  // OpenAI
  openaiApiKey: string
  openaiModel: string
  openaiEndpoint: string
  
  // Qwen
  qwenApiKey: string
  qwenModel: string
  qwenEndpoint: string
  
  // Baidu ERNIE
  baiduApiKey: string
  baiduSecretKey: string
  baiduModel: string
  
  // Xunfei
  xunfeiAppId: string
  xunfeiApiKey: string
  xunfeiApiSecret: string
}

// 语言支持类型
export type Language = 
  | 'java'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'python'
  | 'cpp'
  | 'csharp'
  | 'rust'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'scala'
  | 'ruby'
  | 'auto'

// 注释模板类型
export interface CommentTemplate {
  style: CommentStyle
  language: Language
  template: string
  placeholders: {
    description: string
    params?: Array<{
      name: string
      type: string
      description: string
    }>
    returns?: {
      type: string
      description: string
    }
    throws?: Array<{
      type: string
      description: string
    }>
  }
}
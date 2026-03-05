export type AIProvider = 'openai' | 'qwen' | 'baidu'
export type CommentMode = 'concise' | 'detailed'
export type CommentStyle = 'default' | 'javadoc' | 'jsdoc' | 'godoc' | 'doxygen'
export type TargetLanguage = 'auto' | 'java' | 'javascript' | 'typescript' | 'python' | 'go' | 'cpp' | 'c'

export interface AICommentConfig {
  // 通用
  aiProvider: AIProvider
  commentMode: CommentMode
  commentStyle: CommentStyle
  targetLanguage: TargetLanguage

  // OpenAI
  apiKey: string
  model: string
  openaiEndpoint: string

  // Qwen
  qwenApiKey: string
  qwenModel: string
  qwenEndpoint: string

  // Baidu
  baiduApiKey: string
  baiduSecretKey: string
  baiduModel: string
}

export const DEFAULT_CONFIG: AICommentConfig = {
  aiProvider: 'openai',
  commentMode: 'concise',
  commentStyle: 'default',
  targetLanguage: 'auto',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
  qwenApiKey: '',
  qwenModel: 'qwen-turbo',
  qwenEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  baiduApiKey: '',
  baiduSecretKey: '',
  baiduModel: 'ernie-4.0',
}
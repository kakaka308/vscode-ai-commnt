// AI 服务商枚举（方便扩展）
export enum AIServiceProvider {
  OpenAI = 'openai',
  XunFei = 'xunfei',
  Baidu = 'baidu',
  Qwen = 'qwen'
}

// 注释生成参数
export interface GenerateCommentParams {
  code: string;          // 待生成注释的代码
  language: string;      // 代码语言（java/go/c/js 等）
  commentStyle: string;  // 注释风格（javadoc/godoc 等）
  isWholeFile?: boolean; // 是否全文件注释
  iProvider?: AIServiceProvider;
}

// AI 响应结果
export interface AIResponse {
  comment: string;       // 生成的注释（或带注释的完整代码）
  success: boolean;      // 是否成功
  message?: string;      // 错误信息
}

// OpenAI 接口请求参数（适配官方 API）
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature?: number;  // 随机性（0-1，越小越固定）
}


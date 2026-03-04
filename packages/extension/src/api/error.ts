// AI 调用错误基类
export class AIError extends Error {
  code: string;
  constructor(message: string, code = 'AI_ERROR') {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

// API Key 缺失错误
export class APIKeyMissingError extends AIError {
  constructor() {
    super('AI API Key 未配置，请在 VSCode 设置中填写 aiComment.apiKey', 'API_KEY_MISSING');
    this.name = 'APIKeyMissingError';
  }
}

// 接口请求失败错误（修复：不再拼接"AI 请求失败："前缀，避免重复）
export class AIRequestFailedError extends AIError {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message, 'REQUEST_FAILED');
    this.name = 'AIRequestFailedError';
    this.statusCode = statusCode;
  }
}

// 响应解析错误
export class AIResponseParseError extends AIError {
  constructor() {
    super('AI 响应格式解析失败，请检查服务商接口是否正常', 'RESPONSE_PARSE_ERROR');
    this.name = 'AIResponseParseError';
  }
}























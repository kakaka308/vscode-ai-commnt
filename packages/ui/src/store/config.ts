import { defineStore } from 'pinia'
import { ref } from 'vue'

// 增加 docstring 类型
type CommentMode = 'concise' | 'detailed'
type CommentStyle = 'default' | 'javadoc' | 'godoc' | 'jsdoc' | 'doxygen' | 'docstring'
type AIProvider = 'openai' | 'xunfei' | 'baidu' | 'qwen'

interface Config {
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

export interface ConfigState extends Config {}

export const useConfigStore = defineStore('config', () => {
  const defaultConfig: ConfigState = {
    commentStyle: 'default',
    commentMode: 'concise',
    targetLanguage: 'auto',
    aiProvider: 'qwen', // 默认推荐 Qwen
    
    openaiApiKey: '',
    openaiModel: 'gpt-3.5-turbo',
    openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
    
    qwenApiKey: '',
    qwenModel: 'qwen-turbo',
    qwenEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    
    baiduApiKey: '',
    baiduSecretKey: '',
    baiduModel: 'ernie-4.0',
    
    xunfeiAppId: '',
    xunfeiApiKey: '',
    xunfeiApiSecret: ''
  }

  const config = ref<ConfigState>({ ...defaultConfig })
  const commentPreview = ref('')

  // 与 VS Code 通信逻辑 (保持不变)
  const loadConfig = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).vscode) {
        const savedConfig = await (window as any).vscode.postMessage({
          command: 'loadConfig'
        })
        if (savedConfig) config.value = { ...defaultConfig, ...savedConfig }
      }
    } catch (error) { console.error(error) }
  }

  const saveConfig = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).vscode) {
        await (window as any).vscode.postMessage({
          command: 'saveConfig',
          config: JSON.parse(JSON.stringify(config.value))
        })
      }
    } catch (error) { console.error(error) }
  }

  const resetConfig = () => {
    config.value = { ...defaultConfig }
  }

  const updatePreview = () => {
    commentPreview.value = generatePreview(config.value)
  }

  // 生成预览文本
  const generatePreview = (config: ConfigState): string => {
    const { commentStyle: style, commentMode: mode } = config
    
    if (style === 'docstring') {
      // Python Docstring 预览
      if (mode === 'concise') {
        return `def add(a, b):\n    """Calculate sum of a and b."""\n    return a + b`
      }
      return `def add(a, b):\n    """Calculate the sum of two numbers.\n\n    Args:\n        a (int): The first number.\n        b (int): The second number.\n\n    Returns:\n        int: The sum of a and b.\n    """\n    return a + b`
    }

    if (style === 'javadoc') {
      return `/**
 * ${mode === 'concise' ? 'Calculates sum of two numbers' : 'Calculates the sum of two integer values and returns the result'}
 * @param a First integer value
 * @param b Second integer value
 * @return Sum of a and b
 */`
    } else if (style === 'jsdoc') {
      return `/**
 * ${mode === 'concise' ? 'Calculates sum' : 'Calculates the sum of two numbers'}
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */`
    } else if (style === 'godoc') {
      return `// CalculateSum ${mode === 'concise' ? 'returns sum' : 'returns the sum of two integers'}
// a: first integer
// b: second integer
// returns: sum of a and b`
    } else if (style === 'doxygen') {
      return `/**
 * @brief ${mode === 'concise' ? 'Calculate sum' : 'Calculate the sum of two integers'}
 * * @param a First integer
 * @param b Second integer
 * @return int Sum of a and b
 */`
    }
    
    return `// ${mode === 'concise' ? 'Calculates sum of a and b' : 'This function calculates the sum of two provided integer values'}`
  }

  return {
    config,
    commentPreview,
    loadConfig,
    saveConfig,
    resetConfig,
    updatePreview
  }
})
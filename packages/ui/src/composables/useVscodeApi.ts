import type { AICommentConfig } from '../types/config'

// 获取 VSCode Webview API（在非 Webview 环境下返回 null，方便浏览器调试）
function getVscodeApi() {
  if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
    // acquireVsCodeApi 只能调用一次，缓存在 window 上
    if (!(window as any).__vscodeApi) {
      (window as any).__vscodeApi = (window as any).acquireVsCodeApi()
    }
    return (window as any).__vscodeApi
  }
  return null
}

export function useVscodeApi() {
  const vscode = getVscodeApi()

  // 是否在真实 VSCode Webview 环境中运行
  const isVscode = vscode !== null

  // 向 extension 发送消息
  const postMessage = (command: string, data?: unknown) => {
    if (vscode) {
      vscode.postMessage({ command, data })
    } else {
      // 浏览器调试时打印日志
      console.log('[MockVscode] postMessage:', command, data)
    }
  }

  // 请求 extension 返回当前配置
  const requestConfig = () => postMessage('getConfig')

  // 保存配置到 VSCode settings
  const saveConfig = (data: Partial<AICommentConfig>) => postMessage('saveConfig', data)

  // 监听 extension 发来的消息，返回取消监听函数
  const onMessage = (callback: (message: { command: string; data: unknown }) => void) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }

  return { isVscode, requestConfig, saveConfig, onMessage }
}
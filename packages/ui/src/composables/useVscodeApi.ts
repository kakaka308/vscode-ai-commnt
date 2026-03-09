// src/composables/useVscodeApi.ts 完整替换
import type { AICommentConfig } from '../types/config'

// 获取 VSCode API 实例（全局单例）
let vscodeApi: any = null;
function getVscodeApi() {
  if (vscodeApi) return vscodeApi;
  if (typeof (window as any).acquireVsCodeApi === 'function') {
    vscodeApi = (window as any).acquireVsCodeApi();
    return vscodeApi;
  }
  return null;
}

export function useVscodeApi() {
  const vscode = getVscodeApi();

  const postMessage = (command: string, data?: unknown) => {
    if (vscode) {
      vscode.postMessage({ command, data });
    } else {
      console.warn(`[Webview] VSCode API 缺失，无法发送: ${command}`, data);
    }
  };

  return {
    requestConfig: () => postMessage('getConfig'),
    saveConfig: (data: AICommentConfig) => postMessage('saveConfig', data),
    onMessage: (callback: (message: any) => void) => {
      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message) callback(message);
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  };
}
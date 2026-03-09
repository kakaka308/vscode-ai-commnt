import * as vscode from 'vscode';
import { AIServiceProvider } from '../api/types';

export const SECRET_KEYS = [
  'apiKey',
  'qwenApiKey',
  'baiduApiKey',
  'baiduSecretKey',
] as const;

export type SecretKey = typeof SECRET_KEYS[number];

let _context: vscode.ExtensionContext | null = null;

export function initContext(context: vscode.ExtensionContext) {
  _context = context;
}

function getContext(): vscode.ExtensionContext {
  if (!_context) throw new Error('Extension context 未初始化，请先调用 initContext()');
  return _context;
}

export async function getSecret(key: SecretKey): Promise<string> {
  const val = await getContext().secrets.get(`aiComment.${key}`);
  console.log(`[config] getSecret(${key}) =`, val ? `"${'*'.repeat(val.length)}"(len=${val.length})` : 'empty');
  return val ?? '';
}

export async function setSecret(key: SecretKey, value: string): Promise<void> {
  if (value) {
    await getContext().secrets.store(`aiComment.${key}`, value);
    console.log(`[config] setSecret(${key}) stored, len=${value.length}`);
  } else {
    await getContext().secrets.delete(`aiComment.${key}`);
    console.log(`[config] setSecret(${key}) deleted (empty value)`);
  }
}

export async function getAllSecrets(): Promise<Record<SecretKey, string>> {
  const entries = await Promise.all(
    SECRET_KEYS.map(async (key) => [key, await getSecret(key)] as const)
  );
  return Object.fromEntries(entries) as Record<SecretKey, string>;
}

export async function setSecrets(data: Partial<Record<SecretKey, string>>): Promise<void> {
  await Promise.all(
    SECRET_KEYS
      .filter((key) => key in data)
      .map((key) => setSecret(key, data[key] ?? ''))
  );
}

export interface AICommentBaseConfig {
  model: string;
  commentStyle: string;
  targetLanguage: string;
  aiProvider: AIServiceProvider;
  commentMode: string;
  openaiEndpoint: string;
  qwenModel: string;
  qwenEndpoint: string;
  baiduModel: string;
}

export function getBaseConfig(): AICommentBaseConfig {
  const config = vscode.workspace.getConfiguration('aiComment');
  return {
    model:          config.get('model', 'gpt-3.5-turbo'),
    commentStyle:   config.get('commentStyle', 'default'),
    targetLanguage: config.get('targetLanguage', 'auto'),
    aiProvider:     config.get('aiProvider', AIServiceProvider.OpenAI),
    commentMode:    config.get('commentMode', 'concise'),
    openaiEndpoint: config.get('openaiEndpoint', 'https://api.openai.com/v1/chat/completions'),
    qwenModel:      config.get('qwenModel', 'qwen-turbo'),
    qwenEndpoint:   config.get('qwenEndpoint', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'),
    baiduModel:     config.get('baiduModel', 'ernie-4.0'),
  };
}

export async function setBaseConfig(key: string, value: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiComment');
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

export interface AICommentConfig extends AICommentBaseConfig {
  apiKey: string;
  qwenApiKey: string;
  baiduApiKey: string;
  baiduSecretKey: string;
}

export async function getExtensionConfig(): Promise<AICommentConfig> {
  const [base, secrets] = await Promise.all([
    getBaseConfig(),
    getAllSecrets(),
  ]);
  const result = { ...base, ...secrets };
  console.log('[config] getExtensionConfig aiProvider:', result.aiProvider, 'qwenApiKey len:', result.qwenApiKey.length);
  return result;
}

export async function validateConfig(): Promise<boolean> {
  const config = await getExtensionConfig();

  if (config.aiProvider === AIServiceProvider.OpenAI && !config.apiKey) {
    vscode.window.showErrorMessage('AI Comment: 请配置 OpenAI API Key');
    return false;
  }
  if (config.aiProvider === AIServiceProvider.Qwen && !config.qwenApiKey) {
    vscode.window.showErrorMessage('AI Comment: 请配置 Qwen API Key');
    return false;
  }
  if (config.aiProvider === AIServiceProvider.Baidu && (!config.baiduApiKey || !config.baiduSecretKey)) {
    vscode.window.showErrorMessage('AI Comment: 请配置 Baidu API Key 和 Secret Key');
    return false;
  }
  return true;
}
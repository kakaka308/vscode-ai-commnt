"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECRET_KEYS = void 0;
exports.initContext = initContext;
exports.getSecret = getSecret;
exports.setSecret = setSecret;
exports.getAllSecrets = getAllSecrets;
exports.setSecrets = setSecrets;
exports.getBaseConfig = getBaseConfig;
exports.setBaseConfig = setBaseConfig;
exports.getExtensionConfig = getExtensionConfig;
exports.validateConfig = validateConfig;
const vscode = __importStar(require("vscode"));
const types_1 = require("../api/types");
exports.SECRET_KEYS = [
    'apiKey',
    'qwenApiKey',
    'baiduApiKey',
    'baiduSecretKey',
];
let _context = null;
function initContext(context) {
    _context = context;
}
function getContext() {
    if (!_context)
        throw new Error('Extension context 未初始化，请先调用 initContext()');
    return _context;
}
async function getSecret(key) {
    const val = await getContext().secrets.get(`aiComment.${key}`);
    console.log(`[config] getSecret(${key}) =`, val ? `"${'*'.repeat(val.length)}"(len=${val.length})` : 'empty');
    return val ?? '';
}
async function setSecret(key, value) {
    if (value) {
        await getContext().secrets.store(`aiComment.${key}`, value);
        console.log(`[config] setSecret(${key}) stored, len=${value.length}`);
    }
    else {
        await getContext().secrets.delete(`aiComment.${key}`);
        console.log(`[config] setSecret(${key}) deleted (empty value)`);
    }
}
async function getAllSecrets() {
    const entries = await Promise.all(exports.SECRET_KEYS.map(async (key) => [key, await getSecret(key)]));
    return Object.fromEntries(entries);
}
async function setSecrets(data) {
    await Promise.all(exports.SECRET_KEYS
        .filter((key) => key in data)
        .map((key) => setSecret(key, data[key] ?? '')));
}
function getBaseConfig() {
    const config = vscode.workspace.getConfiguration('aiComment');
    return {
        model: config.get('model', 'gpt-3.5-turbo'),
        commentStyle: config.get('commentStyle', 'default'),
        targetLanguage: config.get('targetLanguage', 'auto'),
        aiProvider: config.get('aiProvider', types_1.AIServiceProvider.OpenAI),
        commentMode: config.get('commentMode', 'concise'),
        openaiEndpoint: config.get('openaiEndpoint', 'https://api.openai.com/v1/chat/completions'),
        qwenModel: config.get('qwenModel', 'qwen-turbo'),
        qwenEndpoint: config.get('qwenEndpoint', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'),
        baiduModel: config.get('baiduModel', 'ernie-4.0'),
    };
}
async function setBaseConfig(key, value) {
    const config = vscode.workspace.getConfiguration('aiComment');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
}
async function getExtensionConfig() {
    const [base, secrets] = await Promise.all([
        getBaseConfig(),
        getAllSecrets(),
    ]);
    const result = { ...base, ...secrets };
    console.log('[config] getExtensionConfig aiProvider:', result.aiProvider, 'qwenApiKey len:', result.qwenApiKey.length);
    return result;
}
async function validateConfig() {
    const config = await getExtensionConfig();
    if (config.aiProvider === types_1.AIServiceProvider.OpenAI && !config.apiKey) {
        vscode.window.showErrorMessage('AI Comment: 请配置 OpenAI API Key');
        return false;
    }
    if (config.aiProvider === types_1.AIServiceProvider.Qwen && !config.qwenApiKey) {
        vscode.window.showErrorMessage('AI Comment: 请配置 Qwen API Key');
        return false;
    }
    if (config.aiProvider === types_1.AIServiceProvider.Baidu && (!config.baiduApiKey || !config.baiduSecretKey)) {
        vscode.window.showErrorMessage('AI Comment: 请配置 Baidu API Key 和 Secret Key');
        return false;
    }
    return true;
}

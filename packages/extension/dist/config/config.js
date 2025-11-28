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
exports.getExtensionConfig = getExtensionConfig;
exports.validateConfig = validateConfig;
const vscode = __importStar(require("vscode"));
const types_1 = require("../api/types");
// 获取插件配置
function getExtensionConfig() {
    const config = vscode.workspace.getConfiguration('aiComment');
    return {
        apiKey: config.get('apiKey', ''),
        model: config.get('model', 'gpt-3.5-turbo'),
        commentStyle: config.get('commentStyle', 'default'),
        targetLanguage: config.get('targetLanguage', 'auto'),
        aiProvider: config.get('aiProvider', types_1.AIServiceProvider.OpenAI),
        commentMode: config.get('commentMode', 'detailed')
    };
}
// 验证配置
function validateConfig() {
    const { apiKey } = getExtensionConfig();
    if (!apiKey) {
        vscode.window.showErrorMessage('AI Comment: 请在 VSCode 设置中配置 API Key（设置 > AI Comment Generator > apiKey）');
        return false;
    }
    return true;
}

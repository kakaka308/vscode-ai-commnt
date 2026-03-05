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
exports.openConfigPanel = openConfigPanel;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const types_1 = require("../api/types");
let panel;
function openConfigPanel(context) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        return;
    }
    panel = vscode.window.createWebviewPanel('aiCommentConfig', 'AI Comment 设置', vscode.ViewColumn.One, {
        enableScripts: true,
        // 允许 Webview 访问 ui/dist 目录下的资源
        localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'ui-dist')
        ]
    });
    panel.webview.html = getWebviewHtml(panel.webview, context);
    // 接收 Vue 页面发来的消息
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'saveConfig': {
                const config = vscode.workspace.getConfiguration('aiComment');
                for (const key of Object.keys(message.data)) {
                    await config.update(key, message.data[key], vscode.ConfigurationTarget.Global);
                }
                vscode.window.showInformationMessage('AI Comment: 配置已保存！');
                break;
            }
            case 'getConfig': {
                // Vue 页面请求当前配置
                const config = vscode.workspace.getConfiguration('aiComment');
                panel?.webview.postMessage({
                    command: 'loadConfig',
                    data: {
                        apiKey: config.get('apiKey', ''),
                        model: config.get('model', 'gpt-3.5-turbo'),
                        commentStyle: config.get('commentStyle', 'default'),
                        targetLanguage: config.get('targetLanguage', 'auto'),
                        aiProvider: config.get('aiProvider', types_1.AIServiceProvider.OpenAI),
                        commentMode: config.get('commentMode', 'concise'),
                        openaiEndpoint: config.get('openaiEndpoint', ''),
                        qwenApiKey: config.get('qwenApiKey', ''),
                        qwenModel: config.get('qwenModel', 'qwen-turbo'),
                        qwenEndpoint: config.get('qwenEndpoint', ''),
                        baiduApiKey: config.get('baiduApiKey', ''),
                        baiduSecretKey: config.get('baiduSecretKey', ''),
                        baiduModel: config.get('baiduModel', 'ernie-4.0'),
                    }
                });
                break;
            }
        }
    }, undefined, context.subscriptions);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}
function getWebviewHtml(webview, context) {
    // ui build 产物放在 extension 包根目录的 ui-dist 文件夹下
    const distPath = vscode.Uri.joinPath(context.extensionUri, 'ui-dist');
    const htmlPath = path.join(distPath.fsPath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    // 将 HTML 中的资源路径替换为 Webview 可访问的 vscode-resource URI
    const distWebviewUri = webview.asWebviewUri(distPath).toString();
    html = html.replace(/(src|href)="\.?\/(assets\/[^"]+)"/g, `$1="${distWebviewUri}/$2"`);
    return html;
}

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
const config_1 = require("../config/config");
let panel;
function openConfigPanel(context) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        return;
    }
    const uiDistUri = vscode.Uri.joinPath(context.extensionUri, 'ui-dist');
    panel = vscode.window.createWebviewPanel('aiCommentConfig', 'AI Comment 设置', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [uiDistUri]
    });
    panel.webview.html = getWebviewHtml(panel.webview, uiDistUri);
    // 关键修改：处理来自前端的消息
    panel.webview.onDidReceiveMessage(async (message) => {
        console.log(`[openConfig] received message: ${message.command}`);
        switch (message.command) {
            case 'getConfig': {
                const [base, secrets] = await Promise.all([
                    (0, config_1.getBaseConfig)(),
                    (0, config_1.getAllSecrets)(),
                ]);
                panel?.webview.postMessage({
                    command: 'loadConfig',
                    data: { ...base, ...secrets }
                });
                break;
            }
            case 'saveConfig': {
                // 这里是修复的核心：处理保存逻辑
                const newConfig = message.data;
                console.log('[openConfig] saving data...', newConfig);
                try {
                    for (const key of Object.keys(newConfig)) {
                        const value = newConfig[key];
                        // 区分 Secret 存储和普通 Config 存储
                        if (config_1.SECRET_KEYS.includes(key)) {
                            await (0, config_1.setSecret)(key, value);
                        }
                        else {
                            await (0, config_1.setBaseConfig)(key, value);
                        }
                    }
                    vscode.window.showInformationMessage('AI Comment: 配置已成功保存！');
                }
                catch (err) {
                    vscode.window.showErrorMessage(`AI Comment: 保存失败: ${err.message}`);
                }
                break;
            }
        }
    }, undefined, context.subscriptions);
    // 初始加载
    setTimeout(async () => {
        const [base, secrets] = await Promise.all([
            (0, config_1.getBaseConfig)(),
            (0, config_1.getAllSecrets)(),
        ]);
        panel?.webview.postMessage({
            command: 'loadConfig',
            data: { ...base, ...secrets }
        });
    }, 500);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}
function getWebviewHtml(webview, uiDistUri) {
    const htmlPath = path.join(uiDistUri.fsPath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    html = html.replace(/\s+crossorigin/g, '');
    const webviewBaseUri = webview.asWebviewUri(uiDistUri).toString();
    html = html.replace(/__WEBVIEW_BASE__/g, webviewBaseUri);
    html = html.replace(/(src|href)="\/([^"]+)"/g, `$1="${webviewBaseUri}/$2"`);
    const nonce = getNonce();
    html = html.replace(/<script type="module"/g, `<script nonce="${nonce}" type="module"`);
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">`;
    html = html.replace('<head>', `<head>${csp}`);
    return html;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

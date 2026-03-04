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
exports.ConfigWebviewPanel = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config/config");
class ConfigWebviewPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(panel.webview, extensionUri);
        this._setWebviewMessageListener(panel.webview);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (ConfigWebviewPanel.currentPanel) {
            ConfigWebviewPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('aiCommentConfig', 'AI Comment Settings', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'dist'),
                vscode.Uri.joinPath(extensionUri, 'node_modules')
            ],
            retainContextWhenHidden: true
        });
        ConfigWebviewPanel.currentPanel = new ConfigWebviewPanel(panel, extensionUri);
    }
    _getWebviewContent(webview, extensionUri) {
        // Get the local path to main script run in the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'ui', 'assets', 'index.js'));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'ui', 'assets', 'index.css'));
        return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${stylesUri}" rel="stylesheet">
          <title>AI Comment Settings</title>
      </head>
      <body>
          <div id="app"></div>
          <script type="module" src="${scriptUri}"></script>
          <script>
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
          </script>
      </body>
      </html>`;
    }
    _setWebviewMessageListener(webview) {
        webview.onDidReceiveMessage(async (message) => {
            const command = message.command;
            const config = message.config;
            switch (command) {
                case 'loadConfig':
                    const loadedConfig = (0, config_1.getExtensionConfig)();
                    webview.postMessage({
                        command: 'configLoaded',
                        config: loadedConfig
                    });
                    break;
                case 'saveConfig':
                    await this._saveConfig(config);
                    webview.postMessage({
                        command: 'configSaved',
                        success: true
                    });
                    break;
                case 'getPreview':
                    const preview = this._generatePreview(config);
                    webview.postMessage({
                        command: 'updatePreview',
                        preview
                    });
                    break;
            }
        }, undefined, this._disposables);
    }
    async _saveConfig(config) {
        const configuration = vscode.workspace.getConfiguration('aiComment');
        // Save each configuration property
        for (const [key, value] of Object.entries(config)) {
            await configuration.update(key, value, vscode.ConfigurationTarget.Global);
        }
        vscode.window.showInformationMessage('AI Comment configuration saved successfully!');
    }
    _generatePreview(config) {
        // Generate preview based on config
        const style = config.commentStyle || 'default';
        const mode = config.commentMode || 'concise';
        // Implementation similar to UI store
        return '// Preview comment based on current settings';
    }
    dispose() {
        ConfigWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.ConfigWebviewPanel = ConfigWebviewPanel;

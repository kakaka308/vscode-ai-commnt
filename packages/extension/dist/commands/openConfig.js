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
const types_1 = require("../api/types");
let panel;
function openConfigPanel(context) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        return;
    }
    panel = vscode.window.createWebviewPanel('aiCommentConfig', 'AI Comment 设置', vscode.ViewColumn.One, { enableScripts: true });
    panel.webview.html = getWebviewContent();
    // 接收前端消息（保存配置）
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'saveConfig') {
            const config = vscode.workspace.getConfiguration('aiComment');
            for (const key of Object.keys(message.data)) {
                await config.update(key, message.data[key], vscode.ConfigurationTarget.Global);
            }
            vscode.window.showInformationMessage('AI Comment: 配置已保存！');
        }
    }, undefined, context.subscriptions);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    // 推送当前配置到 Webview
    const config = vscode.workspace.getConfiguration('aiComment');
    panel.webview.postMessage({
        command: 'loadConfig',
        data: {
            apiKey: config.get('apiKey', ''),
            model: config.get('model', 'gpt-3.5-turbo'),
            commentStyle: config.get('commentStyle', 'default'),
            targetLanguage: config.get('targetLanguage', 'auto'),
            aiProvider: config.get('aiProvider', types_1.AIServiceProvider.OpenAI),
            commentMode: config.get('commentMode', 'concise'),
            openaiEndpoint: config.get('openaiEndpoint', 'https://api.openai.com/v1/chat/completions'),
            qwenApiKey: config.get('qwenApiKey', ''),
            qwenModel: config.get('qwenModel', 'qwen-turbo'),
            qwenEndpoint: config.get('qwenEndpoint', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'),
            baiduApiKey: config.get('baiduApiKey', ''),
            baiduSecretKey: config.get('baiduSecretKey', ''),
            baiduModel: config.get('baiduModel', 'ernie-4.0'),
        }
    });
}
function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; max-width: 600px; }
    h2 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
    h3 { margin-top: 24px; color: var(--vscode-textLink-foreground); }
    .form-row { margin: 10px 0; display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 13px; font-weight: 600; }
    input, select {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 6px 8px; border-radius: 3px; font-size: 13px; width: 100%; box-sizing: border-box;
    }
    input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); }
    .section { display: none; }
    .section.active { display: block; }
    button {
      margin-top: 20px; padding: 8px 20px;
      background: var(--vscode-button-background); color: var(--vscode-button-foreground);
      border: none; border-radius: 3px; cursor: pointer; font-size: 13px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .hint { font-size: 11px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h2>⚙️ AI Comment 设置</h2>

  <div class="form-row">
    <label>AI 服务商</label>
    <select id="aiProvider" onchange="switchProvider()">
      <option value="openai">OpenAI</option>
      <option value="qwen">通义千问 (Qwen)</option>
      <option value="baidu">文心一言 (Baidu)</option>
    </select>
  </div>

  <div class="form-row">
    <label>注释模式</label>
    <select id="commentMode">
      <option value="concise">简洁模式（一句话总结）</option>
      <option value="detailed">详细模式（完整注释）</option>
    </select>
  </div>

  <div class="form-row">
    <label>注释风格</label>
    <select id="commentStyle">
      <option value="default">自动（根据语言）</option>
      <option value="javadoc">JavaDoc</option>
      <option value="jsdoc">JSDoc</option>
      <option value="godoc">GoDoc</option>
      <option value="doxygen">Doxygen</option>
    </select>
  </div>

  <div class="form-row">
    <label>目标语言</label>
    <select id="targetLanguage">
      <option value="auto">自动检测</option>
      <option value="java">Java</option>
      <option value="javascript">JavaScript</option>
      <option value="typescript">TypeScript</option>
      <option value="python">Python</option>
      <option value="go">Go</option>
      <option value="cpp">C++</option>
      <option value="c">C</option>
    </select>
  </div>

  <!-- OpenAI 配置 -->
  <div id="section-openai" class="section">
    <h3>🔑 OpenAI 配置</h3>
    <div class="form-row">
      <label>API Key</label>
      <input type="password" id="apiKey" placeholder="sk-..."/>
    </div>
    <div class="form-row">
      <label>模型</label>
      <input type="text" id="model" placeholder="gpt-3.5-turbo"/>
    </div>
    <div class="form-row">
      <label>Endpoint（代理地址，可选）</label>
      <input type="text" id="openaiEndpoint" placeholder="https://api.openai.com/v1/chat/completions"/>
      <span class="hint">使用代理或第三方转发时填写</span>
    </div>
  </div>

  <!-- Qwen 配置 -->
  <div id="section-qwen" class="section">
    <h3>🔑 通义千问配置</h3>
    <div class="form-row">
      <label>API Key</label>
      <input type="password" id="qwenApiKey" placeholder="sk-..."/>
    </div>
    <div class="form-row">
      <label>模型</label>
      <input type="text" id="qwenModel" placeholder="qwen-turbo"/>
    </div>
    <div class="form-row">
      <label>Endpoint（可选）</label>
      <input type="text" id="qwenEndpoint" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"/>
    </div>
  </div>

  <!-- Baidu 配置 -->
  <div id="section-baidu" class="section">
    <h3>🔑 文心一言配置</h3>
    <div class="form-row">
      <label>API Key</label>
      <input type="password" id="baiduApiKey" placeholder="Baidu API Key"/>
    </div>
    <div class="form-row">
      <label>Secret Key</label>
      <input type="password" id="baiduSecretKey" placeholder="Baidu Secret Key"/>
    </div>
    <div class="form-row">
      <label>模型</label>
      <input type="text" id="baiduModel" placeholder="ernie-4.0"/>
    </div>
  </div>

  <button onclick="saveConfig()">💾 保存配置</button>

  <script>
    const vscode = acquireVsCodeApi();

    function switchProvider() {
      const provider = document.getElementById('aiProvider').value;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + provider)?.classList.add('active');
    }

    function saveConfig() {
      vscode.postMessage({
        command: 'saveConfig',
        data: {
          aiProvider: document.getElementById('aiProvider').value,
          commentMode: document.getElementById('commentMode').value,
          commentStyle: document.getElementById('commentStyle').value,
          targetLanguage: document.getElementById('targetLanguage').value,
          apiKey: document.getElementById('apiKey').value,
          model: document.getElementById('model').value,
          openaiEndpoint: document.getElementById('openaiEndpoint').value,
          qwenApiKey: document.getElementById('qwenApiKey').value,
          qwenModel: document.getElementById('qwenModel').value,
          qwenEndpoint: document.getElementById('qwenEndpoint').value,
          baiduApiKey: document.getElementById('baiduApiKey').value,
          baiduSecretKey: document.getElementById('baiduSecretKey').value,
          baiduModel: document.getElementById('baiduModel').value,
        }
      });
    }

    window.addEventListener('message', (event) => {
      const { command, data } = event.data;
      if (command !== 'loadConfig') return;
      document.getElementById('aiProvider').value = data.aiProvider || 'openai';
      document.getElementById('commentMode').value = data.commentMode || 'concise';
      document.getElementById('commentStyle').value = data.commentStyle || 'default';
      document.getElementById('targetLanguage').value = data.targetLanguage || 'auto';
      document.getElementById('apiKey').value = data.apiKey || '';
      document.getElementById('model').value = data.model || 'gpt-3.5-turbo';
      document.getElementById('openaiEndpoint').value = data.openaiEndpoint || '';
      document.getElementById('qwenApiKey').value = data.qwenApiKey || '';
      document.getElementById('qwenModel').value = data.qwenModel || 'qwen-turbo';
      document.getElementById('qwenEndpoint').value = data.qwenEndpoint || '';
      document.getElementById('baiduApiKey').value = data.baiduApiKey || '';
      document.getElementById('baiduSecretKey').value = data.baiduSecretKey || '';
      document.getElementById('baiduModel').value = data.baiduModel || 'ernie-4.0';
      switchProvider();
    });

    switchProvider();
  </script>
</body>
</html>`;
}

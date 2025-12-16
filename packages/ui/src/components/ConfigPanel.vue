<template>
  <div class="config-container">
    <header class="sticky-header">
      <div class="header-content">
        <h2>AI Comment Settings</h2>
        <div class="header-actions">
          <button @click="handleReset" class="btn secondary" title="Reset to defaults">Reset</button>
          <button @click="handleSave" class="btn primary" title="Save changes">Save</button>
        </div>
      </div>
    </header>
    
    <main class="content-area">
      <section class="card">
        <div class="card-header">
          <h3>General</h3>
        </div>
        <div class="card-body">
          <div class="form-row two-col">
            <div class="form-group">
              <label for="commentStyle">Style Strategy</label>
              <div class="select-wrapper">
                <select id="commentStyle" v-model="config.commentStyle" @change="updatePreview">
                  <option value="default">Auto (Language Default)</option>
                  <option value="javadoc">JavaDoc (/** ... */)</option>
                  <option value="jsdoc">JSDoc (@param ...)</option>
                  <option value="godoc">GoDoc (// ...)</option>
                  <option value="doxygen">Doxygen (Brief/Param)</option>
                  <option value="docstring">Python Docstring ("""...""")</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="commentMode">Verbosity</label>
              <div class="select-wrapper">
                <select id="commentMode" v-model="config.commentMode" @change="updatePreview">
                  <option value="concise">Concise (Short Summary)</option>
                  <option value="detailed">Detailed (Full Documentation)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="targetLanguage">Target Language Override</label>
            <input 
              id="targetLanguage" 
              v-model="config.targetLanguage"
              placeholder="auto"
              class="input-text"
            >
            <span class="helper-text">Leave 'auto' to detect from file extension.</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h3>AI Model Provider</h3>
        </div>
        
        <div class="tabs">
          <button 
            v-for="provider in providers" 
            :key="provider.id"
            @click="config.aiProvider = provider.id as any"
            :class="['tab-item', { active: config.aiProvider === provider.id }]"
          >
            {{ provider.name }}
          </button>
        </div>

        <div class="card-body provider-body">
          <div v-if="config.aiProvider === 'openai'" class="provider-form">
            <div class="form-group">
              <label>API Key</label>
              <input type="password" v-model="config.openaiApiKey" placeholder="sk-..." class="input-text">
            </div>
            <div class="form-group">
              <label>Model</label>
               <div class="select-wrapper">
                <select v-model="config.openaiModel">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Custom Endpoint</label>
              <input v-model="config.openaiEndpoint" placeholder="https://api.openai.com/v1/chat/completions" class="input-text">
            </div>
          </div>
          
          <div v-if="config.aiProvider === 'qwen'" class="provider-form">
            <div class="info-banner">Compatible with OpenAI SDK</div>
            <div class="form-group">
              <label>DashScope API Key</label>
              <input type="password" v-model="config.qwenApiKey" placeholder="sk-..." class="input-text">
            </div>
            <div class="form-group">
              <label>Model</label>
              <div class="select-wrapper">
                <select v-model="config.qwenModel">
                  <option value="qwen-turbo">Qwen Turbo</option>
                  <option value="qwen-plus">Qwen Plus</option>
                  <option value="qwen-max">Qwen Max</option>
                  <option value="qwen-coder-turbo">Qwen Coder</option>
                </select>
              </div>
            </div>
          </div>
          
          <div v-if="config.aiProvider === 'baidu'" class="provider-form">
            <div class="form-group">
              <label>API Key</label>
              <input type="password" v-model="config.baiduApiKey" class="input-text">
            </div>
            <div class="form-group">
              <label>Secret Key</label>
              <input type="password" v-model="config.baiduSecretKey" class="input-text">
            </div>
            <div class="form-group">
              <label>Model</label>
              <div class="select-wrapper">
                <select v-model="config.baiduModel">
                  <option value="ernie-3.5">ERNIE-3.5</option>
                  <option value="ernie-4.0">ERNIE-4.0</option>
                  <option value="ernie-lite">ERNIE Lite</option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="config.aiProvider === 'xunfei'" class="provider-form">
             <div class="info-banner warning">WebSocket support coming soon</div>
             <div class="form-group"><label>App ID</label><input v-model="config.xunfeiAppId" class="input-text"></div>
             <div class="form-group"><label>API Key</label><input type="password" v-model="config.xunfeiApiKey" class="input-text"></div>
             <div class="form-group"><label>API Secret</label><input type="password" v-model="config.xunfeiApiSecret" class="input-text"></div>
          </div>
        </div>
      </section>
      
      <section class="card">
        <div class="card-header flex-header">
          <h3>Live Preview</h3>
          <button @click="updatePreview" class="btn-icon" title="Refresh Preview">↻</button>
        </div>
        <div class="preview-box">
          <code>{{ commentPreview }}</code>
        </div>
      </section>
    </main>

    <div v-if="message.text" :class="['toast', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfigStore } from '../store/config'

const store = useConfigStore()
const { config, commentPreview } = storeToRefs(store)
const { saveConfig, resetConfig, loadConfig, updatePreview } = store

const providers = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'qwen', name: 'Qwen (Aliyun)' },
  { id: 'baidu', name: 'Baidu ERNIE' },
  { id: 'xunfei', name: 'iFlytek Spark' }
]

const message = reactive({ text: '', type: 'info' })

const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
  message.text = text
  message.type = type
  setTimeout(() => message.text = '', 3000)
}

const handleSave = async () => {
  try {
    await saveConfig()
    showMessage('Configuration saved!', 'success')
  } catch (e) {
    showMessage('Failed to save.', 'error')
  }
}

const handleReset = () => {
  resetConfig()
  updatePreview()
  showMessage('Reset to defaults.', 'success')
}

onMounted(async () => {
  await loadConfig()
  updatePreview()
})
</script>

<style scoped>
/* 基础容器 */
.config-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

/* 顶部固定栏 */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--vscode-editor-background); /* 保持与背景一致 */
  border-bottom: 1px solid var(--vscode-panel-border);
  padding: 16px 24px;
  box-shadow: 0 4px 6px -6px rgba(0,0,0,0.2);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-sideBarTitle-foreground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 主内容区 */
.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  max-width: 848px; /* 800 + padding */
  margin: 0 auto;
  width: 100%;
}

/* 卡片样式 */
.card {
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  margin-bottom: 24px;
  overflow: hidden;
}

.card-header {
  padding: 12px 16px;
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-widget-border);
}

.flex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 16px;
}

/* 表单元素 */
.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.two-col > * {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-input-placeholderForeground);
}

.input-text, select {
  width: 100%;
  padding: 6px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  outline: none;
  font-family: inherit;
  font-size: 13px;
}

.input-text:focus, select:focus {
  border-color: var(--vscode-focusBorder);
  ring: 1px solid var(--vscode-focusBorder);
}

/* 下拉框由于 OS 样式限制，简单包装一下 */
.select-wrapper {
  position: relative;
}

.helper-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.8;
}

/* 按钮样式 */
.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 2px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn.primary {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.btn.secondary {
  background-color: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-secondaryBackground);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

/* Tab 样式 */
.tabs {
  display: flex;
  background-color: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-widget-border);
}

.tab-item {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--vscode-foreground);
  opacity: 0.7;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.tab-item:hover {
  background-color: var(--vscode-list-hoverBackground);
  opacity: 1;
}

.tab-item.active {
  color: var(--vscode-panelTitle-activeForeground);
  border-bottom-color: var(--vscode-panelTitle-activeBorder);
  opacity: 1;
  font-weight: 500;
  background-color: var(--vscode-editor-background);
}

.provider-body {
  min-height: 180px;
}

.info-banner {
  background-color: var(--vscode-textBlockQuote-background);
  border-left: 3px solid var(--vscode-textBlockQuote-border);
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 12px;
}

.info-banner.warning {
  border-color: var(--vscode-inputValidation-warningBorder);
}

/* 预览区 */
.preview-box {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.preview-box code {
  font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
  font-size: var(--vscode-editor-font-size, 13px);
  white-space: pre;
}

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 13px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideUp 0.3s ease;
  z-index: 100;
}

.toast.success { background-color: #2da042; }
.toast.error { background-color: #d03535; }
.toast.info { background-color: #0078d4; }

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
<script setup lang="ts">
import { useConfig } from '../composables/useConfig'
import ProviderSection from './ProviderSection.vue'
import type { AICommentConfig } from '../types/config'

const {
  config,
  isLoading,
  isSaving,
  saveSuccess,
  currentProvider,
  handleSave,
} = useConfig()

function updateConfig(val: AICommentConfig) {
  config.value = val
}
</script>

<template>
  <div class="panel">
    <!-- 加载中 -->
    <div v-if="isLoading" class="loading">
      <span>加载配置中...</span>
    </div>

    <template v-else>
      <div class="panel-header">
        <h2 class="panel-title">⚙️ AI Comment 设置</h2>
      </div>

      <div class="panel-body">

        <!-- ── 通用设置 ── -->
        <section class="group">
          <h3 class="group-title">通用设置</h3>

          <div class="form-row">
            <label>AI 服务商</label>
            <div class="radio-group">
              <label class="radio-item" :class="{ active: config.aiProvider === 'openai' }">
                <input type="radio" v-model="config.aiProvider" value="openai" />
                OpenAI
              </label>
              <label class="radio-item" :class="{ active: config.aiProvider === 'qwen' }">
                <input type="radio" v-model="config.aiProvider" value="qwen" />
                通义千问
              </label>
              <label class="radio-item" :class="{ active: config.aiProvider === 'baidu' }">
                <input type="radio" v-model="config.aiProvider" value="baidu" />
                文心一言
              </label>
            </div>
          </div>

          <div class="form-row">
            <label>注释模式</label>
            <div class="toggle-group">
              <button
                class="toggle-btn"
                :class="{ active: config.commentMode === 'concise' }"
                @click="config.commentMode = 'concise'"
              >
                简洁模式
                <span class="toggle-desc">一句话总结</span>
              </button>
              <button
                class="toggle-btn"
                :class="{ active: config.commentMode === 'detailed' }"
                @click="config.commentMode = 'detailed'"
              >
                详细模式
                <span class="toggle-desc">完整注释块</span>
              </button>
            </div>
          </div>

          <div class="form-row">
            <label>注释风格</label>
            <select v-model="config.commentStyle">
              <option value="default">自动（根据语言）</option>
              <option value="javadoc">JavaDoc</option>
              <option value="jsdoc">JSDoc</option>
              <option value="godoc">GoDoc</option>
              <option value="doxygen">Doxygen</option>
            </select>
          </div>

          <div class="form-row">
            <label>目标语言</label>
            <select v-model="config.targetLanguage">
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
        </section>

        <!-- ── 服务商配置（根据选择动态切换） ── -->
        <section class="group">
          <ProviderSection
            :provider="currentProvider"
            :config="config"
            @update:config="updateConfig"
          />
        </section>

      </div>

      <!-- ── 底部保存按钮 ── -->
      <div class="panel-footer">
        <button
          class="save-btn"
          :class="{ saving: isSaving, success: saveSuccess }"
          :disabled="isSaving"
          @click="handleSave" onclick="alert('native click works')"
        >
          <span v-if="isSaving">保存中...</span>
          <span v-else-if="saveSuccess">✓ 已保存</span>
          <span v-else>💾 保存配置</span>
        </button>
      </div>

    </template>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 640px;
  margin: 0 auto;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
}

.panel-header {
  padding: 20px 20px 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--vscode-foreground);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
}

/* 分组 */
.group {
  margin-bottom: 8px;
}

.group-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vscode-descriptionForeground);
  margin: 0 0 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

/* 表单行 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-row > label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.form-row select {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  padding: 5px 8px;
  border-radius: 2px;
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  outline: none;
}

.form-row select:focus {
  border-color: var(--vscode-focusBorder);
}

/* 服务商单选按钮组 */
.radio-group {
  display: flex;
  gap: 8px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 2px;
  cursor: pointer;
  font-size: 12px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  transition: border-color 0.15s;
  user-select: none;
}

.radio-item input[type="radio"] {
  display: none;
}

.radio-item.active {
  border-color: var(--vscode-focusBorder);
  color: var(--vscode-textLink-foreground);
  background: var(--vscode-editor-selectionBackground);
}

/* 注释模式切换按钮 */
.toggle-group {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 2px;
  background: var(--vscode-input-background);
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.15s;
}

.toggle-btn:hover {
  border-color: var(--vscode-focusBorder);
}

.toggle-btn.active {
  border-color: var(--vscode-focusBorder);
  color: var(--vscode-textLink-foreground);
  background: var(--vscode-editor-selectionBackground);
}

.toggle-desc {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
}

.toggle-btn.active .toggle-desc {
  color: var(--vscode-textLink-foreground);
  opacity: 0.8;
}

/* 底部保存 */
.panel-footer {
  padding: 12px 20px 20px;
  border-top: 1px solid var(--vscode-panel-border);
}

.save-btn {
  width: 100%;
  padding: 8px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn.success {
  background: var(--vscode-testing-iconPassed, #4caf50);
}
</style>
<script setup lang="ts">
import type { AICommentConfig, AIProvider } from '../types/config'

const props = defineProps<{
  provider: AIProvider
  config: AICommentConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', val: AICommentConfig): void
}>()

function update(key: keyof AICommentConfig, value: string) {
  emit('update:config', { ...props.config, [key]: value })
}
</script>

<template>
  <!-- OpenAI -->
  <div v-if="provider === 'openai'" class="section">
    <h3 class="section-title">🔑 OpenAI 配置</h3>

    <div class="form-row">
      <label>API Key</label>
      <input
        type="password"
        :value="config.apiKey"
        placeholder="sk-..."
        @input="update('apiKey', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="form-row">
      <label>模型</label>
      <select :value="config.model" @change="update('model', ($event.target as HTMLSelectElement).value)">
        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
        <option value="gpt-4">gpt-4</option>
        <option value="gpt-4o">gpt-4o</option>
        <option value="gpt-4o-mini">gpt-4o-mini</option>
      </select>
    </div>

    <div class="form-row">
      <label>Endpoint <span class="optional">（代理地址，可选）</span></label>
      <input
        type="text"
        :value="config.openaiEndpoint"
        placeholder="https://api.openai.com/v1/chat/completions"
        @input="update('openaiEndpoint', ($event.target as HTMLInputElement).value)"
      />
      <span class="hint">使用代理或第三方转发时填写，留空使用默认地址</span>
    </div>
  </div>

  <!-- Qwen -->
  <div v-else-if="provider === 'qwen'" class="section">
    <h3 class="section-title">🔑 通义千问配置</h3>

    <div class="form-row">
      <label>API Key</label>
      <input
        type="password"
        :value="config.qwenApiKey"
        placeholder="sk-..."
        @input="update('qwenApiKey', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="form-row">
      <label>模型</label>
      <select :value="config.qwenModel" @change="update('qwenModel', ($event.target as HTMLSelectElement).value)">
        <option value="qwen-turbo">qwen-turbo</option>
        <option value="qwen-plus">qwen-plus</option>
        <option value="qwen-max">qwen-max</option>
        <option value="qwen-long">qwen-long</option>
      </select>
    </div>

    <div class="form-row">
      <label>Endpoint <span class="optional">（可选）</span></label>
      <input
        type="text"
        :value="config.qwenEndpoint"
        placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        @input="update('qwenEndpoint', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>

  <!-- Baidu -->
  <div v-else-if="provider === 'baidu'" class="section">
    <h3 class="section-title">🔑 文心一言配置</h3>

    <div class="form-row">
      <label>API Key</label>
      <input
        type="password"
        :value="config.baiduApiKey"
        placeholder="Baidu API Key"
        @input="update('baiduApiKey', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="form-row">
      <label>Secret Key</label>
      <input
        type="password"
        :value="config.baiduSecretKey"
        placeholder="Baidu Secret Key"
        @input="update('baiduSecretKey', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="form-row">
      <label>模型</label>
      <select :value="config.baiduModel" @change="update('baiduModel', ($event.target as HTMLSelectElement).value)">
        <option value="ernie-4.0">ernie-4.0</option>
        <option value="ernie-3.5">ernie-3.5</option>
        <option value="ernie-lite">ernie-lite</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--vscode-textLink-foreground);
  margin: 24px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.form-row label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.optional {
  font-weight: 400;
  color: var(--vscode-descriptionForeground);
}

.form-row input,
.form-row select {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  padding: 5px 8px;
  border-radius: 2px;
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  outline: none;
}

.form-row input:focus,
.form-row select:focus {
  border-color: var(--vscode-focusBorder);
}

.hint {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
</style>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVscodeApi } from './useVscodeApi'
import { DEFAULT_CONFIG } from '../types/config'
import type { AICommentConfig } from '../types/config'

export function useConfig() {
  const { requestConfig, saveConfig, onMessage } = useVscodeApi()

  const config = ref<AICommentConfig>({ ...DEFAULT_CONFIG })
  const isSaving = ref(false)
  const saveSuccess = ref(false)
  const isLoading = ref(true)

  let removeListener: (() => void) | null = null

  onMounted(() => {
    removeListener = onMessage((message) => {
      alert('message received: ' + message.command)
      if (message.command === 'loadConfig' && message.data) {
        config.value = { ...DEFAULT_CONFIG, ...(message.data as Partial<AICommentConfig>) }
        isLoading.value = false
      }
    })
    requestConfig()
  })

  onUnmounted(() => {
    removeListener?.()
  })


const handleSave = async () => {
  console.log('[Webview] 准备保存配置:', config.value); // 浏览器控制台可见
  isSaving.value = true;
  saveSuccess.value = false;
  
  try {
    // 确保调用的是新的 saveConfig
    saveConfig(JSON.parse(JSON.stringify(config.value))); 
    
    setTimeout(() => {
      isSaving.value = false;
      saveSuccess.value = true;
      setTimeout(() => { saveSuccess.value = false }, 2000);
    }, 500);
  } catch (e) {
    isSaving.value = false;
    console.error('保存失败:', e);
  }
};

  const currentProvider = computed(() => config.value.aiProvider)

  return {
    config,
    isLoading,
    isSaving,
    saveSuccess,
    currentProvider,
    handleSave,
  }
}
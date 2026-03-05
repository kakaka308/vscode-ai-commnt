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

  // 监听 extension 推送过来的配置
  let removeListener: (() => void) | null = null

  onMounted(() => {
    removeListener = onMessage((message) => {
      if (message.command === 'loadConfig' && message.data) {
        config.value = { ...DEFAULT_CONFIG, ...(message.data as Partial<AICommentConfig>) }
        isLoading.value = false
      }
    })
    // 主动请求一次当前配置
    requestConfig()
  })

  onUnmounted(() => {
    removeListener?.()
  })

  // 保存配置
  const handleSave = async () => {
    isSaving.value = true
    saveSuccess.value = false
    try {
      saveConfig(config.value)
      // 短暂显示成功状态
      setTimeout(() => {
        isSaving.value = false
        saveSuccess.value = true
        setTimeout(() => { saveSuccess.value = false }, 2000)
      }, 300)
    } catch {
      isSaving.value = false
    }
  }

  // 根据当前服务商决定哪些字段需要展示
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
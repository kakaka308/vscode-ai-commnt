import { createApp } from 'vue'
import { createPinia } from 'pinia' // 1. 导入 createPinia
import './style.css'
import App from './App.vue'

const app = createApp(App) // 2. 创建 app 实例
const pinia = createPinia() // 3. 创建 pinia 实例

app.use(pinia) // 4. 挂载 pinia (必须在 mount 之前)
app.mount('#app')
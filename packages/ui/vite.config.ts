import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue() as any,
    // 构建时把资源路径替换为占位符，Extension 加载时再替换为真实 URI
    {
      name: 'webview-base-placeholder',
      transformIndexHtml(html) {
        return html
          .replace(/src="\/assets\//g, 'src="__WEBVIEW_BASE__/assets/')
          .replace(/href="\/assets\//g, 'href="__WEBVIEW_BASE__/assets/')
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
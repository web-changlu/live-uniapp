// store/index.js
import { createPinia } from 'pinia'

// 创建pinia实例
const pinia = createPinia()

// 直接导出store模块
export { useLiveStore } from './modules/live'
export { useUserStore } from './modules/user'
export { useTrtcStore } from './modules/trtc'

export default pinia
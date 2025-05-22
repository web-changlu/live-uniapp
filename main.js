import * as Pinia from 'pinia'
import App from './App'
import pinia from './store'
import { createSSRApp } from 'vue'
import { useLiveStore } from '@/store/modules/live';
import { useUserStore } from '@/store/modules/user';
import { useTrtcStore } from '@/store/modules/trtc';

// #ifndef VUE3
// import Vue from 'vue'
// Vue.config.productionTip = false
// App.mpType = 'app'
// const app = new Vue({
//     ...App
// })
// app.use(pinia)
// app.$mount()
// #endif

// #ifdef VUE3
export function createApp() {
  const app = createSSRApp(App)
  app.use(pinia)
  return {
    app,
    Pinia
  }
}
createApp()
// #endif
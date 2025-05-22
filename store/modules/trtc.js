// store/modules/trtc.js
import { defineStore } from 'pinia'
import TrtcCloud from '@/TrtcCloud/lib/index';

export const useTrtcStore = defineStore('trtc', {
  state: () => ({
    // TRTC实例
    trtcCloud: null,
    // 房间ID
    roomId: '',
    // 本地流
    localStream: {
      videoEnabled: true,
      audioEnabled: true,
      screenShareEnabled: false,
      videoView: null, // 本地视频视图
    },
    // 远程流列表
    remoteStreams: [],
    // 连接状态
    connectionState: 'disconnected', // disconnected, connecting, connected
    // 网络质量
    networkQuality: {
      uplink: 0,
      downlink: 0
    },
    // 错误信息
    error: null,
    // 加载状态
    loading: false
  }),

  getters: {
    // 判断是否已连接
    isConnected: (state) => state.connectionState === 'connected',

    // 获取远程流数量
    remoteStreamCount: (state) => state.remoteStreams.length,

    // 判断本地视频是否开启
    isLocalVideoEnabled: (state) => state.localStream.videoEnabled,

    // 判断本地音频是否开启
    isLocalAudioEnabled: (state) => state.localStream.audioEnabled,

    // 判断屏幕共享是否开启
    isScreenShareEnabled: (state) => state.localStream.screenShareEnabled
  },

  actions: {
    // 初始化TRTC
    async initTrtc() {
      try {
        this.loading = true
        this.error = null

        // 初始化TRTC实例
        if (!this.trtcCloud) {
          // 在uni-app中获取TRTC插件实例
          this.trtcCloud = TrtcCloud.createInstance()
          this.handleEvents();
        }
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || 'TRTC初始化失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    handleEvents(){
      this.trtcCloud.on('onWarning', (res) => {
        uni.showToast({
          title: `onWarning: ${JSON.stringify(res)}`,
          icon: 'none',
        });
      });
      this.trtcCloud.on('onError', (res) => {
        console.log('- onError: ', JSON.stringify(res));
        uni.showToast({
          title: `error: ${JSON.stringify(res)}`,
          icon: 'none',
        });
      });
      this.trtcCloud.on('onEnterRoom', (result) => {
        console.log(`- onEnterRoom = ${result}`);
        if (result > 0) {
          uni.showToast({
            title: `进房成功，耗时: ${result}ms`,
            icon: 'none',
          });
        } else {
          console.log(`enter room failed，error code = ${result}`);
        }
      });
      this.trtcCloud.on('onExitRoom', (reason) => {
        const reasonList = ['主动调用 exitRoom 退房', '被服务器踢出当前房间', '当前房间整个被解散'];
        uni.showToast({
          title: `退房 ${reasonList[reason]}`,
          icon: 'none',
          duration: 1000
        });
      });
      this.trtcCloud.on('onFirstVideoFrame', (res) => {
        console.log(`渲染的首帧画面响应 = ${JSON.stringify(res)}`);
      });
      this.trtcCloud.on('onRemoteUserEnterRoom', (userId) => {
        this.remoteUserId = userId;
        uni.showToast({
          title: `远端进房: userId = ${userId}`,
          icon: 'none',
        });
      });
      this.trtcCloud.on('onUserVideoAvailable', (res) => {
        const {
          userId,
          available
        } = res;
        console.log('onUserVideoAvailable = ', res);
        if (userId && available) {
          this.remoteUserId = userId;
        }
      });
    },
    // 创建本地预览
    async startLocalPreview(viewId) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          await this.initTrtc()
        }

        // 开启本地预览
        // 注意：这里的实际API调用可能需要根据TRTC SDK的具体实现进行调整
        this.trtcCloud.startLocalPreview(true, viewId)

        // 保存视图ID
        this.localStream.videoView = viewId

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '开启本地预览失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 停止本地预览
    async stopLocalPreview() {
      try {
        this.loading = true
        this.error = null

        if (this.trtcCloud) {
          // 停止本地预览
          this.trtcCloud.stopLocalPreview()

          // 清除视图ID
          this.localStream.videoView = null
        }

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '停止本地预览失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 加入房间
    async joinRoom(options) {
      try {
        this.loading = true
        this.error = null
        this.connectionState = 'connecting'

        const { roomId, userId, userSig, sdkAppId, role = 'anchor' } = options

        // 保存房间ID
        this.roomId = roomId

        if (!this.trtcCloud) {
          await this.initTrtc()
        }

        // 构建进房参数
        const param = {
          sdkAppId: sdkAppId,
          userId: userId,
          userSig: userSig,
          roomId: parseInt(roomId),
          role: role === 'anchor' ? 20 : 21, // 20是主播，21是观众
        }

        // 进入房间
        this.trtcCloud.enterRoom(param)

        // 更新连接状态
        this.connectionState = 'connected'

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '加入房间失败'
        this.connectionState = 'disconnected'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 离开房间
    async leaveRoom() {
      try {
        this.loading = true
        this.error = null

        if (this.trtcCloud && this.connectionState === 'connected') {
          // 使用TRTC API离开房间
          this.trtcCloud.exitRoom()
        }

        // 更新连接状态
        this.connectionState = 'disconnected'

        // 清空远程流列表
        this.remoteStreams = []

        // 重置房间ID
        this.roomId = ''

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '离开房间失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 开启/关闭本地视频
    async toggleLocalVideo(enabled) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          await this.initTrtc()
        }

        // 使用TRTC API开启/关闭本地视频
        this.trtcCloud.muteLocalVideo(!enabled)

        // 更新本地流状态
        this.localStream.videoEnabled = enabled
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '操作本地视频失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 开启/关闭本地音频
    async toggleLocalAudio(enabled) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          await this.initTrtc()
        }

        // 使用TRTC API开启/关闭本地音频
        this.trtcCloud.muteLocalAudio(!enabled)
        // 更新本地流状态
        this.localStream.audioEnabled = enabled
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '操作本地音频失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 开启/关闭屏幕共享
    async toggleScreenShare(enabled) {
      try {
        this.loading = true
        this.error = null

        // 这里可以添加实际的开启/关闭屏幕共享逻辑
        // 例如：enabled ? this.trtcCloud.startScreenCapture() : this.trtcCloud.stopScreenCapture()
        // 更新本地流状态
        this.localStream.screenShareEnabled = enabled
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '操作屏幕共享失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    // 切换摄像头
    async switchCamera() {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          await this.initTrtc()
        }

        // 使用TRTC提供的switchCamera方法切换摄像头
        // true表示切换到前置摄像头，false表示切换到后置摄像头
        // 这里我们切换当前状态，如果当前是前置则切换到后置，反之亦然
        const isFrontCamera = !this.currentDevices.isFrontCamera
        this.trtcCloud.switchCamera(isFrontCamera)

        // 更新当前摄像头状态
        this.currentDevices.isFrontCamera = isFrontCamera

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '切换摄像头失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 切换麦克风
    async switchMicrophone(microphoneId) {
      try {
        this.loading = true
        this.error = null

        // 这里可以添加实际的切换麦克风逻辑
        // 例如：this.trtcCloud.setCurrentMicDevice(microphoneId)

        // 更新当前设备
        this.currentDevices.microphoneId = microphoneId

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '切换麦克风失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 切换扬声器
    async switchSpeaker(speakerId) {
      try {
        this.loading = true
        this.error = null

        // 这里可以添加实际的切换扬声器逻辑
        // 例如：this.trtcCloud.setCurrentSpeakerDevice(speakerId)

        // 更新当前设备
        this.currentDevices.speakerId = speakerId

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '切换扬声器失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 添加远程流
    addRemoteStream(stream) {
      this.remoteStreams.push(stream)
    },

    // 移除远程流
    removeRemoteStream(userId) {
      const index = this.remoteStreams.findIndex(stream => stream.userId === userId)
      if (index !== -1) {
        this.remoteStreams.splice(index, 1)
      }
    },

    // 更新网络质量
    updateNetworkQuality(quality) {
      this.networkQuality = quality
    },

    // 销毁TRTC
    async destroyTrtc() {
      try {
        this.loading = true
        this.error = null

        // 如果已连接，先离开房间
        if (this.connectionState === 'connected') {
          await this.leaveRoom()
        }

        // 这里可以添加实际的销毁TRTC逻辑

        // 重置状态
        this.trtcCloud = null
        this.roomId = ''
        this.localStream = {
          videoEnabled: true,
          audioEnabled: true,
          screenShareEnabled: false,
          videoView: null, // 本地视频视图
        }
        this.remoteStreams = []
        this.connectionState = 'disconnected'
        this.currentDevices = {
          isFrontCamera: true,
        }
        this.networkQuality = {
          uplink: 0,
          downlink: 0
        }

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '销毁TRTC失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    }
  }
})
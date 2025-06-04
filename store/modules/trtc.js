// store/modules/trtc.js
import { defineStore } from 'pinia'
import TrtcCloud from '@/TrtcCloud/lib/index';
import { TRTCAppScene, TRTCRoleType, TRTCVideoStreamType } from '@/TrtcCloud/lib/TrtcDefines';

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
    currentDevices: {
      isFrontCamera: true,
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
    initTrtc() {
      try {
        this.loading = true
        this.error = null

        // 初始化TRTC实例
        if (!this.trtcCloud) {
          // 在uni-app中获取TRTC插件实例
          this.trtcCloud = TrtcCloud.createInstance()
          this.handleEvents();
        }
        console.log('TRTC实例初始化成功')
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || 'TRTC初始化失败'
        console.error('error:',this.error);
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
    handleUninstallEvents() {
      this.trtcCloud.off('*');
    },
    // 创建本地预览
    startLocalPreview(viewId) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          this.initTrtc()
        }

        // 开启本地预览
        console.log('开启本地预览') 
        this.trtcCloud.startLocalPreview(true, viewId)
        this.trtcCloud.startLocalAudio();
        // 保存视图ID
        this.localStream.videoView = viewId

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '开启本地预览失败'
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    stopLocalAudio() {
      this.trtcCloud.stopLocalAudio();
    },

    // 停止本地预览
    stopLocalPreview() {
      try {
        this.loading = true
        this.error = null

        if (this.trtcCloud) {
          // 停止本地预览
          this.trtcCloud.stopLocalPreview()

          // 清除视图ID
          this.localStream.videoView = null;
          this.localStream.videoEnabled = false;
        }

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '停止本地预览失败'
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 加入房间
    joinRoom(options) {
      try {
        this.loading = true
        this.error = null
        this.connectionState = 'connecting'

        const { roomId, userId, userSig, sdkAppId, role = 'anchor' } = options

        // 保存房间ID
        this.roomId = roomId

        if (!this.trtcCloud) {
          this.initTrtc()
        }

        // 构建进房参数
        const param = {
          sdkAppId: sdkAppId,
          userId: userId,
          userSig: userSig,
          roomId: parseInt(roomId),
          role: role === 'anchor' ? TRTCRoleType.TRTCRoleAnchor : TRTCRoleType.TRTCRoleAudience, // 主播，观众
          businessInfo: {
            // 自定义业务参数
            appScene: 'live' // 直播场景
          }
        }

        // 进入房间
        this.trtcCloud.enterRoom(param, TRTCAppScene.TRTCAppSceneLIVE)

        // 更新连接状态
        this.connectionState = 'connected'

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '加入房间失败'
        console.error('error:',this.error);
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
    leaveRoom() {
      try {
        this.loading = true
        this.error = null

        if (this.trtcCloud && this.connectionState === 'connected') {
          // 使用TRTC API离开房间
          this.trtcCloud.exitRoom()
          // TODO onExitRoom回调内再开启直播权限
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
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 开启/关闭本地视频
    toggleLocalVideo(enabled) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          this.initTrtc()
        }
        
        // 使用TRTC API开启/关闭本地视频
        this.trtcCloud.muteLocalVideo(TRTCVideoStreamType.TRTCVideoStreamTypeBig, !enabled)

        // 更新本地流状态
        this.localStream.videoEnabled = enabled
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '操作本地视频失败'
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 开启/关闭本地音频
    toggleLocalAudio(enabled) {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          this.initTrtc()
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
        console.error('error:',this.error);
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
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    // 切换摄像头
    switchCamera() {
      try {
        this.loading = true
        this.error = null

        if (!this.trtcCloud) {
          this.initTrtc()
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
        console.error('error:',this.error);
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
        console.error('error:',this.error);
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
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    startRemoteStreamPreview(userId, viewId) {
      try {
        this.loading = true
        this.error = null
        if (!this.trtcCloud) {
          this.initTrtc()
        }
        this.trtcCloud.startRemoteView(userId, TRTCVideoStreamType.TRTCVideoStreamTypeBig, viewId)
        // this.trtcCloud.startRemoteAudio(userId) 没找到对应api
        this.addRemoteStream({userId})
        console.log('----------开启远程预览成功---------------')
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '开启远程预览失败'
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      }
    },
    stopRemoteStreamPreview(userId) {
      try {
        this.loading = true
        this.error = null
        if (!this.trtcCloud) {
          this.initTrtc()
        }
        this.trtcCloud.stopRemoteView(userId, TRTCVideoStreamType.TRTCVideoStreamTypeBig)
        // this.trtcCloud.stopRemoteAudio(userId)
        this.removeRemoteStream(userId)
      } catch (error) {
        this.error = error.message || '停止远程预览失败'
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
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
    destroyTrtc() {
      try {
        this.loading = true
        this.error = null

        // 如果已连接，先离开房间
        if (this.connectionState === 'connected') {
          this.leaveRoom()
        }

        // 这里可以添加实际的销毁TRTC逻辑
        TrtcCloud.destroyInstance()
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
        console.error('error:',this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 新增方法：开始直播流（主播端）
    startLiveStream(options) {
      try {
        this.loading = true
        this.error = null

        // 初始化TRTC
        this.initTrtc();

        // 作为主播加入房间
        const joinResult = this.joinRoom({
          ...options,
          role: 'anchor'
        });

        if (!joinResult.success) {
          return joinResult;
        }

        // 开启本地预览和音频
        if (options.viewId) {
          const localViewRes = this.startLocalPreview(options.viewId);
          if(localViewRes.success) {
            uni.showToast({
              title: '本地预览启动成功',
              icon: 'success'
            });
          } else {
            uni.showToast({
              title: localViewRes.error || '启动本地预览失败',
              icon: 'none'
            });
          }
        }

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || 'TRTC开始直播流失败'
        console.error('error:', this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 新增方法：加入直播流（观众端）
    joinLiveStream(options) {
      try {
        this.loading = true
        this.error = null

        // 初始化TRTC
        this.initTrtc();

        // 作为观众加入房间
        const joinResult = this.joinRoom({
          ...options,
          role: 'audience'
        });

        if (!joinResult.success) {
          return joinResult;
        }

        // 如果提供了远程用户ID和视图ID，开始预览远程流
        if (options.remoteUserId && options.remoteViewId) {
          this.startRemoteStreamPreview(options.remoteUserId, options.remoteViewId);
        }

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '加入直播流失败'
        console.error('error:', this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 新增方法：结束直播流
    endLiveStream() {
      try {
        this.loading = true
        this.error = null

        // 停止本地预览和音频
        this.stopLocalPreview();
        this.stopLocalAudio();

        // 离开房间
        this.leaveRoom();

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '结束直播流失败'
        console.error('error:', this.error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },

    // 新增方法：离开直播流（观众端）
    leaveLiveStream() {
      try {
        this.loading = true
        this.error = null

        // 停止远程流预览
        if (this.remoteStreams.length > 0) {
          this.remoteStreams.forEach(stream => {
            if (stream.userId) {
              this.stopRemoteStreamPreview(stream.userId);
            }
          });
        }

        // 离开房间
        this.leaveRoom();

        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '离开直播流失败'
        console.error('error:', this.error);
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
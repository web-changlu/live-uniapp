// store/modules/live.js
import { defineStore } from 'pinia'
import { useTrtcStore } from '@/store/modules/trtc';
import { useUserStore } from '@/store/modules/user';
import { TRTCAppScene, TRTCRoleType, TRTCVideoStreamType, TRTCBeautyStyle } from '@/TrtcCloud/lib/TrtcDefines';

export const useLiveStore = defineStore('live', {
  state: () => ({
    // 直播基本信息
    liveInfo: {
      id: '',
      title: '',
      description: '',
      coverImage: '',
      startTime: null,
      endTime: null,
      status: 'idle', // idle, preparing, live, ended
    },
    // 主播信息
    anchor: {
      id: '',
      name: '',
      avatar: ''
    },
    // 观众列表
    viewers: [],
    // 直播间统计信息
    stats: {
      viewerCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0
    },
    // 直播间消息列表
    messages: [],
    // 直播间礼物列表
    gifts: [],
    // 直播设置
    settings: {
      resolution: '720p',
      bitrate: 1500,
      frameRate: 15,
      beauty: 5,
      filter: 'normal'
    },
    // 直播错误信息
    error: null,
    // 直播加载状态
    loading: false,
    beautyLevel: 5, // 美颜级别，取值范围0 - 9； 0表示关闭，9表示效果最明显。
    currentBeautyStyle: TRTCBeautyStyle.TRTCBeautyStyleSmooth,
    beautyStyleOptions: [
      {
        label: '光滑',
        value: TRTCBeautyStyle.TRTCBeautyStyleSmooth
      },
      {
        label: '自然',
        value: TRTCBeautyStyle.TRTCBeautyStyleNature
      },
      {
        label: '优图',
        value: TRTCBeautyStyle.TRTCBeautyStylePitu
      },
    ]
  }),
  
  getters: {
    // 获取直播状态
    liveStatus: (state) => state.liveInfo.status,
    
    // 判断是否正在直播
    isLiving: (state) => state.liveInfo.status === 'live',
    
    // 获取观众数量
    viewerCount: (state) => state.stats.viewerCount,
    
    // 获取最近的消息
    recentMessages: (state) => state.messages.slice(-10),
    
    // 获取直播间完整信息
    liveRoomInfo: (state) => {
      return {
        ...state.liveInfo,
        anchor: state.anchor,
        stats: state.stats
      }
    }
  },
  
  actions: {
    // 设置直播信息
    setLiveInfo(info) {
      this.liveInfo = { ...this.liveInfo, ...info }
    },
    
    // 更新直播状态
    updateLiveStatus(status) {
      this.liveInfo.status = status
      
      if (status === 'live') {
        this.liveInfo.startTime = new Date()
      } else if (status === 'ended') {
        this.liveInfo.endTime = new Date()
      }
    },
    setLiveData(liveData) {
      //TODO 房间号从后端获取
      const liveId = Date.now()
        // 设置直播信息
        this.setLiveInfo({
          title: liveData.title,
          description: liveData.description,
          coverImage: liveData.coverImage,
          id: liveId
        })
        // 设置主播信息
        this.anchor = {
          id: liveData.userId,
          name: liveData.userName || '主播',
          avatar: liveData.userAvatar || '',
        }
        return {
          success: true,
          liveId: this.liveInfo.id
        }
    },
    // 开始直播
    startLive() {
      try {
        this.loading = true
        this.error = null
        // 更新直播状态为准备中
        this.updateLiveStatus('preparing')
        const trtcStore = useTrtcStore();
        const userStore = useUserStore();

        // 使用trtcStore的startLiveStream方法
        const joinResult = trtcStore.startLiveStream({
          roomId: this.liveInfo.id,
          userId: this.anchor.id,
          userSig: userStore.userInfo.userSig,
          sdkAppId: userStore.userInfo.sdkAppId
        });

        if (!joinResult.success) {
          throw new Error(joinResult.error || '加入房间失败');
        }
        
        // 更新直播状态为直播中
        this.updateLiveStatus('live')
        
        return {
          success: true,
          liveId: this.liveInfo.id
        }
      } catch (error) {
        this.error = error.message || 'LIVE开始直播失败'
        console.error('[startLive] error:', error);
        // 重置直播状态
        this.resetLiveState();
        // 返回上一页
        uni.navigateBack();
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    // 开始美颜
    startBeauty() {
      const trtcStore = useTrtcStore();
      console.log(`设置美颜级别：${this.beautyLevel} 美颜模式：${this.currentBeautyStyle}`)
      return trtcStore.setBeauty(this.beautyLevel, this.currentBeautyStyle);
    },
    
    // 结束直播
    endLive() {
      try {
        this.loading = true
        this.error = null
        
        // 使用trtcStore的endLiveStream方法
        const trtcStore = useTrtcStore();
        const result = trtcStore.endLiveStream();

        if (!result.success) {
          throw new Error(result.error || '结束直播失败');
        }

        trtcStore.destroyTrtc()

        // 更新直播状态为已结束
        this.updateLiveStatus('ended')
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '结束直播失败'
        console.error('[endLive] error:', error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 加入直播间（观众）
    joinLiveRoom(liveId, userData) {
      try {
        this.loading = true
        this.error = null
        
        // 使用trtcStore的joinLiveStream方法
        const trtcStore = useTrtcStore();
        const userStore = useUserStore();

        const result = trtcStore.joinLiveStream({
          roomId: liveId,
          userId: userData.userId,
          userSig: userData.userSig,
          sdkAppId: userData.sdkAppId,
          remoteUserId: userData.remoteUserId, // 添加主播ID用于观看
          remoteViewId: userData.remoteViewId
        });

        if (!result.success) {
          throw new Error(result.error || '加入直播间失败');
        }

        // 添加观众到列表
        this.viewers.push({
          id: userData.userId,
          name: userData.userName || '观众',
          avatar: userData.userAvatar || '',
          joinTime: new Date()
        })
        
        // 更新观众数量
        this.stats.viewerCount = this.viewers.length
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '加入直播间失败'
        console.error('[joinLiveRoom] error:', error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 离开直播间（观众）
    leaveLiveRoom(userId) {
      try {
        this.loading = true
        this.error = null

        // 使用trtcStore的leaveLiveStream方法
        const trtcStore = useTrtcStore();
        const result = trtcStore.leaveLiveStream();

        if (!result.success) {
          throw new Error(result.error || '离开直播间失败');
        }

        trtcStore.destroyTrtc()
        // 从观众列表中移除
        const index = this.viewers.findIndex(viewer => viewer.id === userId)
        if (index !== -1) {
          this.viewers.splice(index, 1)
        }
        
        // 更新观众数量
        this.stats.viewerCount = this.viewers.length
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '离开直播间失败'
        console.error('[leaveLiveRoom] error:', error);
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 发送消息
    sendMessage(message) {
      const newMessage = {
        id: 'msg_' + Date.now(),
        userId: message.userId,
        userName: message.userName,
        userAvatar: message.userAvatar,
        content: message.content,
        type: message.type || 'text',
        timestamp: new Date()
      }
      
      this.messages.push(newMessage)
      this.stats.commentCount++
      
      return newMessage
    },
    
    // 发送礼物
    sendGift(gift) {
      const newGift = {
        id: 'gift_' + Date.now(),
        userId: gift.userId,
        userName: gift.userName,
        userAvatar: gift.userAvatar,
        giftId: gift.giftId,
        giftName: gift.giftName,
        giftImage: gift.giftImage,
        giftValue: gift.giftValue,
        count: gift.count || 1,
        timestamp: new Date()
      }
      
      this.gifts.push(newGift)
      
      return newGift
    },
    
    // 点赞
    addLike() {
      this.stats.likeCount++
    },
    
    // 分享
    addShare() {
      this.stats.shareCount++
    },
    
    // 更新直播设置
    updateSettings(settings) {
      this.settings = { ...this.settings, ...settings }
    },
    
    // 重置直播状态
    resetLiveState() {
      this.liveInfo = {
        id: '',
        title: '',
        description: '',
        coverImage: '',
        startTime: null,
        endTime: null,
        status: 'idle'
      }
      this.anchor = {
        id: '',
        name: '',
        avatar: ''
      }
      this.viewers = []
      this.stats = {
        viewerCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0
      }
      this.messages = []
      this.gifts = []
      this.error = null
      this.loading = false
    }
  }
})
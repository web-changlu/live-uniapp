// store/modules/live.js
import { defineStore } from 'pinia'

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
    loading: false
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
    
    // 开始直播
    async startLive(liveData) {
      try {
        this.loading = true
        this.error = null
        
        // 设置直播信息
        this.setLiveInfo({
          title: liveData.title,
          description: liveData.description,
          coverImage: liveData.coverImage,
          id: 'live_' + liveData.userId + Date.now()
        })
        
        // 设置主播信息
        this.anchor = {
          id: liveData.userId,
          name: liveData.userName || '主播',
          avatar: liveData.userAvatar || ''
        }
        
        // 更新直播状态为准备中
        this.updateLiveStatus('preparing')
        
        // 这里可以添加实际的直播初始化逻辑，如连接TRTC等
        
        // 更新直播状态为直播中
        this.updateLiveStatus('live')
        
        return {
          success: true,
          liveId: this.liveInfo.id
        }
      } catch (error) {
        this.error = error.message || '开始直播失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 结束直播
    async endLive() {
      try {
        this.loading = true
        this.error = null
        
        // 这里可以添加实际的结束直播逻辑，如断开TRTC连接等
        
        // 更新直播状态为已结束
        this.updateLiveStatus('ended')
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '结束直播失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 加入直播间（观众）
    async joinLiveRoom(liveId, userData) {
      try {
        this.loading = true
        this.error = null
        
        // 这里可以添加实际的加入直播间逻辑，如连接TRTC等
        
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
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 离开直播间（观众）
    async leaveLiveRoom(userId) {
      try {
        this.loading = true
        this.error = null
        
        // 这里可以添加实际的离开直播间逻辑，如断开TRTC连接等
        
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
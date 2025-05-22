// store/modules/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    // 用户基本信息
    userInfo: {
      userId: '',
      userName: '',
      userAvatar: '',
      userSig: '',
      sdkAppId: 0
    },
    // 用户权限
    permissions: {
      canLive: false,
      canComment: true,
      canSendGift: true
    },
    // 用户登录状态
    isLoggedIn: false,
    // 用户加载状态
    loading: false,
    // 用户错误信息
    error: null
  }),
  
  getters: {
    // 获取用户ID
    userId: (state) => state.userInfo.userId,
    
    // 获取用户名
    userName: (state) => state.userInfo.userName,
    
    // 获取用户头像
    userAvatar: (state) => state.userInfo.userAvatar,
    
    // 判断用户是否有直播权限
    hasLivePermission: (state) => state.permissions.canLive,
    
    // 获取完整用户信息
    fullUserInfo: (state) => state.userInfo
  },
  
  actions: {
    // 设置用户信息
    setUserInfo(info) {
      this.userInfo = { ...this.userInfo, ...info }
    },
    
    // 设置用户权限
    setPermissions(permissions) {
      this.permissions = { ...this.permissions, ...permissions }
    },
    
    // 生成随机用户ID
    generateUserId() {
      return 'user_' + Math.floor(Math.random() * 100000).toString()
    },
    
    // 登录
    async login(userData) {
      try {
        this.loading = true
        this.error = null
        
        // 如果没有提供用户ID，则生成一个随机ID
        const userId = userData.userId || this.generateUserId()
        
        // 设置用户信息
        this.setUserInfo({
          userId,
          userName: userData.userName || `用户${userId.substring(5)}`,
          userAvatar: userData.userAvatar || '',
          userSig: userData.userSig || '',
          sdkAppId: userData.sdkAppId || 0
        })
        
        // 设置用户权限
        this.setPermissions(userData.permissions || {})
        
        // 更新登录状态
        this.isLoggedIn = true
        
        return {
          success: true,
          userId: this.userInfo.userId
        }
      } catch (error) {
        this.error = error.message || '登录失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 登出
    async logout() {
      try {
        this.loading = true
        this.error = null
        
        // 重置用户信息
        this.userInfo = {
          userId: '',
          userName: '',
          userAvatar: '',
          userSig: '',
          sdkAppId: 0
        }
        
        // 重置用户权限
        this.permissions = {
          canLive: false,
          canComment: true,
          canSendGift: true
        }
        
        // 更新登录状态
        this.isLoggedIn = false
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '登出失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 更新用户信息
    async updateUserInfo(info) {
      try {
        this.loading = true
        this.error = null
        
        // 更新用户信息
        this.setUserInfo(info)
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '更新用户信息失败'
        return {
          success: false,
          error: this.error
        }
      } finally {
        this.loading = false
      }
    },
    
    // 更新用户权限
    async updatePermissions(permissions) {
      try {
        this.loading = true
        this.error = null
        
        // 更新用户权限
        this.setPermissions(permissions)
        
        return {
          success: true
        }
      } catch (error) {
        this.error = error.message || '更新用户权限失败'
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
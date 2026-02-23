/**
 * 全局应用状态管理
 * 使用Zustand实现，确保前后端数据一致性
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LogEntry, Notification, FriendRequest } from '../types';
import * as dbService from '../services/dbService';
import { syncService } from '../services/syncService';
import { errorHandler } from '../services/errorHandler';

// 状态接口
interface AppState {
  // 用户状态
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // 数据缓存
  entries: LogEntry[];
  notifications: Notification[];
  friendRequests: FriendRequest[];
  unreadCount: number;
  
  // UI状态
  isLoading: boolean;
  lastSyncTime: number;
  
  // 操作
  setCurrentUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
  
  // 数据操作
  setEntries: (entries: LogEntry[]) => void;
  addEntry: (entry: LogEntry) => void;
  updateEntry: (id: string, updates: Partial<LogEntry>) => void;
  deleteEntry: (id: string) => void;
  
  // 通知操作
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // 好友请求操作
  setFriendRequests: (requests: FriendRequest[]) => void;
  addFriendRequest: (request: FriendRequest) => void;
  updateFriendRequest: (id: string, status: string) => void;
  
  // 同步操作
  syncData: () => Promise<void>;
  setLastSyncTime: (time: number) => void;
  
  // 加载状态
  setLoading: (loading: boolean) => void;
}

// 创建store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentUser: null,
      isAuthenticated: false,
      entries: [],
      notifications: [],
      friendRequests: [],
      unreadCount: 0,
      isLoading: false,
      lastSyncTime: Date.now(),
      
      // 用户操作
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          currentUser: null,
          isAuthenticated: false,
          entries: [],
          notifications: [],
          friendRequests: [],
          unreadCount: 0
        });
      },
      
      // 数据操作
      setEntries: (entries) => set({ entries }),
      addEntry: (entry) => {
        set((state) => ({ entries: [entry, ...state.entries] }));
        // 同步到服务器
        syncService.sendChange('entry_created', entry);
      },
      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map(e => 
            e.id === id ? { ...e, ...updates } : e
          )
        }));
        // 同步到服务器
        syncService.sendChange('entry_updated', { id, updates });
      },
      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
        // 同步到服务器
        syncService.sendChange('entry_deleted', { id });
      },
      
      // 通知操作
      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(n => !n.read).length;
        set({ notifications, unreadCount });
      },
      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      },
      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      },
      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        }));
      },
      
      // 好友请求操作
      setFriendRequests: (requests) => set({ friendRequests: requests }),
      addFriendRequest: (request) => {
        set((state) => ({
          friendRequests: [request, ...state.friendRequests]
        }));
      },
      updateFriendRequest: (id, status) => {
        const typedStatus = status as 'pending' | 'accepted' | 'rejected';
        set((state) => ({
          friendRequests: state.friendRequests.map(r =>
            r.id === id ? { ...r, status: typedStatus } : r
          )
        }));
      },
      
      // 同步操作
      syncData: async () => {
        const state = get();
        if (!state.currentUser) return;
        
        set({ isLoading: true });
        try {
          // 并行获取所有数据
          const [entries, notifications, friendRequests] = await Promise.all([
            dbService.getAllEntries().catch(() => []),
            dbService.getNotifications(state.currentUser.id).catch(() => []),
            dbService.getFriendRequests(state.currentUser.id).catch(() => [])
          ]);
          
          // 更新状态
          set({
            entries,
            notifications,
            friendRequests,
            lastSyncTime: Date.now()
          });
          
          // 更新未读计数
          const unreadCount = notifications.filter(n => !n.read).length;
          set({ unreadCount });
          
          console.log('[AppStore] Data synced successfully');
        } catch (error) {
          console.error('[AppStore] Sync failed:', error);
          errorHandler.handle(error, 'syncData');
        } finally {
          set({ isLoading: false });
        }
      },
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      
      // 加载状态
      setLoading: (loading) => set({ isLoading: loading })
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分状态
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
);

// 选择器hooks
export const useCurrentUser = () => useAppStore(state => state.currentUser);
export const useIsAuthenticated = () => useAppStore(state => state.isAuthenticated);
export const useEntries = () => useAppStore(state => state.entries);
export const useNotifications = () => useAppStore(state => state.notifications);
export const useUnreadCount = () => useAppStore(state => state.unreadCount);
export const useIsLoading = () => useAppStore(state => state.isLoading);
export const useLastSyncTime = () => useAppStore(state => state.lastSyncTime);

// 初始化同步
export function initAppStore() {
  const store = useAppStore.getState();
  
  // 监听同步事件
  syncService.on('entry_created', (data) => {
    store.addEntry(data);
  });
  
  syncService.on('entry_updated', (data) => {
    store.updateEntry(data.id, data.updates);
  });
  
  syncService.on('entry_deleted', (data) => {
    store.deleteEntry(data.id);
  });
  
  syncService.on('notification', (data) => {
    store.addNotification(data);
  });
  
  syncService.on('friend_request', (data) => {
    store.addFriendRequest(data);
  });
  
  // 定期同步
  setInterval(() => {
    if (store.isAuthenticated) {
      store.syncData();
    }
  }, 30000); // 每30秒同步一次
}

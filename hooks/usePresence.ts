
import { useState, useEffect, useCallback, useRef } from 'react';
import { syncService } from '../services/syncService';

export type UserStatus = 'online' | 'away' | 'offline' | 'busy';

interface PresenceState {
  status: UserStatus;
  lastSeen: Date;
  customStatus?: string;
}

interface PresenceData {
  userId: string;
  status: UserStatus;
  lastSeen: string;
  customStatus?: string;
}

const PRESENCE_KEY = 'qieyu_user_presence';
const HEARTBEAT_INTERVAL = 30000; // 30秒心跳
const AWAY_TIMEOUT = 60000; // 1分钟无活动标记为离开
const OFFLINE_TIMEOUT = 300000; // 5分钟无活动标记为离线

export const usePresence = (userId: string | null) => {
  const [myPresence, setMyPresence] = useState<PresenceState>({
    status: 'offline',
    lastSeen: new Date(),
  });
  const [userPresences, setUserPresences] = useState<Map<string, PresenceState>>(new Map());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // 更新自己的在线状态
  const updateMyPresence = useCallback((status: UserStatus, customStatus?: string) => {
    if (!userId) return;

    const newPresence: PresenceState = {
      status,
      lastSeen: new Date(),
      customStatus,
    };

    setMyPresence(newPresence);

    // 广播状态更新
    syncService.broadcast('presence_update', {
      userId,
      status,
      lastSeen: new Date().toISOString(),
      customStatus,
    });

    // 保存到本地存储
    localStorage.setItem(PRESENCE_KEY, JSON.stringify({
      userId,
      ...newPresence,
      lastSeen: newPresence.lastSeen.toISOString(),
    }));
  }, [userId]);

  // 获取用户的在线状态
  const getUserPresence = useCallback((targetUserId: string): PresenceState => {
    return userPresences.get(targetUserId) || {
      status: 'offline',
      lastSeen: new Date(0),
    };
  }, [userPresences]);

  // 检查用户是否在线
  const isUserOnline = useCallback((targetUserId: string): boolean => {
    const presence = userPresences.get(targetUserId);
    if (!presence) return false;
    return presence.status === 'online' || presence.status === 'away';
  }, [userPresences]);

  // 获取格式化的最后在线时间
  const getLastSeenText = useCallback((targetUserId: string): string => {
    const presence = userPresences.get(targetUserId);
    if (!presence || presence.status === 'online') return '在线';

    const lastSeen = new Date(presence.lastSeen);
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return lastSeen.toLocaleDateString('zh-CN');
  }, [userPresences]);

  // 处理用户活动
  const handleActivity = useCallback(() => {
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      if (myPresence.status !== 'online') {
        updateMyPresence('online', myPresence.customStatus);
      }
    }

    // 清除之前的超时
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // 设置新的超时
    activityTimeoutRef.current = setTimeout(() => {
      isActiveRef.current = false;
      if (myPresence.status === 'online') {
        updateMyPresence('away', myPresence.customStatus);
      }
    }, AWAY_TIMEOUT);
  }, [myPresence.status, myPresence.customStatus, updateMyPresence]);

  // 心跳机制
  useEffect(() => {
    if (!userId) return;

    // 初始化在线状态
    updateMyPresence('online');

    // 开始心跳
    heartbeatIntervalRef.current = setInterval(() => {
      if (isActiveRef.current && myPresence.status === 'online') {
        syncService.broadcast('presence_heartbeat', {
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // 设置离线状态
      updateMyPresence('offline');
    };
  }, [userId, updateMyPresence, myPresence.status]);

  // 监听用户活动
  useEffect(() => {
    if (!userId) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleUserActivity = () => {
      handleActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // 页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      } else {
        updateMyPresence('away');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [userId, handleActivity, updateMyPresence]);

  // 监听其他用户的状态更新
  useEffect(() => {
    const handlePresenceUpdate = (data: PresenceData) => {
      if (data.userId === userId) return;

      setUserPresences(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          status: data.status,
          lastSeen: new Date(data.lastSeen),
          customStatus: data.customStatus,
        });
        return newMap;
      });
    };

    const handleHeartbeat = (data: { userId: string; timestamp: string }) => {
      if (data.userId === userId) return;

      setUserPresences(prev => {
        const existing = prev.get(data.userId);
        if (existing) {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            ...existing,
            status: 'online',
            lastSeen: new Date(data.timestamp),
          });
          return newMap;
        }
        return prev;
      });
    };

    syncService.on('presence_update', handlePresenceUpdate);
    syncService.on('presence_heartbeat', handleHeartbeat);

    return () => {
      syncService.off('presence_update', handlePresenceUpdate);
      syncService.off('presence_heartbeat', handleHeartbeat);
    };
  }, [userId]);

  // 定期清理离线用户
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date().getTime();
      setUserPresences(prev => {
        const newMap = new Map(prev);
        prev.forEach((presence, uid) => {
          const lastSeenTime = new Date(presence.lastSeen).getTime();
          if (now - lastSeenTime > OFFLINE_TIMEOUT && presence.status !== 'offline') {
            newMap.set(uid, { ...presence, status: 'offline' });
          }
        });
        return newMap;
      });
    }, 60000); // 每分钟清理一次

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    myPresence,
    userPresences,
    updateMyPresence,
    getUserPresence,
    isUserOnline,
    getLastSeenText,
  };
};

export default usePresence;

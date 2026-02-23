/**
 * 实时数据同步服务
 * 提供WebSocket连接和数据同步功能
 */

// 简单的浏览器兼容 EventEmitter 实现
class SimpleEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (eventListeners && eventListeners.size > 0) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

// 同步事件类型
export type SyncEventType = 
  | 'entry_created' 
  | 'entry_updated' 
  | 'entry_deleted'
  | 'user_updated'
  | 'friend_request'
  | 'notification'
  | 'announcement'
  | 'config_updated'
  | 'role_updated';

// 同步事件数据
interface SyncEvent {
  type: SyncEventType;
  data: any;
  timestamp: number;
  userId?: string;
}

// 同步状态
interface SyncState {
  isConnected: boolean;
  lastSyncTime: number;
  pendingChanges: any[];
}

class SyncService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private state: SyncState = {
    isConnected: false,
    lastSyncTime: Date.now(),
    pendingChanges: []
  };
  
  private readonly WS_URL = 'ws://localhost:8000/ws';
  private readonly RECONNECT_DELAY = 3000;
  private readonly PING_INTERVAL = 30000;

  // 连接到WebSocket服务器
  connect(userId: string, token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Sync] Already connected');
      return;
    }

    try {
      this.ws = new WebSocket(`${this.WS_URL}?userId=${userId}&token=${token}`);

      this.ws.onopen = () => {
        console.log('[Sync] WebSocket connected');
        this.state.isConnected = true;
        this.emit('connected');
        this.startPing();
        this.syncPendingChanges();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SyncEvent = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[Sync] Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[Sync] WebSocket closed');
        this.state.isConnected = false;
        this.emit('disconnected');
        this.stopPing();
        this.scheduleReconnect(userId, token);
      };

      this.ws.onerror = (error) => {
        console.error('[Sync] WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('[Sync] Failed to connect:', error);
      this.scheduleReconnect(userId, token);
    }
  }

  // 断开连接
  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
  }

  // 发送数据变更
  sendChange(type: SyncEventType | string, data: any): void {
    const event: SyncEvent = {
      type: type as SyncEventType,
      data,
      timestamp: Date.now()
    };

    if (this.state.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      // 离线时暂存变更
      this.state.pendingChanges.push(event);
      console.log('[Sync] Change queued for later sync');
    }
  }

  // 广播事件 (sendChange 的别名，用于兼容性)
  broadcast(type: string, data: any): void {
    this.sendChange(type as SyncEventType, data);
  }

  // 请求同步特定数据
  requestSync(entityType: string, lastSyncTime?: number): void {
    if (this.state.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'sync_request',
        entityType,
        lastSyncTime: lastSyncTime || this.state.lastSyncTime
      }));
    }
  }

  // 获取同步状态
  getState(): SyncState {
    return { ...this.state };
  }

  // 是否已连接
  isConnected(): boolean {
    return this.state.isConnected;
  }

  // 处理收到的消息
  private handleMessage(message: SyncEvent): void {
    console.log('[Sync] Received:', message.type);
    this.emit(message.type, message.data);
    this.emit('message', message);
  }

  // 启动心跳
  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.PING_INTERVAL);
  }

  // 停止心跳
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // 安排重连
  private scheduleReconnect(userId: string, token: string): void {
    if (this.reconnectTimer) return;
    
    console.log(`[Sync] Reconnecting in ${this.RECONNECT_DELAY}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(userId, token);
    }, this.RECONNECT_DELAY);
  }

  // 同步暂存的变更
  private syncPendingChanges(): void {
    if (this.state.pendingChanges.length === 0) return;
    
    console.log(`[Sync] Syncing ${this.state.pendingChanges.length} pending changes`);
    
    while (this.state.pendingChanges.length > 0) {
      const change = this.state.pendingChanges.shift();
      if (change && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(change));
      }
    }
  }
}

// 导出单例
export const syncService = new SyncService();

// React Hook for using sync service
import { useEffect, useState, useCallback } from 'react';

export function useSyncService(userId?: string, token?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  useEffect(() => {
    if (!userId || !token) return;

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleMessage = () => setLastSyncTime(Date.now());

    syncService.on('connected', handleConnected);
    syncService.on('disconnected', handleDisconnected);
    syncService.on('message', handleMessage);

    syncService.connect(userId, token);

    return () => {
      syncService.off('connected', handleConnected);
      syncService.off('disconnected', handleDisconnected);
      syncService.off('message', handleMessage);
      syncService.disconnect();
    };
  }, [userId, token]);

  const sendChange = useCallback((type: SyncEventType, data: any) => {
    syncService.sendChange(type, data);
  }, []);

  const requestSync = useCallback((entityType: string) => {
    syncService.requestSync(entityType, lastSyncTime);
  }, [lastSyncTime]);

  return {
    isConnected,
    lastSyncTime,
    sendChange,
    requestSync
  };
}

// Hook for listening to specific sync events
export function useSyncEvent(eventType: SyncEventType, callback: (data: any) => void) {
  useEffect(() => {
    syncService.on(eventType, callback);
    return () => {
      syncService.off(eventType, callback);
    };
  }, [eventType, callback]);
}

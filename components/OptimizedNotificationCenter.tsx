/**
 * 优化后的消息中心组件
 * 包含消息分类、搜索、已读/未读状态管理
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import * as dbService from '../services/dbService';
import { syncService } from '../services/syncService';
import { useAppStore } from '../store/appStore';
import { 
  Bell, Search, Check, CheckCheck, Trash2, Filter,
  MessageSquare, Heart, UserPlus, AlertCircle, Settings,
  ChevronDown, X, Archive, MoreHorizontal
} from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './Button';

interface OptimizedNotificationCenterProps {
  currentUser: User;
  onClose: () => void;
}

type NotificationType = 'all' | 'message' | 'like' | 'follow' | 'system';
type NotificationFilter = 'all' | 'unread' | 'read';
type NotificationPriority = 'high' | 'normal' | 'low';
type EnhancedNotificationType = 'message' | 'like' | 'follow' | 'system';

interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'system' | 'friend_accept';
  title: string;
  content: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface EnhancedNotification extends Omit<Notification, 'type'> {
  type: EnhancedNotificationType;
  priority: NotificationPriority;
}

export const OptimizedNotificationCenter: React.FC<OptimizedNotificationCenterProps> = ({ 
  currentUser, 
  onClose 
}) => {
  // 状态管理
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<NotificationType>('all');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  
  // 分页
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const NOTIFICATIONS_PER_PAGE = 20;

  // 全局状态
  const unreadCount = useAppStore(state => state.unreadCount);
  const addNotification = useAppStore(state => state.addNotification);
  const markNotificationAsRead = useAppStore(state => state.markNotificationAsRead);

  // ============ 数据加载 ============
  
  const loadNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);

    try {
      // 获取所有通知，然后在客户端进行筛选和分页
      const allData = await dbService.getNotifications(currentUser.id);

      // 根据类型筛选
      let filteredData = allData;
      if (activeType !== 'all') {
        filteredData = allData.filter((n: Notification) => {
          const enhancedType = detectNotificationType(n);
          return enhancedType === activeType;
        });
      }

      // 根据已读/未读筛选
      if (activeFilter === 'unread') {
        filteredData = filteredData.filter((n: Notification) => !n.read);
      } else if (activeFilter === 'read') {
        filteredData = filteredData.filter((n: Notification) => n.read);
      }

      // 客户端分页
      const offset = (pageNum - 1) * NOTIFICATIONS_PER_PAGE;
      const paginatedData = filteredData.slice(offset, offset + NOTIFICATIONS_PER_PAGE);

      if (paginatedData.length < NOTIFICATIONS_PER_PAGE) {
        setHasMore(false);
      }

      // 添加类型和优先级
      const enhancedData: EnhancedNotification[] = paginatedData.map((n: any) => ({
        ...n,
        type: detectNotificationType(n),
        priority: detectPriority(n)
      }));

      if (append) {
        setNotifications(prev => [...prev, ...enhancedData]);
      } else {
        setNotifications(enhancedData);
      }
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, activeType, activeFilter]);

  // 检测通知类型
  const detectNotificationType = (notification: any): EnhancedNotificationType => {
    const content = notification.content || '';
    if (content.includes('消息') || content.includes('回复')) return 'message';
    if (content.includes('点赞') || content.includes('喜欢')) return 'like';
    if (content.includes('关注') || content.includes('好友')) return 'follow';
    return 'system';
  };

  // 检测优先级
  const detectPriority = (notification: any): NotificationPriority => {
    if (notification.priority === 'high') return 'high';
    if (notification.type === 'system') return 'high';
    if (!notification.read) return 'normal';
    return 'low';
  };

  // 初始加载
  useEffect(() => {
    loadNotifications(1);
    setPage(1);
    setHasMore(true);
  }, [loadNotifications]);

  // ============ 实时同步 ============
  
  useEffect(() => {
    const handleNewNotification = (data: any) => {
      const enhanced: EnhancedNotification = {
        ...data,
        type: detectNotificationType(data),
        priority: detectPriority(data)
      };
      
      // 使用store的方法添加通知（会自动更新unreadCount）
      addNotification(data);

      // 显示浏览器通知
      if (Notification.permission === 'granted') {
        new Notification('新消息', {
          body: data.content,
          icon: '/logo.png'
        });
      }
    };

    syncService.on('notification', handleNewNotification);

    // 请求通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => syncService.off('notification', handleNewNotification);
  }, [addNotification]);

  // ============ 消息操作 ============
  
  // 标记为已读
  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      // 使用store的方法标记已读（会自动更新unreadCount）
      for (const id of ids) {
        await markNotificationAsRead(id);
      }

      // 更新本地通知列表状态
      setNotifications(prev =>
        prev.map(n =>
          ids.includes(n.id) ? { ...n, read: true } : n
        )
      );

      // 同步到其他设备
      syncService.sendChange('notification_read', { ids });
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }, [markNotificationAsRead]);

  // 标记所有为已读
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await markAsRead(unreadIds);
  }, [notifications, markAsRead]);

  // 删除通知（当前仅前端删除，如需后端支持需要添加API）
  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要删除选中的 ${ids.length} 条通知吗？`)) return;

    try {
      // 逐个删除通知
      for (const id of ids) {
        await dbService.deleteNotification(id);
      }

      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  }, []);

  // 归档通知（当前仅前端实现）
  const archiveNotifications = useCallback(async (ids: string[]) => {
    try {
      // 归档功能当前仅在前端实现，从列表中移除
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('归档通知失败:', error);
    }
  }, []);

  // ============ 选择操作 ============
  
  const toggleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedNotifications);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNotifications(newSet);
  };

  // ============ 过滤和搜索 ============
  
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    
    // 类型过滤
    if (activeType !== 'all') {
      result = result.filter(n => n.type === activeType);
    }
    
    // 已读/未读过滤
    if (activeFilter === 'unread') {
      result = result.filter(n => !n.read);
    } else if (activeFilter === 'read') {
      result = result.filter(n => n.read);
    }
    
    // 搜索
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n => 
        n.content?.toLowerCase().includes(term) ||
        n.title?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [notifications, activeType, activeFilter, searchTerm]);

  // 统计
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    message: notifications.filter(n => n.type === 'message').length,
    like: notifications.filter(n => n.type === 'like').length,
    follow: notifications.filter(n => n.type === 'follow').length,
    system: notifications.filter(n => n.type === 'system').length
  }), [notifications]);

  // ============ 渲染辅助函数 ============
  
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'like': return Heart;
      case 'follow': return UserPlus;
      case 'system': return AlertCircle;
      default: return Bell;
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'message': return 'text-blue-400 bg-blue-500/20';
      case 'like': return 'text-red-400 bg-red-500/20';
      case 'follow': return 'text-green-400 bg-green-500/20';
      case 'system': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  // ============ 渲染 ============
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={24} className="text-primary-500" />
              {stats.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {stats.unread > 9 ? '9+' : stats.unread}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">消息中心</h2>
              <p className="text-xs text-slate-400">
                {stats.unread} 条未读 / {stats.total} 条总计
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {stats.unread > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="secondary"
                className="text-sm"
              >
                <CheckCheck size={16} className="mr-1" />
                全部已读
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索消息..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-primary-500 outline-none"
            />
          </div>
          
          {/* Type Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {([
              { id: 'all', label: '全部', count: stats.total, icon: Bell },
              { id: 'message', label: '消息', count: stats.message, icon: MessageSquare },
              { id: 'like', label: '点赞', count: stats.like, icon: Heart },
              { id: 'follow', label: '关注', count: stats.follow, icon: UserPlus },
              { id: 'system', label: '系统', count: stats.system, icon: AlertCircle }
            ] as const).map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveType(id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeType === id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Icon size={14} />
                {label}
                {count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    activeType === id ? 'bg-white/20' : 'bg-slate-600'
                  }`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Filter & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as NotificationFilter)}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
              >
                <option value="all">全部消息</option>
                <option value="unread">仅未读</option>
                <option value="read">仅已读</option>
              </select>
            </div>
            
            {selectedNotifications.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">
                  已选择 {selectedNotifications.size} 条
                </span>
                <Button
                  onClick={() => markAsRead(Array.from(selectedNotifications))}
                  variant="secondary"
                  className="text-sm"
                >
                  <Check size={14} className="mr-1" />
                  标记已读
                </Button>
                <Button
                  onClick={() => archiveNotifications(Array.from(selectedNotifications))}
                  variant="secondary"
                  className="text-sm"
                >
                  <Archive size={14} className="mr-1" />
                  归档
                </Button>
                <Button
                  onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                  className="text-sm bg-red-500 hover:bg-red-600"
                >
                  <Trash2 size={14} className="mr-1" />
                  删除
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
              <Bell size={48} className="mb-2 opacity-50" />
              <p>暂无消息</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredNotifications.map((notification) => {
                const TypeIcon = getTypeIcon(notification.type);
                const isSelected = selectedNotifications.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-700/50 transition-colors ${
                      !notification.read ? 'bg-slate-700/30' : ''
                    } ${isSelected ? 'bg-primary-500/10' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(notification.id)}
                        className="mt-1 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                      />
                      
                      <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                        <TypeIcon size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`font-medium ${
                              !notification.read ? 'text-white' : 'text-slate-300'
                            }`}>
                              {notification.title || '新消息'}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                              {notification.content}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(notification.created_at).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead([notification.id])}
                              className="text-xs text-primary-400 hover:text-primary-300"
                            >
                              标记已读
                            </button>
                          )}
                          <button
                            onClick={() => archiveNotifications([notification.id])}
                            className="text-xs text-slate-500 hover:text-slate-300"
                          >
                            归档
                          </button>
                          <button
                            onClick={() => deleteNotifications([notification.id])}
                            className="text-xs text-slate-500 hover:text-red-400"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Load More */}
          {hasMore && !isLoading && (
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                loadNotifications(nextPage, true);
              }}
              className="w-full py-3 text-sm text-slate-400 hover:text-white"
            >
              加载更多
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-slate-600 text-primary-500 focus:ring-primary-500"
            />
            <span>全选</span>
          </div>
          
          <button
            onClick={() => {/* Open settings */}}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
          >
            <Settings size={16} />
            消息设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptimizedNotificationCenter;

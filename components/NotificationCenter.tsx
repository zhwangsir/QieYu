
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, X, UserPlus, MessageSquare, Megaphone, Trash2, Check, 
  Settings, ChevronRight, Clock, CheckCheck, Filter, MoreHorizontal 
} from 'lucide-react';
import { Notification, FriendRequest, Announcement, User } from '../types';
import * as dbService from '../services/dbService';
import { Avatar } from './Avatar';
import { Button } from './Button';

interface NotificationCenterProps {
  currentUser: User;
  onClose: () => void;
}

type MessageType = 'all' | 'friend' | 'message' | 'announcement';

interface MessageItem {
  id: string;
  type: 'friend_request' | 'friend_accept' | 'message' | 'announcement' | 'system';
  title: string;
  content: string;
  sender?: User;
  createdAt: string;
  read: boolean;
  data?: any;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<MessageType>('all');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  // 消息设置
  const [settings, setSettings] = useState({
    friendRequest: { push: true, sound: true },
    message: { push: true, sound: true },
    announcement: { push: true, sound: false },
    system: { push: true, sound: false }
  });

  // 加载数据
  useEffect(() => {
    loadData();
    // 定时刷新
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 加载好友请求
      const requests = await dbService.getFriendRequests(currentUser.id);
      setFriendRequests(requests.filter(r => r.status === 'pending'));

      // 加载公告
      const anns = await dbService.getAnnouncements();
      setAnnouncements(anns.filter(a => a.active));

      // 加载通知
      const notifications = await dbService.getNotifications(currentUser.id);
      
      // 转换为统一的消息格式
      const messageItems: MessageItem[] = [
        // 好友请求
        ...requests.filter(r => r.status === 'pending').map(req => ({
          id: `fr-${req.id}`,
          type: 'friend_request' as const,
          title: '好友请求',
          content: '请求添加你为好友',
          sender: { id: req.fromUserId, username: req.fromUserName, avatar: req.fromUserAvatar } as User,
          createdAt: req.createdAt,
          read: false,
          data: req
        })),
        // 系统通知
        ...notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          content: n.content,
          createdAt: n.createdAt,
          read: n.read,
          data: n.data
        })),
        // 公告
        ...anns.filter(a => a.active).map(a => ({
          id: `ann-${a.id}`,
          type: 'announcement' as const,
          title: a.title,
          content: a.content.substring(0, 100) + (a.content.length > 100 ? '...' : ''),
          createdAt: a.createdAt,
          read: false,
          data: a
        }))
      ];

      // 按时间倒序排列
      messageItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(messageItems);
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 统计未读数量
  const unreadCounts = useMemo(() => ({
    all: messages.filter(m => !m.read).length,
    friend: messages.filter(m => !m.read && m.type === 'friend_request').length,
    message: messages.filter(m => !m.read && m.type === 'message').length,
    announcement: messages.filter(m => !m.read && m.type === 'announcement').length
  }), [messages]);

  // 过滤消息
  const filteredMessages = useMemo(() => {
    if (activeTab === 'all') return messages;
    return messages.filter(m => {
      if (activeTab === 'friend') return m.type === 'friend_request' || m.type === 'friend_accept';
      if (activeTab === 'message') return m.type === 'message';
      if (activeTab === 'announcement') return m.type === 'announcement';
      return true;
    });
  }, [messages, activeTab]);

  // 处理好友请求
  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      await dbService.respondToFriendRequest(requestId, accept);
      await loadData();
    } catch (error) {
      console.error('处理好友请求失败:', error);
    }
  };

  // 标记已读
  const markAsRead = async (messageId: string) => {
    try {
      await dbService.markNotificationAsRead(messageId);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      ));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 标记全部已读
  const markAllAsRead = async () => {
    try {
      await dbService.markAllNotificationsAsRead(currentUser.id);
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  // 删除消息
  const deleteMessage = async (messageId: string) => {
    try {
      await dbService.deleteNotification(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  };

  // 批量删除
  const batchDelete = async () => {
    try {
      await Promise.all(Array.from(selectedItems).map((id: string) => dbService.deleteNotification(id)));
      setMessages(prev => prev.filter(m => !selectedItems.has(m.id)));
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取消息图标
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus size={18} className="text-blue-500" />;
      case 'friend_accept': return <Check size={18} className="text-green-500" />;
      case 'message': return <MessageSquare size={18} className="text-purple-500" />;
      case 'announcement': return <Megaphone size={18} className="text-orange-500" />;
      default: return <Bell size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <Bell size={20} className="text-primary-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white text-lg">消息中心</h2>
              <p className="text-xs text-slate-500">
                {unreadCounts.all > 0 ? `${unreadCounts.all} 条未读` : '没有新消息'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCounts.all > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-xs font-medium text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCheck size={14} />
                全部已读
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3 text-sm">消息提醒设置</h3>
            <div className="space-y-3">
              {Object.entries(settings).map(([key, value]) => {
                const settingValue = value as { push: boolean; sound: boolean };
                return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {key === 'friendRequest' ? '好友请求' : 
                     key === 'message' ? '消息' : 
                     key === 'announcement' ? '公告' : '系统'}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={settingValue.push}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [key]: { ...settingValue, push: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                      />
                      推送
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={settingValue.sound}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [key]: { ...settingValue, sound: e.target.checked }
                        }))}
                        className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                      />
                      声音
                    </label>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { key: 'all', label: '全部', count: unreadCounts.all },
            { key: 'friend', label: '好友', count: unreadCounts.friend },
            { key: 'message', label: '消息', count: unreadCounts.message },
            { key: 'announcement', label: '公告', count: unreadCounts.announcement }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as MessageType)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-red-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Batch Actions */}
        {isBatchMode && (
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              已选择 {selectedItems.size} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedItems(new Set(filteredMessages.map(m => m.id)));
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                全选
              </button>
              <button
                onClick={batchDelete}
                disabled={selectedItems.size === 0}
                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={14} />
                删除
              </button>
              <button
                onClick={() => {
                  setIsBatchMode(false);
                  setSelectedItems(new Set());
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Bell size={48} className="mb-4 opacity-30" />
              <p className="text-sm">暂无消息</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMessages.map(message => (
                <div
                  key={message.id}
                  onClick={() => !isBatchMode && !message.read && markAsRead(message.id)}
                  className={`group p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    !message.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for batch mode */}
                    {isBatchMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.has(message.id)}
                        onChange={() => toggleSelect(message.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                      />
                    )}

                    {/* Icon or Avatar */}
                    <div className="flex-shrink-0">
                      {message.sender ? (
                        <Avatar
                          src={message.sender.avatar}
                          alt={message.sender.username}
                          size="md"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          message.type === 'announcement' 
                            ? 'bg-orange-100 dark:bg-orange-900/30' 
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {getMessageIcon(message.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 dark:text-white text-sm">
                              {message.sender ? message.sender.username : message.title}
                            </span>
                            {!message.read && (
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                            {message.type === 'announcement' && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                                置顶
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-400">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isBatchMode && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Friend Request Actions */}
                            {message.type === 'friend_request' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFriendRequest(message.data.id, true);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                  同意
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFriendRequest(message.data.id, false);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                  拒绝
                                </button>
                              </div>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(message.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white flex items-center gap-1"
          >
            <MoreHorizontal size={14} />
            {isBatchMode ? '退出批量' : '批量管理'}
          </button>
          <button
            onClick={loadData}
            className="text-xs text-slate-500 hover:text-primary-500 flex items-center gap-1"
          >
            <Clock size={14} />
            刷新
          </button>
        </div>
      </div>
    </div>
  );
};

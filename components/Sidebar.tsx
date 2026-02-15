
import React, { useState, useEffect } from 'react';
import { User, ViewState, Notification } from '../types';
import { Library, MessageSquare, LogOut, CirclePlus, Settings, UserCircle, ShieldCheck, Bot, Bell } from 'lucide-react';
import { Avatar } from './Avatar';
import * as dbService from '../services/dbService';

interface SidebarProps {
  currentUser: User;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  unreadChatCount?: number;
  onEnterChat?: (friendId?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, onChangeView, onLogout, unreadChatCount = 0, onEnterChat }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifs = async () => {
        const notifs = await dbService.getNotifications(currentUser.id);
        setNotifications(notifs);
        
        // 获取未读消息通知
        if (unreadChatCount > 0) {
          const unreadMessages = await dbService.getUnreadMessages(currentUser.id);
          setMessageNotifications(unreadMessages);
        } else {
          setMessageNotifications([]);
        }
        
        // 总未读数 = 通知 + 消息
        const totalUnread = notifs.filter(n => !n.read).length + unreadChatCount;
        setUnreadCount(totalUnread);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 3000);
    return () => clearInterval(interval);
  }, [currentUser.id, unreadChatCount]);

  const handleNotificationClick = async (notif: Notification) => {
      await dbService.markNotificationRead(notif.id);
      if (notif.type === 'friend_request') {
          if(confirm(`接受来自 ${notif.title} 的请求?`)) {
             await dbService.acceptFriendRequest(notif.data.requestId);
             alert("已添加好友！");
          } else {
             await dbService.rejectFriendRequest(notif.data.requestId);
          }
      }
      refreshNotifications();
  };

  const handleMessageNotificationClick = async (senderId: string) => {
    // 标记该发送者的所有消息为已读
    await dbService.markMessagesAsRead(senderId);
    // 进入聊天室并跳转到对应好友
    onChangeView('CHAT');
    if (onEnterChat) {
      onEnterChat(senderId);
    }
  };

  const refreshNotifications = async () => {
    const notifs = await dbService.getNotifications(currentUser.id);
    setNotifications(notifs);
    const unreadMessages = await dbService.getUnreadMessages(currentUser.id);
    setMessageNotifications(unreadMessages);
    const totalUnread = notifs.filter(n => !n.read).length + unreadChatCount;
    setUnreadCount(totalUnread);
  };

  const navItemClass = (active: boolean) => `
    flex flex-col md:flex-row items-center justify-center md:justify-start md:px-4 gap-1 md:gap-3 
    w-full py-3 md:py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
    ${active 
      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 font-medium scale-[1.02]' 
      : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}
  `;

  return (
    <div className="w-20 md:w-64 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-2xl border-r border-black/5 dark:border-white/5 flex flex-col h-full shrink-0 z-30 shadow-2xl md:shadow-none transition-all">
      
      {/* User Profile - Clickable */}
      <div className="p-6 flex flex-col items-center md:items-start gap-4 mb-2">
         <div onClick={() => onChangeView('PROFILE')} className="cursor-pointer group relative">
            <Avatar 
              avatar={currentUser.avatar} 
              name={currentUser.username} 
              size="lg" 
              className="ring-4 ring-white dark:ring-[#161b22] shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#161b22] rounded-full"></div>
         </div>
         <div className="hidden md:block text-center md:text-left">
            <div className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{currentUser.username}</div>
         </div>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 space-y-1.5 flex flex-col items-center md:items-stretch overflow-y-auto custom-scrollbar">
        <button 
          onClick={() => onChangeView('LIBRARY')} 
          className={navItemClass(currentView === 'LIBRARY' || currentView === 'DETAILS' || currentView === 'CREATE' || currentView === 'EDIT')}
          title="日志库"
        >
          <Library size={20} />
          <span className="text-xs md:text-[13px] font-medium md:block hidden">日志库</span>
        </button>

        <button 
          onClick={() => onChangeView('AI_CHAT')} 
          className={navItemClass(currentView === 'AI_CHAT')}
          title="AI 助手"
        >
          <Bot size={20} />
          <span className="text-xs md:text-[13px] font-medium md:block hidden">AI 助手</span>
        </button>

        <button
          onClick={() => onChangeView('CHAT')}
          className={navItemClass(currentView === 'CHAT')}
          title="聊天室"
        >
          <MessageSquare size={20} />
          <span className="text-xs md:text-[13px] font-medium md:block hidden">聊天室</span>
        </button>
        
        {/* Notifications Toggle */}
        <button 
          onClick={() => setShowNotifPanel(!showNotifPanel)} 
          className={`relative ${navItemClass(showNotifPanel)}`}
          title="通知"
        >
          <div className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs md:text-[13px] font-medium md:block hidden">通知中心</span>
        </button>

        {showNotifPanel && (
            <div className="mx-2 p-2 bg-slate-50 dark:bg-black/20 rounded-xl mb-2 animate-fade-in border border-black/5 dark:border-white/5 max-h-64 overflow-y-auto">
                {/* 消息通知 */}
                {messageNotifications.length > 0 && (
                  <>
                    <div className="text-[10px] uppercase font-bold text-blue-500 mb-2 px-1 flex items-center gap-1">
                      <MessageSquare size={10} />
                      新消息 ({messageNotifications.length})
                    </div>
                    {messageNotifications.map((msg, idx) => (
                      <div 
                        key={`msg-${idx}`} 
                        onClick={() => handleMessageNotificationClick(msg.sender_id)}
                        className="p-2 rounded-lg mb-1 cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      >
                        <div className="flex justify-between items-start">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{msg.sender_name}</div>
                            <div className="text-[10px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{msg.content}</div>
                        <div className="text-[9px] text-blue-500 mt-1">点击回复</div>
                      </div>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                  </>
                )}

                {/* 系统通知 */}
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 px-1">系统通知</div>
                {notifications.length === 0 && messageNotifications.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-2">暂无通知</div>
                )}
                {notifications.slice(0, 5).map(n => (
                    <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-2 rounded-lg mb-1 cursor-pointer transition-colors ${n.read ? 'opacity-50' : 'bg-white dark:bg-white/5 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{n.title}</div>
                            {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.content}</div>
                    </div>
                ))}
            </div>
        )}

        <button 
          onClick={() => onChangeView('PROFILE')} 
          className={navItemClass(currentView === 'PROFILE')}
          title="个人主页"
        >
          <UserCircle size={20} />
          <span className="text-xs md:text-[13px] font-medium md:block hidden">个人主页</span>
        </button>

        <button 
          onClick={() => onChangeView('SETTINGS')} 
          className={navItemClass(currentView === 'SETTINGS')}
          title="设置"
        >
          <Settings size={20} />
          <span className="text-xs md:text-[13px] font-medium md:block hidden">设置</span>
        </button>

        {/* Admin Link */}
        {currentUser.role === 'admin' && (
          <>
            <div className="my-2 h-px bg-black/5 dark:bg-white/5 w-full mx-auto hidden md:block" />
            <button 
              onClick={() => onChangeView('ADMIN')} 
              className={navItemClass(currentView === 'ADMIN')}
              title="系统管理"
            >
              <ShieldCheck size={20} className="text-red-500" />
              <span className="text-xs md:text-[13px] font-medium md:block hidden text-red-500">系统管理</span>
            </button>
          </>
        )}
      </div>

      <div className="p-4">
        <button 
          onClick={() => onChangeView('CREATE')} 
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-95 transition-all duration-300 font-bold"
          title="新建日志"
        >
          <CirclePlus size={20} />
          <span className="hidden md:block">新建日志</span>
        </button>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-black/5 dark:border-white/5">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center md:justify-start gap-3 p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          title="退出登录"
        >
          <LogOut size={18} />
          <span className="text-xs font-medium hidden md:block">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

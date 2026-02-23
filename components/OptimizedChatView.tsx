/**
 * 优化后的聊天室组件
 * 包含实时同步、性能优化、消息状态管理
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, User, LogEntry } from '../types';
import * as dbService from '../services/dbService';
import { syncService } from '../services/syncService';
import { 
  Send, Image as ImageIcon, Share2, Video, Mic, X, Square, 
  Users, Hash, MessageCircle, ChevronDown, ChevronRight, 
  Check, CheckCheck, Clock, Wifi, WifiOff, FileText
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Avatar } from './Avatar';
import { PresenceIndicator, PresenceDot } from './PresenceIndicator';
import { usePresence, UserStatus } from '../hooks/usePresence';

interface OptimizedChatViewProps {
  currentUser: User;
  onViewEntry: (entryId: string) => void;
  onViewUser: (userId: string) => void;
  initialContactId?: string | null;
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface EnhancedChatMessage extends ChatMessage {
  status?: MessageStatus;
  readBy?: string[];
  isOptimistic?: boolean;
}

type UserPresenceStatus = 'online' | 'away' | 'offline' | 'busy';

interface UserPresence {
  userId: string;
  status: UserPresenceStatus;
  lastSeen: string;
}

export const OptimizedChatView: React.FC<OptimizedChatViewProps> = ({ 
  currentUser, 
  onViewEntry, 
  onViewUser, 
  initialContactId = null 
}) => {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeContactId, setActiveContactId] = useState<string | null>(initialContactId);
  const [friends, setFriends] = useState<User[]>([]);
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isRoomExpanded, setIsRoomExpanded] = useState(true);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  const { isUserOnline, getUserPresence, getLastSeenText } = usePresence(currentUser.id);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const friendList = await dbService.getFriendsList(currentUser.id);
      setFriends(friendList);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    }
  }, [currentUser.id]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const msgs = await dbService.getMessages(
        currentUser.id, 
        activeContactId || undefined
      );
      
      const enhancedMsgs: EnhancedChatMessage[] = msgs.map(msg => ({
        ...msg,
        status: 'read' as MessageStatus,
        readBy: []
      }));
      
      enhancedMsgs.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(enhancedMsgs);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, activeContactId, scrollToBottom]);

  const loadEntries = useCallback(async () => {
    try {
      const allEntries = await dbService.getAllEntries();
      const userEntries = allEntries.filter(e => e.userId === currentUser.id);
      setEntries(userEntries.slice(0, 10));
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadFriends();
    loadMessages();
    loadEntries();
  }, [loadFriends, loadMessages, loadEntries]);

  const pollNewMessages = useCallback(async () => {
    try {
      const latestMsgs = await dbService.getMessages(
        currentUser.id,
        activeContactId || undefined
      );
      
      const newMsgs = latestMsgs.filter((msg: ChatMessage) => 
        !messages.some(m => m.id === msg.id)
      );
      
      if (newMsgs.length > 0) {
        const enhancedNewMsgs: EnhancedChatMessage[] = newMsgs.map((msg: ChatMessage) => ({
          ...msg,
          status: 'delivered' as MessageStatus,
          readBy: []
        }));
        
        setMessages(prev => {
          const all = [...prev, ...enhancedNewMsgs];
          return all.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        scrollToBottom();
        
        const senderIds = [...new Set(
          newMsgs
            .filter((msg: ChatMessage) => msg.userId !== currentUser.id)
            .map((msg: ChatMessage) => msg.userId)
        )];
        
        for (const senderId of senderIds) {
          await dbService.markMessagesAsRead(senderId);
        }
      }
    } catch (error) {
      console.error('轮询消息失败:', error);
    }
  }, [activeContactId, currentUser.id, messages, scrollToBottom]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      const isRelevant = !data.recipientId ||
        data.recipientId === activeContactId ||
        data.userId === activeContactId ||
        (!activeContactId && !data.recipientId);
      
      if (isRelevant) {
        const newMsg: EnhancedChatMessage = {
          ...data,
          status: 'delivered' as MessageStatus,
          readBy: []
        };
        
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const all = [...prev, newMsg];
          return all.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        
        scrollToBottom();

        if (data.userId !== currentUser.id) {
          dbService.markMessagesAsRead(data.userId);
        }
      }
    };

    syncService.on('chat_message', handleNewMessage);
    
    const pollInterval = setInterval(() => {
      pollNewMessages();
    }, 3000);
    
    return () => {
      syncService.off('chat_message', handleNewMessage);
      clearInterval(pollInterval);
    };
  }, [activeContactId, currentUser.id, pollNewMessages, scrollToBottom]);

  const sendMessage = async (content: string, type: ChatMessage['type'], relatedEntryId?: string) => {
    if (isSending) return;
    setIsSending(true);
    
    const optimisticId = uuidv4();
    const optimisticMsg: EnhancedChatMessage = {
      id: optimisticId,
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      content,
      recipientId: activeContactId || undefined,
      type,
      relatedEntryId,
      createdAt: new Date().toISOString(),
      status: 'sending',
      isOptimistic: true
    };
    
    setMessages(prev => {
      const all = [...prev, optimisticMsg];
      return all.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    scrollToBottom();
    
    try {
      const msgData: Partial<ChatMessage> = {
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        recipientId: activeContactId || undefined,
        content,
        type,
        relatedEntryId,
        createdAt: new Date().toISOString()
      };
      await dbService.sendMessage(msgData);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticId
            ? { ...msg, status: 'sent', isOptimistic: false }
            : msg
        )
      );

      syncService.sendChange('chat_message', { ...msgData, id: optimisticId });
      
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText, 'text');
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendMessage(base64, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage(reader.result as string, 'audio');
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      console.error("无法访问麦克风", err);
      alert("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleShareEntry = (entry: LogEntry) => {
    const shareContent = JSON.stringify({
      title: entry.title,
      img: entry.imageUrl || '',
      id: entry.id
    });
    sendMessage(shareContent, 'entry_share', entry.id);
    setShowShareModal(false);
  };

  const retryMessage = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || msg.status !== 'failed') return;

    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, status: 'sending' } : m
      )
    );

    try {
      const msgData: Partial<ChatMessage> = {
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        recipientId: msg.recipientId,
        content: msg.content,
        type: msg.type,
        relatedEntryId: msg.relatedEntryId,
        createdAt: new Date().toISOString()
      };
      await dbService.sendMessage(msgData);

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, status: 'sent' }
            : m
        )
      );
    } catch (error) {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, status: 'failed' } : m
        )
      );
    }
  };

  useEffect(() => {
    const updatePresence = () => {
      const presence: UserPresence = {
        userId: currentUser.id,
        status: 'online',
        lastSeen: new Date().toISOString()
      };
      syncService.sendChange('user_presence', presence);
    };
    
    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser.id]);

  useEffect(() => {
    const handlePresence = (data: UserPresence) => {
      setUserPresence(prev => new Map(prev).set(data.userId, data));
    };
    
    syncService.on('user_presence', handlePresence);
    return () => syncService.off('user_presence', handlePresence);
  }, []);

  const getUserStatus = (userId: string): UserPresence | undefined => {
    return userPresence.get(userId);
  };

  const renderMessageStatus = (status?: MessageStatus, messageId?: string) => {
    switch (status) {
      case 'sending':
        return <Clock size={12} className="text-white/60 animate-spin" />;
      case 'sent':
        return <Check size={12} className="text-white/60" />;
      case 'delivered':
        return <CheckCheck size={12} className="text-white/60" />;
      case 'read':
        return <CheckCheck size={12} className="text-blue-300" />;
      case 'failed':
        return (
          <span 
            className="text-red-300 text-xs cursor-pointer hover:text-red-200" 
            onClick={() => messageId && retryMessage(messageId)}
          >
            重试
          </span>
        );
      default:
        return null;
    }
  };

  const renderMessageContent = (msg: EnhancedChatMessage) => {
    switch (msg.type) {
      case 'text':
        return <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>;
      case 'image':
        return (
          <img 
            src={msg.content} 
            alt="图片" 
            className="max-w-full max-h-[250px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(msg.content, '_blank')}
          />
        );
      case 'video':
        return (
          <video 
            src={msg.content} 
            controls 
            className="max-w-full max-h-[250px] rounded-lg bg-black"
          />
        );
      case 'audio':
        return (
          <audio 
            src={msg.content} 
            controls 
            className="h-8 w-full max-w-[240px]"
          />
        );
      case 'entry_share':
        return (
          <div 
            onClick={() => msg.relatedEntryId && onViewEntry(msg.relatedEntryId)} 
            className="w-64 cursor-pointer bg-white/10 hover:bg-white/20 transition-colors rounded-lg overflow-hidden"
          >
            {(() => {
              try {
                const data = JSON.parse(msg.content);
                return (
                  <>
                    <div className="h-32 bg-slate-700 relative">
                      {data.img && (
                        <img src={data.img} className="w-full h-full object-cover" alt="" />
                      )}
                      <div className="absolute bottom-0 left-0 bg-primary-600/90 backdrop-blur-sm text-[10px] px-2 py-0.5 text-white font-bold flex items-center gap-1">
                        <FileText size={10} />
                        日志分享
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-bold text-white truncate">{data.title}</div>
                      <div className="text-[10px] text-slate-300 mt-1">点击查看详情</div>
                    </div>
                  </>
                );
              } catch { 
                return <div className="p-3 text-sm text-slate-300">分享的日志</div>;
              }
            })()}
          </div>
        );
      default:
        return <p className="text-[15px]">{msg.content}</p>;
    }
  };

  const activeFriend = activeContactId ? friends.find(f => f.id === activeContactId) : null;
  const chatTitle = activeFriend ? activeFriend.username : '公共大厅';

  const bgStyle = currentUser.chatBackground ? {
    backgroundImage: `url(${currentUser.chatBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  return (
    <div className="flex h-full bg-[#f5f5f7] dark:bg-[#0d1117] relative overflow-hidden transition-colors">
      <div className={`
        w-full md:w-72 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 
        flex flex-col shrink-0 transition-all absolute md:relative z-20 h-full shadow-2xl md:shadow-none
        ${isMobileListOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5">
          <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
            <MessageCircle size={20} className="text-primary-500"/> 消息
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi size={12} className="text-green-500" />
                  <span className="text-green-500 hidden sm:inline">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-red-500" />
                  <span className="text-red-500 hidden sm:inline">已断开</span>
                </>
              )}
            </div>
            <button 
              className="md:hidden text-slate-400 hover:text-slate-600" 
              onClick={() => setIsMobileListOpen(false)}
            >
              <X size={20}/>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <div>
            <button 
              onClick={() => setIsRoomExpanded(!isRoomExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-1"
            >
              <span>聊天室</span>
              {isRoomExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {isRoomExpanded && (
              <div className="space-y-1">
                <button 
                  onClick={() => { setActiveContactId(null); setIsMobileListOpen(false); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    activeContactId === null 
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeContactId === null ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Hash size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">公共大厅</div>
                    <div className="text-[10px] opacity-70">所有人可见</div>
                  </div>
                </button>

                <div className="px-2 py-1 mt-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                  我的好友 ({friends.length})
                </div>

                {friends.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 dark:bg-white/5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 mx-1">
                    暂无好友<br/>在公共大厅点击头像添加
                  </div>
                )}

                {friends.map(friend => {
                  const presence = getUserPresence(friend.id);
                  const isOnline = isUserOnline(friend.id);
                  const presenceStatus: UserPresenceStatus = presence?.status || 'offline';
                  
                  return (
                    <button 
                      key={friend.id}
                      onClick={async () => { 
                        setActiveContactId(friend.id); 
                        setIsMobileListOpen(false);
                        try {
                          await dbService.markMessagesAsRead(friend.id);
                        } catch (e) {
                          console.error('标记消息已读失败:', e);
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                        activeContactId === friend.id 
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="relative">
                        <Avatar 
                          avatar={friend.avatar} 
                          name={friend.username} 
                          size="sm" 
                          className={activeContactId === friend.id ? 'ring-2 ring-white/30' : ''} 
                        />
                        <PresenceDot 
                          status={presenceStatus} 
                          size="sm"
                          className="absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{friend.username}</div>
                        <div className="text-[10px] opacity-70">
                          {isOnline ? (
                            <span className="text-green-400">在线</span>
                          ) : (
                            <span>{getLastSeenText(friend.id)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 bg-[#f5f5f7] dark:bg-[#0d1117]">
        <div className="absolute inset-0 z-0 opacity-100 pointer-events-none transition-all overflow-hidden" style={bgStyle}>
          {!currentUser.chatBackground && (
            <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#0d1117]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent dark:from-primary-900/10" />
            </div>
          )}
          {currentUser.chatBackground && <div className="absolute inset-0 bg-white/5 dark:bg-black/10" />}
        </div>

        <div className="h-16 px-4 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-500 dark:text-slate-400 mr-1" 
              onClick={() => setIsMobileListOpen(true)}
            >
              <Users size={20} />
            </button>
            {activeContactId === null ? (
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Hash size={20} />
              </div>
            ) : (
              <Avatar avatar={activeFriend?.avatar || ''} name={chatTitle} size="md" />
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{chatTitle}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {activeContactId ? (
                  <PresenceIndicator 
                    status={getUserPresence(activeContactId)?.status || 'offline'}
                    size="sm"
                    showLabel
                    lastSeenText={getLastSeenText(activeContactId)}
                  />
                ) : (
                  `公共频道 · ${friends.filter(f => isUserOnline(f.id)).length + 1} 人在线`
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 relative z-0">
          {isLoading && messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-slate-400 dark:text-slate-500">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm">加载中...</p>
              </div>
            </div>
          )}
          
          {!isLoading && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
              <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={40} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium">暂无消息</p>
              <p className="text-xs mt-1">发送一条消息开始聊天吧</p>
            </div>
          )}
          
          {messages.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group animate-slide-up`}
              >
                <div 
                  onClick={() => onViewUser(msg.userId)} 
                  className="cursor-pointer mt-auto mb-1 transform transition-transform hover:scale-110"
                >
                  <Avatar avatar={msg.userAvatar} name={msg.username} size="sm" />
                </div>
                <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span 
                      onClick={() => onViewUser(msg.userId)}
                      className={`text-[11px] font-bold cursor-pointer hover:underline ${
                        isMe ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {msg.username}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600">
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <div className={`
                    relative shadow-sm overflow-hidden backdrop-blur-md transition-all
                    ${msg.type === 'text' ? 'px-4 py-2.5 rounded-[20px]' : 'rounded-xl p-2'}
                    ${isMe 
                      ? (msg.type === 'text' ? 'bg-primary-500 text-white rounded-br-none' : 'bg-primary-500/20 border border-primary-500/30') 
                      : (msg.type === 'text' ? 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-slate-100 rounded-bl-none border border-black/5 dark:border-white/5 shadow-sm' : 'bg-white/60 dark:bg-slate-800/60 border border-black/5 dark:border-white/5')}
                  `}>
                    {renderMessageContent(msg)}
                    
                    {isMe && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {renderMessageStatus(msg.status, msg.id)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 relative z-20 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7] to-transparent dark:from-[#0d1117] dark:via-[#0d1117]">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, 'image')} 
          />
          <input 
            type="file" 
            ref={videoInputRef} 
            accept="video/mp4,video/webm" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, 'video')} 
          />

          {isRecording ? (
            <div className="bg-red-500 text-white rounded-full p-2 flex items-center justify-between shadow-lg animate-pulse max-w-2xl mx-auto">
              <div className="flex items-center gap-3 px-4 font-mono font-bold">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"/> 
                {Math.floor(recordingTime/60)}:{String(recordingTime%60).padStart(2,'0')}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={cancelRecording} 
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20}/>
                </button>
                <button 
                  onClick={stopRecording} 
                  className="p-2 bg-white text-red-500 rounded-full shadow-sm"
                >
                  <Square size={18} fill="currentColor"/>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-[24px] p-1.5 flex items-end gap-2 shadow-xl max-w-4xl mx-auto backdrop-blur-xl">
              <div className="flex pb-1 gap-0.5">
                <button 
                  onClick={() => setShowShareModal(true)} 
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="分享日志"
                >
                  <Share2 size={20}/>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="发送图片"
                >
                  <ImageIcon size={20}/>
                </button>
                <button 
                  onClick={() => videoInputRef.current?.click()} 
                  className="p-2 text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="发送视频"
                >
                  <Video size={20}/>
                </button>
                <button 
                  onClick={startRecording} 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="语音消息"
                >
                  <Mic size={20}/>
                </button>
              </div>
              <div className="flex-1 min-h-[44px] flex items-center px-2 py-1">
                <textarea 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { 
                    if(e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSendText(); 
                    } 
                  }}
                  placeholder={activeContactId ? `发送给 ${activeFriend?.username}...` : "发送到公共频道..."}
                  rows={1}
                  className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-[15px] resize-none py-2 custom-scrollbar"
                  style={{ minHeight: '24px', maxHeight: '100px' }}
                />
              </div>
              <button 
                onClick={handleSendText} 
                disabled={!inputText.trim() || isSending} 
                className="p-2.5 mb-0.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-all shadow-md shadow-primary-500/30 disabled:opacity-50 disabled:scale-95 disabled:shadow-none"
              >
                <Send size={18} className={inputText.trim() ? "translate-x-0.5" : ""} />
              </button>
            </div>
          )}
        </div>

        {showShareModal && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-2xl border border-black/10 dark:border-white/10 animate-scale-in w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 dark:text-white font-bold text-lg">分享日志</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">选择一篇日志分享到当前聊天室</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无可分享的日志</p>
                  </div>
                ) : (
                  entries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => handleShareEntry(entry)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText size={20} className="text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-white truncate">
                          {entry.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

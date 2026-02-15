
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User, LogEntry } from '../types';
import * as dbService from '../services/dbService';
import { Send, Image as ImageIcon, Share2, Video, Mic, X, Square, Users, Hash, MessageCircle, ChevronDown, ChevronRight, User as UserIcon, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Avatar } from './Avatar';

interface ChatViewProps {
  currentUser: User;
  onViewEntry: (entryId: string) => void;
  onViewUser: (userId: string) => void;
  initialContactId?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, onViewEntry, onViewUser, initialContactId = null }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Layout & Context
  const [activeContactId, setActiveContactId] = useState<string | null>(initialContactId); // null = Public, string = Friend ID
  const [friends, setFriends] = useState<User[]>([]);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  
  // Sidebar Expansion
  const [isRoomExpanded, setIsRoomExpanded] = useState(true);

  // Media State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Friends & Messages
  const refreshData = async () => {
    // Friends
    const friendList = await dbService.getFriendsList(currentUser.id);
    setFriends(friendList);

    // Messages based on active context
    // IMPORTANT: Public chat requests pass undefined to dbService to get global messages
    const msgs = await dbService.getMessages(currentUser.id, activeContactId || undefined);
    setMessages(msgs);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000); // Polling for real-time
    return () => clearInterval(interval);
  }, [currentUser.id, activeContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText, 'text');
    setInputText('');
  };

  const sendMessage = async (content: string, type: ChatMessage['type'], relatedEntryId?: string) => {
    const msg: Partial<ChatMessage> = {
      id: uuidv4(),
      userId: currentUser.id,
      content: content,
      type: type,
      recipientId: activeContactId || undefined,
      relatedEntryId,
      createdAt: new Date().toISOString()
    };
    await dbService.sendMessage(msg);
    refreshData();
  };

  // --- File Handling (Image/Video) ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      sendMessage(base64, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- Audio Recording ---
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
      console.error("Mic access denied", err);
      alert("无法访问麦克风");
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

  // Get active contact info
  const activeFriend = activeContactId ? friends.find(f => f.id === activeContactId) : null;
  const chatTitle = activeFriend ? activeFriend.username : '公共大厅';
  const chatAvatar = activeFriend ? activeFriend.avatar : null;
  
  // Custom Background - Full display in chat area only
  const bgStyle = currentUser.chatBackground ? {
      backgroundImage: `url(${currentUser.chatBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll'
  } : {};

  return (
    <div className="flex h-full bg-[#f5f5f7] dark:bg-[#0d1117] relative overflow-hidden transition-colors">
      
      {/* 1. LEFT SIDEBAR (Apple-style Sidebar) */}
      <div className={`
         w-full md:w-72 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 flex flex-col shrink-0 transition-all absolute md:relative z-20 h-full shadow-2xl md:shadow-none
         ${isMobileListOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5">
             <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                <MessageCircle size={20} className="text-primary-500"/> 消息
             </h2>
             <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsMobileListOpen(false)}><X size={20}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
             
             {/* Collapsible Group */}
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
                        {/* Public Hall */}
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

                        {friends.map(friend => (
                            <button 
                              key={friend.id}
                              onClick={() => { setActiveContactId(friend.id); setIsMobileListOpen(false); }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                                  activeContactId === friend.id 
                                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                               <Avatar avatar={friend.avatar} name={friend.username} size="sm" className={activeContactId === friend.id ? 'ring-2 ring-white/30' : ''} />
                               <div className="text-left flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{friend.username}</div>
                                  <div className="text-[10px] opacity-70 flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]"></span> Online
                                  </div>
                               </div>
                            </button>
                        ))}
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* 2. RIGHT SIDEBAR (Chat Area) */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#f5f5f7] dark:bg-[#0d1117]">
        
        {/* Chat Background Layer - Full Display */}
        <div className="absolute inset-0 z-0 opacity-100 pointer-events-none transition-all overflow-hidden" style={bgStyle}>
            {!currentUser.chatBackground && (
                <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#0d1117]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent dark:from-primary-900/10" />
                </div>
            )}
            {/* If user has background, add subtle overlay for readability - 更透明的遮罩 */}
            {currentUser.chatBackground && <div className="absolute inset-0 bg-white/5 dark:bg-black/10" />}
        </div>

        {/* Chat Header */}
        <div className="h-16 px-4 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
              <button className="md:hidden text-slate-500 dark:text-slate-400 mr-1" onClick={() => setIsMobileListOpen(true)}>
                 <Users size={20} />
              </button>
              {activeContactId === null ? (
                 <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <Hash size={20} />
                 </div>
              ) : (
                 <Avatar avatar={chatAvatar || ''} name={chatTitle} size="md" />
              )}
              <div>
                 <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{chatTitle}</h2>
                 <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {activeContactId ? '私密对话' : '公共频道 • 所有用户可见'}
                 </p>
              </div>
           </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 relative z-0">
            {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle size={40} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium">暂无消息，开始聊天吧</p>
               </div>
            )}
            
            {messages.map((msg) => {
               const isMe = msg.userId === currentUser.id;
               return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group animate-slide-up`}>
                     <div onClick={() => onViewUser(msg.userId)} className="cursor-pointer mt-auto mb-1 transform transition-transform hover:scale-110">
                        <Avatar avatar={msg.userAvatar} name={msg.username} size="sm" />
                     </div>
                     <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                           <span className={`text-[11px] font-bold ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>{msg.username}</span>
                           <span className="text-[10px] text-slate-400 dark:text-slate-600">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        
                        {/* Apple-style Message Bubble */}
                        <div className={`
                           relative shadow-sm overflow-hidden backdrop-blur-md transition-all
                           ${msg.type === 'text' ? 'px-4 py-2.5 rounded-[20px]' : 'rounded-xl'}
                           ${isMe 
                              ? (msg.type === 'text' ? 'bg-primary-500 text-white rounded-br-none' : 'bg-primary-500/20 border border-primary-500/30') 
                              : (msg.type === 'text' ? 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-slate-100 rounded-bl-none border border-black/5 dark:border-white/5 shadow-sm' : 'bg-white/60 dark:bg-slate-800/60 border border-black/5 dark:border-white/5')}
                        `}>
                           {/* Content Handling */}
                           {msg.type === 'text' && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                           {msg.type === 'image' && <img src={msg.content} className="max-w-full max-h-[300px] object-cover rounded-lg" />}
                           {msg.type === 'video' && <video src={msg.content} controls className="max-w-full max-h-[300px] rounded-lg bg-black" />}
                           {msg.type === 'audio' && <audio src={msg.content} controls className="h-8 w-full max-w-[240px]" />}
                           {msg.type === 'entry_share' && msg.relatedEntryId && (
                              <div onClick={() => onViewEntry(msg.relatedEntryId!)} className="w-64 cursor-pointer bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors rounded-lg overflow-hidden border border-black/5 dark:border-white/5">
                                 {(() => {
                                    try {
                                       const data = JSON.parse(msg.content);
                                       return (
                                          <>
                                             <div className="h-32 bg-slate-200 dark:bg-slate-900 relative">
                                                <img src={data.img} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 left-0 bg-primary-600/90 backdrop-blur-md text-[10px] px-2 py-0.5 text-white font-bold">Log Share</div>
                                             </div>
                                             <div className="p-3">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{data.title}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">点击查看详情</div>
                                             </div>
                                          </>
                                       )
                                    } catch { return null }
                                 })()}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 relative z-20 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7] to-transparent dark:from-[#0d1117] dark:via-[#0d1117]">
           <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
           <input type="file" ref={videoInputRef} accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />

           {isRecording ? (
               <div className="bg-red-500 text-white rounded-full p-2 flex items-center justify-between shadow-lg animate-pulse max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 px-4 font-mono font-bold"><div className="w-3 h-3 bg-white rounded-full animate-ping"/> {Math.floor(recordingTime/60)}:{String(recordingTime%60).padStart(2,'0')}</div>
                  <div className="flex gap-2">
                     <button onClick={cancelRecording} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                     <button onClick={stopRecording} className="p-2 bg-white text-red-500 rounded-full shadow-sm"><Square size={18} fill="currentColor"/></button>
                  </div>
               </div>
           ) : (
               <div className="bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-[24px] p-1.5 flex items-end gap-2 shadow-xl max-w-4xl mx-auto backdrop-blur-xl">
                  <div className="flex pb-1 gap-0.5">
                     <button onClick={() => setShowShareModal(true)} className="p-2 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><Share2 size={20}/></button>
                     <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ImageIcon size={20}/></button>
                     <button onClick={() => videoInputRef.current?.click()} className="p-2 text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><Video size={20}/></button>
                     <button onClick={startRecording} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><Mic size={20}/></button>
                  </div>
                  <div className="flex-1 min-h-[44px] flex items-center px-2 py-1">
                     <textarea 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                        placeholder={activeContactId ? `发送给 ${activeFriend?.username}...` : "发送到公共频道..."}
                        rows={1}
                        className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-[15px] resize-none py-2 custom-scrollbar"
                        style={{ minHeight: '24px', maxHeight: '100px' }}
                     />
                  </div>
                  <button onClick={handleSendText} disabled={!inputText.trim()} className="p-2.5 mb-0.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-all shadow-md shadow-primary-500/30 disabled:opacity-50 disabled:scale-95 disabled:shadow-none">
                     <Send size={18} className={inputText.trim() ? "translate-x-0.5" : ""} />
                  </button>
               </div>
           )}
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 text-center shadow-2xl border border-black/10 dark:border-white/10 animate-scale-in w-full max-w-sm">
                 <h3 className="text-slate-800 dark:text-white font-bold mb-4 text-lg">分享日志</h3>
                 <p className="text-sm text-slate-500 mb-6">选择一篇日志分享到当前聊天室</p>
                 <button onClick={() => setShowShareModal(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">关闭</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, Settings, User as UserIcon, Loader2, StopCircle, X, Save } from 'lucide-react';
import { Button } from './Button';
import { User } from '../types';
import * as aiService from '../services/aiService';
import { Avatar } from './Avatar';

interface AIChatViewProps {
  currentUser: User;
  onOpenSettings: () => void; // Kept for interface compatibility but we use local modal
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export const AIChatView: React.FC<AIChatViewProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<aiService.AIConfig>({ baseUrl: '', model: '' });
  
  // To handle stop generation
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    // Load local history
    const saved = localStorage.getItem(`ai_chat_history_${currentUser.id}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
    } else {
        setMessages([{
            id: 'init',
            role: 'assistant',
            content: '你好！我是你的 AI 学习助手。有什么我可以帮你的吗？',
            timestamp: Date.now()
        }]);
    }
    // Load config
    setAiConfig(aiService.getAIConfig());
  }, [currentUser.id]);

  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem(`ai_chat_history_${currentUser.id}`, JSON.stringify(messages));
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentUser.id]);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsGenerating(true);
    isGeneratingRef.current = true;

    // Prepare context
    const apiMessages: aiService.AIMessage[] = newMessages.map(m => ({
        role: m.role,
        content: m.content
    }));

    // Add placeholder for assistant
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
    }]);

    await aiService.streamChatCompletion(
        apiMessages,
        (chunk) => {
            if (!isGeneratingRef.current) return;
            setMessages(prev => prev.map(m => 
                m.id === assistantMsgId 
                ? { ...m, content: m.content + chunk }
                : m
            ));
        },
        () => {
            setIsGenerating(false);
            isGeneratingRef.current = false;
        },
        (err) => {
            setIsGenerating(false);
            isGeneratingRef.current = false;
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: `Error: ${err}\n请检查右上角设置中的 API 配置。`,
                timestamp: Date.now()
            }]);
        }
    );
  };

  const handleStop = () => {
      setIsGenerating(false);
      isGeneratingRef.current = false;
  };

  const handleClear = () => {
    if (confirm("确定要清空对话历史吗？")) {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: '对话已清除。',
            timestamp: Date.now()
        }]);
    }
  };

  const handleSaveConfig = () => {
    aiService.saveAIConfig(aiConfig);
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#0d1117] relative transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">AI 助手</h2>
            <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               <p className="text-[10px] text-slate-500 dark:text-slate-400">Powered by Local LLM</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" onClick={handleClear} title="清空对话">
              <Trash2 size={18} />
           </Button>
           <Button 
             variant={showSettings ? "primary" : "secondary"} 
             size="sm" 
             onClick={() => setShowSettings(true)} 
             title="AI 设置"
           >
              <Settings size={18} />
           </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
         {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} ${isSystem ? 'justify-center' : ''} animate-slide-up`}>
                    
                    {!isSystem && (
                        <div className="shrink-0">
                            {isUser ? (
                                <Avatar avatar={currentUser.avatar} name={currentUser.username} size="sm" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border border-indigo-500">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`
                            px-4 py-3 rounded-2xl shadow-md text-sm leading-relaxed whitespace-pre-wrap transition-colors
                            ${isUser 
                                ? 'bg-primary-500 text-white rounded-tr-sm' 
                                : isSystem 
                                    ? 'bg-red-900/20 dark:bg-red-900/10 text-red-700 dark:text-red-300 border border-red-900/30 dark:border-red-900/50 text-xs py-2' 
                                    : 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/5 rounded-tl-sm'
                            }
                        `}>
                            {msg.content}
                            {msg.role === 'assistant' && isGenerating && msg.id === messages[messages.length - 1].id && (
                               <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 animate-pulse"/>
                            )}
                        </div>
                        {!isSystem && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 px-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </div>
                        )}
                    </div>
                </div>
            );
         })}
         <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7] to-transparent dark:from-[#0d1117] dark:via-[#0d1117] border-t border-black/5 dark:border-white/5 transition-colors">
         <div className="max-w-4xl mx-auto relative flex gap-2">
            <div className="flex-1 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl flex items-center px-4 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500/50 transition-all">
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={isGenerating ? "AI 正在思考..." : "输入消息，与 AI 助手对话..."}
                    disabled={isGenerating}
                    rows={1}
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-600 py-3 text-sm resize-none custom-scrollbar transition-colors"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                />
            </div>
            
            {isGenerating ? (
                <Button 
                    variant="danger" 
                    onClick={handleStop}
                    className="aspect-square h-[46px] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20"
                >
                    <StopCircle size={20} fill="currentColor" />
                </Button>
            ) : (
                <Button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="aspect-square h-[46px] rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/20"
                >
                    <Send size={20} />
                </Button>
            )}
         </div>
      </div>

      {/* Settings Modal (Overlay) */}
      {showSettings && (
         <div className="absolute inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/40 dark:bg-[#0d1117]/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in flex flex-col overflow-hidden transition-colors">
               <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#161b22]/80 transition-colors">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <Bot size={18} className="text-primary-500"/>
                     模型设置
                  </h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                     <X size={20}/>
                  </button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">API Base URL</label>
                     <input 
                       type="text" 
                       value={aiConfig.baseUrl}
                       onChange={e => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
                       placeholder="http://localhost:1234/v1"
                     />
                     <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => setAiConfig({...aiConfig, baseUrl: 'http://localhost:1234/v1'})}
                          className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          Use LM Studio
                        </button>
                        <button 
                          onClick={() => setAiConfig({...aiConfig, baseUrl: 'http://localhost:11434/v1'})}
                          className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          Use Ollama
                        </button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Model Name</label>
                     <input 
                       type="text" 
                       value={aiConfig.model}
                       onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
                       placeholder="e.g. gpt-3.5-turbo, llama2"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">API Key <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                     <input 
                       type="password" 
                       value={aiConfig.apiKey || ''}
                       onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
                       placeholder="Bearer Token"
                     />
                  </div>
               </div>

               <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-[#161b22]/50 flex justify-end transition-colors">
                  <Button onClick={handleSaveConfig} className="w-full">
                     <Save size={16} className="mr-2"/> 保存配置
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

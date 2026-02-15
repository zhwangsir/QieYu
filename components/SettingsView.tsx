
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Button } from './Button';
import { Lock, RefreshCw, Database, Download, Upload, AlertTriangle, Save, Trash2, Bot, ShieldCheck, ChevronRight, Palette, Image, Moon, Sun, Smartphone, Loader2 } from 'lucide-react';
import * as dbService from '../services/dbService';
import * as aiService from '../services/aiService';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updates: Partial<User>, currentPassword?: string) => Promise<void>;
  onImport: (data: any) => Promise<void>;
  onExport: () => void;
  onClearData: () => void;
  onOpenAdmin?: () => void;
  onApplyTheme?: (themeId: string) => void;
  onToggleMode?: (mode: 'light' | 'dark') => void;
}

const THEMES = [
  { id: 'violet', name: '紫罗兰', color: '#8b5cf6',
    vars: { 50: '#f5f3ff', 500: '#8b5cf6', 600: '#7c3aed', 900: '#4c1d95' } },
  { id: 'blue', name: '天空蓝', color: '#3b82f6',
    vars: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 900: '#1e3a8a' } },
  { id: 'emerald', name: '翠绿', color: '#10b981',
    vars: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 900: '#064e3b' } },
  { id: 'rose', name: '玫瑰红', color: '#f43f5e',
    vars: { 50: '#fff1f2', 500: '#f43f5e', 600: '#e11d48', 900: '#881337' } },
  { id: 'amber', name: '琥珀橙', color: '#f59e0b',
    vars: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 900: '#78350f' } },
  { id: 'cyan', name: '青色', color: '#06b6d4',
    vars: { 50: '#ecfeff', 500: '#06b6d4', 600: '#0891b2', 900: '#164e63' } },
  { id: 'pink', name: '粉色', color: '#ec4899',
    vars: { 50: '#fdf2f8', 500: '#ec4899', 600: '#db2777', 900: '#831843' } },
  { id: 'indigo', name: '靛蓝', color: '#6366f1',
    vars: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 900: '#312e81' } },
  { id: 'teal', name: ' teal', color: '#14b8a6',
    vars: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', 900: '#134e4a' } },
  { id: 'orange', name: '活力橙', color: '#f97316',
    vars: { 50: '#fff7ed', 500: '#f97316', 600: '#ea580c', 900: '#7c2d12' } },
  { id: 'red', name: '中国红', color: '#ef4444',
    vars: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 900: '#7f1d1d' } },
  { id: 'slate', name: '石墨灰', color: '#64748b',
    vars: { 50: '#f8fafc', 500: '#64748b', 600: '#475569', 900: '#0f172a' } },
];

// 自定义主题存储键
const CUSTOM_THEME_KEY = 'qieyu_custom_theme';

export const SettingsView: React.FC<SettingsViewProps> = ({
  user, onUpdateUser, onImport, onExport, onClearData, onOpenAdmin, onApplyTheme, onToggleMode
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Appearance
  const [selectedTheme, setSelectedTheme] = useState(user.theme || 'violet');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(user.themeMode || 'dark');
  const [chatBg, setChatBg] = useState(user.chatBackground || '');
  const [previewBg, setPreviewBg] = useState(user.chatBackground || '');

  // Custom Theme
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#8b5cf6');

  const [aiConfig, setAiConfig] = useState<aiService.AIConfig>({ baseUrl: '', model: '' });

  // Import/Export
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAiConfig(aiService.getAIConfig());
    // 加载自定义主题色
    const savedCustomColor = localStorage.getItem(CUSTOM_THEME_KEY);
    if (savedCustomColor) {
      setCustomColor(savedCustomColor);
    }
  }, []);

  // 处理导入文件
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          await onImport(jsonData);
          setMessage({ text: '数据导入成功', type: 'success' });
        } catch (error: any) {
          setMessage({ text: '导入失败: ' + error.message, type: 'error' });
        } finally {
          setImportLoading(false);
          // 重置文件输入
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.onerror = () => {
        setMessage({ text: '读取文件失败', type: 'error' });
        setImportLoading(false);
      };
      reader.readAsText(file);
    } catch (error: any) {
      setMessage({ text: '导入失败: ' + error.message, type: 'error' });
      setImportLoading(false);
    }
  };

  // 触发文件选择
  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  // 生成主题变量
  const generateThemeVars = (hexColor: string) => {
    // 简单的颜色处理，实际项目中可以使用颜色库
    return {
      50: hexColor + '0D', // 5% opacity
      500: hexColor,
      600: hexColor, // 简化处理
      900: hexColor,
    };
  };

  const handleApplyTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
       // 调用父组件的回调来应用主题
       if (onApplyTheme) {
         onApplyTheme(themeId);
       }
       await onUpdateUser({ theme: themeId });
       setMessage({ text: `已切换到「${theme.name}」主题`, type: 'success' });
    }
  };

  const handleApplyCustomTheme = async () => {
    // 保存自定义颜色
    localStorage.setItem(CUSTOM_THEME_KEY, customColor);
    setSelectedTheme('custom');

    // 调用父组件的回调来应用自定义主题
    if (onApplyTheme) {
      onApplyTheme('custom');
    }

    await onUpdateUser({ theme: 'custom' });
    setMessage({ text: '自定义主题已应用', type: 'success' });
    setShowCustomPicker(false);
  };

  const handleToggleMode = async (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    // 调用父组件的回调来切换模式
    if (onToggleMode) {
      onToggleMode(mode);
    }
    await onUpdateUser({ themeMode: mode });
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setChatBg(base64);
        setPreviewBg(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAppearance = async () => {
    try {
        await onUpdateUser({ chatBackground: chatBg });
        setMessage({ text: "外观设置已保存", type: 'success' });
    } catch (e: any) {
        setMessage({ text: "保存失败: " + e.message, type: 'error' });
    }
  };

  const handleClearBg = async () => {
      setChatBg('');
      setPreviewBg('');
      await onUpdateUser({ chatBackground: '' });
  };

  const handleSavePassword = async () => {
    try {
      if (!oldPassword) throw new Error("请输入当前密码");
      if (!newPassword) throw new Error("请输入新密码");
      if (newPassword.length < 4) throw new Error("新密码太短");
      await onUpdateUser({ password: newPassword }, oldPassword);
      setMessage({ text: "密码修改成功", type: 'success' });
      setOldPassword('');
      setNewPassword('');
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    }
  };

  const handleSaveAIConfig = () => {
    aiService.saveAIConfig(aiConfig);
    setMessage({ text: "AI 配置已保存", type: 'success' });
  };

  return (
    <div className="h-full bg-[#f5f5f7] dark:bg-[#0d1117] overflow-y-auto custom-scrollbar p-4 md:p-10 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">个性化您的体验与安全</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slide-up ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
          }`}>
             {message.type === 'success' ? <RefreshCw size={20}/> : <AlertTriangle size={20}/>}
             {message.text}
          </div>
        )}

        {/* Appearance Section */}
        <section className="bg-white dark:bg-[#161b22] rounded-[24px] border border-black/5 dark:border-white/5 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
               <Palette size={20}/>
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">外观风格</h2>
           </div>
           
           <div className="space-y-8">
              <div>
                  <label className="block text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">界面模式</label>
                  <div className="flex gap-4">
                      <button 
                        onClick={() => handleToggleMode('light')}
                        className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${themeMode === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-600' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                      >
                         <Sun size={24} />
                         <span className="font-bold text-sm">Light Mode</span>
                      </button>
                      <button 
                        onClick={() => handleToggleMode('dark')}
                        className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${themeMode === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-600' : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                      >
                         <Moon size={24} />
                         <span className="font-bold text-sm">Dark Mode</span>
                      </button>
                  </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider"></label>
                 <div className="flex flex-wrap gap-4">
                    {THEMES.map(theme => (
                        <button
                           key={theme.id}
                           onClick={() => handleApplyTheme(theme.id)}
                           className={`group relative flex flex-col items-center gap-2`}
                        >
                           <div
                             className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${selectedTheme === theme.id ? 'ring-4 ring-offset-2 ring-primary-500 dark:ring-offset-[#161b22]' : 'hover:scale-110'}`}
                             style={{ backgroundColor: theme.color }}
                           >
                              {selectedTheme === theme.id && <div className="w-3 h-3 bg-white rounded-full" />}
                           </div>
                           <span className={`text-xs font-medium ${selectedTheme === theme.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{theme.name}</span>
                        </button>
                    ))}
                    {/* 自定义主题按钮 */}
                    <button
                       onClick={() => setShowCustomPicker(true)}
                       className={`group relative flex flex-col items-center gap-2`}
                    >
                       <div
                         className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 ${selectedTheme === 'custom' ? 'ring-4 ring-offset-2 ring-primary-500 dark:ring-offset-[#161b22]' : 'hover:scale-110'}`}
                       >
                          <Palette size={20} className="text-white" />
                       </div>
                       <span className={`text-xs font-medium ${selectedTheme === 'custom' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>自定义</span>
                    </button>
                 </div>

                 {/* 自定义颜色选择器 */}
                 {showCustomPicker && (
                   <div className="mt-6 p-6 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                     <div className="flex items-center gap-4 mb-4">
                       <label className="text-sm font-bold text-slate-700 dark:text-slate-300">选择颜色:</label>
                       <input
                         type="color"
                         value={customColor}
                         onChange={(e) => setCustomColor(e.target.value)}
                         className="w-16 h-10 rounded-lg cursor-pointer border-0"
                       />
                       <span className="text-sm font-mono text-slate-500">{customColor}</span>
                     </div>
                     <div className="flex gap-3">
                       <Button size="sm" onClick={handleApplyCustomTheme}>应用</Button>
                       <Button variant="ghost" size="sm" onClick={() => setShowCustomPicker(false)}>取消</Button>
                     </div>
                   </div>
                 )}
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">聊天背景图</label>
                 <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-48 aspect-[3/4] bg-slate-100 dark:bg-black rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-inner">
                        {previewBg ? (
                            <img src={previewBg} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Smartphone size={32} className="mb-2 opacity-50"/>
                                <span className="text-xs">无背景</span>
                            </div>
                        )}
                        {previewBg && (
                            <button onClick={handleClearBg} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={14}/>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4 pt-2">
                        <p className="text-sm text-slate-500 leading-relaxed">
                           自定义您的个人聊天背景。此背景将仅对您自己可见。
                           <br/><span className="text-xs opacity-70">推荐尺寸: 竖屏 1080x1920, 最大 2MB.</span>
                        </p>
                        
                        <div className="flex gap-3">
                           <label className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-xl cursor-pointer transition-all font-bold text-sm shadow-lg">
                              <Upload size={16} />
                              <span>上传图片</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                           </label>
                           {chatBg !== user.chatBackground && (
                              <Button size="md" onClick={handleSaveAppearance}>保存修改</Button>
                           )}
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Admin Card */}
        {user.role === 'admin' && (
          <div onClick={onOpenAdmin} className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-purple-600 rounded-[24px] p-8 cursor-pointer group shadow-2xl relative overflow-hidden transform transition-all hover:scale-[1.01]">
             <div className="absolute top-0 right-0 p-12 opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <ShieldCheck size={120} className="text-white"/>
             </div>
             <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-inner"><ShieldCheck size={32} /></div>
                   <div>
                      <h3 className="text-2xl font-bold text-white mb-1">系统后台管理</h3>
                      <p className="text-white/60 text-sm">用户管理、权限控制、审计日志与数据中心</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all"><ChevronRight size={20} /></div>
             </div>
          </div>
        )}

        {/* Security Section */}
        <section className="bg-white dark:bg-[#161b22] rounded-[24px] border border-black/5 dark:border-white/5 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
               <Lock size={20}/>
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">账户安全</h2>
           </div>

           <div className="space-y-4 max-w-md">
              <div>
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider">当前密码</label>
                 <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary-500 outline-none transition-all" placeholder="验证身份"/>
              </div>
              <div>
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider">新密码</label>
                 <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary-500 outline-none transition-all" placeholder="至少 4 位字符"/>
              </div>
              <div className="pt-2"><Button onClick={handleSavePassword} className="w-full sm:w-auto"><RefreshCw size={16} className="mr-2"/> 修改密码</Button></div>
           </div>
        </section>

        {/* AI Configuration */}
        <section className="bg-white dark:bg-[#161b22] rounded-[24px] border border-black/5 dark:border-white/5 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
               <Bot size={20}/>
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI 服务配置</h2>
           </div>
           <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider">Base URL</label>
                 <input type="text" value={aiConfig.baseUrl} onChange={e => setAiConfig({...aiConfig, baseUrl: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all font-mono text-sm placeholder-slate-400"/>
              </div>
              <div className="md:col-span-1">
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider">Model Name</label>
                 <input type="text" value={aiConfig.model} onChange={e => setAiConfig({...aiConfig, model: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"/>
              </div>
              <div className="md:col-span-1">
                 <label className="block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider">API Key</label>
                 <input type="password" value={aiConfig.apiKey || ''} onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all"/>
              </div>
              <div className="md:col-span-2 pt-2"><Button onClick={handleSaveAIConfig} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500"><Save size={16} className="mr-2"/> 保存配置</Button></div>
           </div>
        </section>

        {/* Data Management */}
        <section className="bg-white dark:bg-[#161b22] rounded-[24px] border border-black/5 dark:border-white/5 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <Database size={20}/>
             </div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">数据管理</h2>
           </div>

           <div className="grid gap-4 md:grid-cols-2">
              <div onClick={onExport} className="p-6 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-emerald-500/50 cursor-pointer group transition-all">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                     <Download size={20} />
                   </div>
                   <h3 className="font-bold text-slate-700 dark:text-slate-200">导出备份</h3>
                </div>
                <p className="text-xs text-slate-500">下载 JSON 数据文件。</p>
              </div>

              <div onClick={triggerImport} className={`p-6 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-blue-500/50 cursor-pointer group transition-all ${importLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     {importLoading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                   </div>
                   <h3 className="font-bold text-slate-700 dark:text-slate-200">恢复数据</h3>
                </div>
                <p className="text-xs text-slate-500">从 JSON 文件恢复学习日志。</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
           </div>

           <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-red-500 dark:text-red-400 flex items-center gap-2"><Trash2 size={16}/> 危险区域</h3>
                   <p className="text-xs text-slate-500 mt-1">清空本地缓存信息（不影响数据库）。</p>
                </div>
                {!confirmClear ? (
                   <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>清空缓存</Button>
                ) : (
                   <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>取消</Button>
                      <Button variant="danger" size="sm" onClick={onClearData}>确认清空</Button>
                   </div>
                )}
             </div>
           </div>
        </section>

      </div>
    </div>
  );
};

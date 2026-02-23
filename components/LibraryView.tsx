
import React, { useState, useMemo, useEffect } from 'react';
import { LogEntry, User, LogType } from '../types';
import { LOG_TYPES } from '../constants';
import { Button } from './Button';
import { Search, ImageOff, Video, Heart, Settings, User as UserIcon, Lock, X, ChevronRight, Layers, Trash2, ArrowUpDown, ChevronDown, Activity, CalendarDays } from 'lucide-react';
import * as dbService from '../services/dbService';
import { Avatar } from './Avatar';

interface LibraryViewProps {
  entries: LogEntry[];
  currentUser: User;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onLikeToggle: (id: string) => void;
  categories: string[];
  onManageCategories: (logType?: LogType) => void;
  onViewUser: (userId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ 
  entries, currentUser, onCreate, onSelect, onDelete, onLikeToggle,
  onManageCategories, onViewUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogType, setSelectedLogType] = useState<LogType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [typeSpecificCategories, setTypeSpecificCategories] = useState<string[]>([]);
  
  // Sort state
  const [sortOption, setSortOption] = useState<string>('newest');

  // Stats calculation
  const totalLogs = entries.length;
  const thisWeekLogs = entries.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return (now.getTime() - d.getTime()) < oneWeek;
  }).length;

  // Update categories when type changes
  useEffect(() => {
    const loadCats = async () => {
        if (selectedLogType) {
          const cats = await dbService.getCategories(selectedLogType);
          // 如果没有自定义分类，使用默认分类
          if (cats.length <= 1) { // 只有"未分类"
            const defaultCats = LOG_TYPES[selectedLogType]?.defaultCategories || [];
            setTypeSpecificCategories(defaultCats);
          } else {
            setTypeSpecificCategories(cats.filter(c => c !== '未分类'));
          }
        } else {
          setTypeSpecificCategories([]);
        }
    }
    loadCats();
    setSelectedCategory(null);
  }, [selectedLogType, entries]); 

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = entry.title.toLowerCase().includes(term) || 
                            entry.notes.toLowerCase().includes(term) ||
                            entry.tags.some(t => t.toLowerCase().includes(term)) ||
                            (entry.authorName && entry.authorName.toLowerCase().includes(term));
      
      const matchesCategory = selectedCategory ? entry.category === selectedCategory : true;
      const matchesType = selectedLogType ? entry.logType === selectedLogType : true;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [entries, searchTerm, selectedCategory, selectedLogType]);

  // Sort Logic
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      switch (sortOption) {
        case 'newest': // Creation Date Desc
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': // Creation Date Asc
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated-desc': // Updated Date Desc
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'updated-asc': // Updated Date Asc
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'likes': // Likes Desc
          return (b.likeCount || 0) - (a.likeCount || 0);
        default:
          return 0;
      }
    });
  }, [filteredEntries, sortOption]);

  const handleStopPropagation = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const clearFilters = () => {
    setSelectedLogType(null);
    setSelectedCategory(null);
    setSearchTerm('');
    setSortOption('newest');
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#0d1117] transition-colors">
      {/* Unified Toolbar */}
      <div className="p-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md sticky top-0 z-20 shadow-lg space-y-4 transition-colors">
        
        {/* Row 1: Search, Sort & Manage */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="搜索标题、标签、笔记、作者..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50/80 dark:bg-[#0d1117]/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:border-primary-500 outline-none transition-all placeholder-slate-500 dark:placeholder-slate-600 focus:shadow-lg focus:shadow-primary-500/10 transition-colors"
              />
           </div>
           
           <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sort Dropdown */}
              <div className="relative flex-1 sm:flex-none">
                <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
                <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer transition-colors"
                >
                  <option value="newest">最新创建</option>
                  <option value="oldest">最早创建</option>
                  <option value="updated-desc">最近更新</option>
                  <option value="updated-asc">最早更新</option>
                  <option value="likes">最多点赞</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={() => onManageCategories(selectedLogType || undefined)}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm whitespace-nowrap transition-colors"
                title="管理分类"
              >
                <Settings size={16} />
                <span className="text-xs font-bold hidden sm:inline">分类</span>
              </button>
           </div>
        </div>

        {/* Row 2: Navigation / Filter Pill Bar */}
        <div className="w-full overflow-x-auto custom-scrollbar pb-1">
          <div className="flex items-center gap-1.5 min-w-max">
            
            {/* Step 1: Log Type Selector */}
            {selectedLogType === null ? (
              // Mode: Show All Types
              <>
                 <button
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-primary-500 text-white shadow-md transform scale-105 transition-all"
                  >
                    全部类型
                  </button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

                  {(Object.keys(LOG_TYPES) as LogType[]).map(type => {
                      const config = LOG_TYPES[type];
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedLogType(type)}
                          className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 flex items-center gap-2 transition-all transition-colors"
                        >
                          <Icon size={14} className={config.color} />
                          {config.label}
                        </button>
                      )
                  })}

                  {/* 管理分类按钮 - 在全部类型模式下也显示 */}
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />
                  <button
                    onClick={() => onManageCategories(undefined)}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-600 flex items-center gap-1.5 transition-all"
                    title="管理分类"
                  >
                    <Settings size={12} />
                    管理
                  </button>
              </>
            ) : (
              // Mode: Drill Down (Type Selected)
              <>
                 <button
                    onClick={clearFilters}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-all group transition-colors"
                  >
                    全部
                  </button>
                  
                  <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
                  
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="pl-3 pr-2 py-2 rounded-xl text-sm font-bold bg-primary-500/10 dark:bg-primary-900/20 border border-primary-500/30 dark:border-primary-900/50 text-primary-700 dark:text-white flex items-center gap-2 shadow-lg shadow-primary-500/10 relative group overflow-hidden transition-colors"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent dark:from-primary-900/20 opacity-50" />
                     {(() => {
                        const config = LOG_TYPES[selectedLogType];
                        const Icon = config.icon;
                        return <><Icon size={16} className={config.color} /> {config.label}</>;
                     })()}
                     <span
                       onClick={(e) => { e.stopPropagation(); setSelectedLogType(null); }}
                       className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full ml-1 transition-colors"
                       title="返回全部类型"
                     >
                       <X size={12} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white" />
                     </span>
                  </button>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

                  {/* Categories List */}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${!selectedCategory ? 'bg-primary-500 text-white shadow-md' : 'bg-white dark:bg-[#161b22] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    全部
                  </button>

                  {typeSpecificCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        cat === selectedCategory
                        ? 'bg-primary-500 border-primary-400 text-white shadow-md'
                        : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                      } transition-colors`}
                    >
                      {cat}
                    </button>
                  ))}

                  {/* 管理分类按钮 */}
                  <button
                    onClick={() => onManageCategories(selectedLogType || undefined)}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-600 flex items-center gap-1.5 transition-all"
                    title="管理分类"
                  >
                    <Settings size={12} />
                    管理
                  </button>

                  {typeSpecificCategories.length === 0 && (
                     <span className="text-[10px] text-slate-500 dark:text-slate-600 italic pl-2">无子分类</span>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        
        {/* Simple Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 transition-colors">
              <div className="p-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg"><Layers size={20}/></div>
              <div>
                 <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalLogs}</div>
                 <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Total Logs</div>
              </div>
           </div>
           <div className="bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 transition-colors">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg"><Activity size={20}/></div>
              <div>
                 <div className="text-2xl font-bold text-slate-900 dark:text-white">{thisWeekLogs}</div>
                 <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">This Week</div>
              </div>
           </div>
           {/* Placeholder for more stats */}
        </div>

        {sortedEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 opacity-60 animate-fade-in">
            <div className="w-24 h-24 bg-white dark:bg-[#161b22] rounded-full flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-700 shadow-xl transition-colors">
               <Layers size={40} className="text-slate-400 dark:text-slate-700" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-400">没有找到相关日志</p>
            <p className="text-xs text-slate-500 dark:text-slate-600 mt-2">尝试切换筛选条件或创建新日志</p>
            {(selectedLogType || searchTerm) && (
              <button onClick={clearFilters} className="mt-6 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-primary-500 dark:text-primary-400 text-sm transition-colors border border-slate-200 dark:border-slate-700 transition-colors">
                清除所有筛选
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedEntries.map((entry, index) => {
               const typeConfig = LOG_TYPES[entry.logType as LogType] || LOG_TYPES['comfyui'];
               const TypeIcon = typeConfig.icon;
               
               return (
                <div 
                  key={entry.id}
                  onClick={() => onSelect(entry.id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-slide-up group bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative transition-colors"
                >
                  {/* Image */}
                  <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-950 relative overflow-hidden transition-colors">
                    {entry.imageUrl && entry.imageUrl.trim() !== '' ? (
                       entry.mediaType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black">
                            <Video size={32} className="text-slate-300 dark:text-slate-500 z-10 drop-shadow-lg" />
                            <video src={entry.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" muted />
                          </div>
                       ) : (
                          <img 
                            src={entry.imageUrl} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                            loading="lazy"
                            alt={entry.title}
                          />
                       )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-700"><ImageOff size={32} /></div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                       <div className="flex gap-1">
                         <span className={`bg-black/60 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm font-bold flex items-center gap-1 text-[10px] ${typeConfig.color}`}>
                            <TypeIcon size={10} /> {typeConfig.label}
                         </span>
                         <span className="bg-black/40 dark:bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg border border-white/10 shadow-sm font-medium">
                            {entry.category}
                         </span>
                       </div>
                       
                       <div className="flex gap-1">
                          {entry.userId === currentUser.id && (
                            <span className="bg-primary-500/90 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg shadow-sm font-bold">
                              MY
                            </span>
                          )}
                          {!entry.isPublic && entry.userId === currentUser.id && (
                            <span className="bg-black/60 dark:bg-slate-700/90 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg shadow-sm font-bold flex items-center gap-1">
                              <Lock size={8} /> 私密
                            </span>
                          )}
                       </div>
                    </div>
  
                    {/* Bottom Content (Overlay) */}
                    <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                       <div className="flex justify-between items-end mb-1">
                          <h3 className="font-bold text-white text-lg truncate flex-1 pr-4 drop-shadow-md">{entry.title}</h3>
                          <button 
                             onClick={(e) => handleStopPropagation(e, () => onLikeToggle(entry.id))}
                             className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${entry.isLiked ? 'bg-pink-500/20 text-pink-500' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
                           >
                             <Heart size={16} fill={entry.isLiked ? "currentColor" : "none"} />
                           </button>
                       </div>
                       
                       <div className="text-xs text-slate-200 flex items-center gap-2 mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
                            onClick={(e) => handleStopPropagation(e, () => onViewUser(entry.userId))}
                          >
                             <Avatar avatar={entry.authorAvatar || ''} name={entry.authorName || '?'} size="xs" className="w-4 h-4 text-[8px]" />
                             <span className="truncate max-w-[80px] hover:underline">{entry.authorName}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                  </div>
  
                  {/* Footer Actions (Only show delete for own entries) */}
                  {entry.userId === currentUser.id && (
                    <button 
                      onClick={(e) => handleStopPropagation(e, () => onDelete(entry.id))}
                      className="absolute top-3 left-3 p-1.5 rounded-lg bg-red-500/0 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

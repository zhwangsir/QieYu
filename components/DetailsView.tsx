
import React, { useState } from 'react';
import { LogEntry, LogType } from '../types';
import { PromptBox } from './PromptBox';
import { ResourceTag } from './ResourceTag';
import { Button } from './Button';
import { ArrowLeft, Pencil, Trash2, Calendar, Tag, Clock, Folder, User, Globe, Lock, ImageOff } from 'lucide-react';
import { Avatar } from './Avatar';
import { LOG_TYPES } from '../constants';

interface DetailsViewProps {
  entry: LogEntry;
  currentUserId?: string;
  currentUserRole?: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewUser: (userId: string) => void;
}

export const DetailsView: React.FC<DetailsViewProps> = ({ entry, currentUserId, currentUserRole, onBack, onEdit, onDelete, onViewUser }) => {
  const logTypeConfig = LOG_TYPES[entry.logType as LogType] || LOG_TYPES['comfyui'];
  const LogIcon = logTypeConfig.icon;

  const showPrompts = entry.logType === 'comfyui';
  const showParams = entry.logType === 'comfyui';
  const showResources = entry.logType === 'comfyui' || entry.logType === 'modeling' || entry.logType === 'editing';

  // 检查是否有编辑/删除权限（作者本人或管理员）
  const canEdit = currentUserId === entry.userId || currentUserRole === 'admin';

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in bg-[#f5f5f7] dark:bg-[#0d1117] transition-colors">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#161b22]/50 backdrop-blur-sm sticky top-0 z-10 transition-colors">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={18} />}>
          返回列表
        </Button>
        <div className="flex gap-2">
          {/* 只有作者或管理员才能看到编辑/删除按钮 */}
          {canEdit && (
            <>
              <Button variant="secondary" onClick={() => onEdit(entry.id)} icon={<Pencil size={16} />}>
                编辑
              </Button>
              <Button variant="danger" onClick={() => onDelete(entry.id)} icon={<Trash2 size={16} />}>
                删除
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 pb-20">
          
          {/* Left Column: Media & Quick Stats */}
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-2xl relative group min-h-[200px] flex items-center justify-center transition-colors">
              {entry.imageUrl && entry.imageUrl.trim() !== '' ? (
                entry.mediaType === 'video' ? (
                  <video 
                    src={entry.imageUrl} 
                    controls 
                    className="w-full h-auto object-contain max-h-[70vh] bg-black" 
                  />
                ) : (
                  <img 
                    src={entry.imageUrl} 
                    alt={entry.title} 
                    className="w-full h-auto object-contain max-h-[70vh] bg-black"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/800/600?grayscale&blur=2';
                    }}
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <ImageOff size={64} className="mb-4" />
                  <span className="text-lg">暂无图片</span>
                </div>
              )}
            </div>

            {/* Params only for ComfyUI */}
            {showParams && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-[#161b22] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Steps (步数)</div>
                  <div className="font-mono text-lg font-bold text-primary-500 dark:text-primary-400">{entry.steps || '-'}</div>
                </div>
                <div className="bg-white dark:bg-[#161b22] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">CFG</div>
                  <div className="font-mono text-lg font-bold text-primary-500 dark:text-primary-400">{entry.cfgScale || '-'}</div>
                </div>
                <div className="bg-white dark:bg-[#161b22] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center overflow-hidden transition-colors">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Seed (种子)</div>
                  <div className="font-mono text-sm font-bold text-primary-500 dark:text-primary-400 truncate px-1" title={`${entry.seed}`}>
                    {entry.seed || '-'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Details & Prompts */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                 <span className={`inline-flex items-center gap-1 bg-slate-100 dark:bg-[#161b22] text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors ${logTypeConfig.color}`}>
                    <LogIcon size={10} />
                    {logTypeConfig.label}
                 </span>
                 <span className="inline-flex items-center gap-1 bg-primary-500/10 dark:bg-primary-900/50 text-primary-700 dark:text-primary-200 text-xs px-2 py-1 rounded-full border border-primary-200 dark:border-primary-800 transition-colors">
                    <Folder size={10} />
                    {entry.category || '未分类'}
                 </span>
                 {/* 可见性标签 */}
                 <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                   entry.isPublic 
                     ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                     : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                 }`}>
                    {entry.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                    {entry.isPublic ? '公开' : '私密'}
                 </span>
                 <button 
                   onClick={() => onViewUser(entry.userId)}
                   className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition-colors"
                 >
                    <User size={10} />
                    <Avatar avatar={entry.authorAvatar || ''} name={entry.authorName || '?'} size="xs" className="mr-1 w-3 h-3 text-[6px]" />
                    {entry.authorName || 'Unknown'}
                 </button>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3 leading-tight transition-colors">{entry.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{new Date(entry.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>{new Date(entry.createdAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
              
              {entry.tags.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-2">
                    {entry.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 transition-colors">
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                 </div>
              )}
            </div>

            {/* Resources (Conditional) */}
            {showResources && entry.resources.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  使用模型 / 资源
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 rounded-full transition-colors">{entry.resources.length}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {entry.resources.map((res, idx) => (
                    <ResourceTag key={idx} resource={res} />
                  ))}
                </div>
              </div>
            )}

            {/* Prompts (Conditional) */}
            {showPrompts && (
              <div className="space-y-4">
                <PromptBox label="正向提示词 (Positive)" text={entry.positivePrompt} type="positive" />
                <PromptBox label="反向提示词 (Negative)" text={entry.negativePrompt} type="negative" />
              </div>
            )}

             {/* Technical Details List (Conditional) */}
             {showParams && (entry.sampler || entry.scheduler) && (
              <div className="bg-white/50 dark:bg-[#161b22]/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 transition-colors">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-3">更多设置</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {entry.sampler && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">采样器 (Sampler)</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">{entry.sampler}</span>
                    </div>
                  )}
                  {entry.scheduler && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">调度器 (Scheduler)</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">{entry.scheduler}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-3">笔记</h3>
                <div className={`bg-white dark:bg-[#161b22] rounded-xl p-5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm md:text-base transition-colors ${entry.logType === 'coding' ? 'font-mono' : ''}`}>
                  {entry.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

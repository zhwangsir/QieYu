
import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, AlertTriangle, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { LogType } from '../types';
import { LOG_TYPES } from '../constants';
import * as dbService from '../services/dbService';

interface CategoryManagerProps {
  onClose: () => void;
  initialType?: LogType;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose, initialType = 'comfyui' }) => {
  const [selectedType, setSelectedType] = useState<LogType>(initialType);
  const [categories, setCategories] = useState<string[]>([]);

  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 确保 selectedType 有效
  useEffect(() => {
    if (!LOG_TYPES[selectedType]) {
      console.warn('Invalid selectedType, resetting to comfyui:', selectedType);
      setSelectedType('comfyui');
    }
  }, []);

  // Fetch categories when type changes
  useEffect(() => {
    if (LOG_TYPES[selectedType]) {
      refreshCategories();
      setConfirmDelete(null);
      setEditingCategory(null);
    }
  }, [selectedType]);

  const refreshCategories = async () => {
    setIsLoading(true);
    try {
      const cats = await dbService.getCategories(selectedType);
      // Sort: '未分类' first, then alphabetical
      const sorted = cats.sort((a, b) => {
         if (a === '未分类') return -1;
         if (b === '未分类') return 1;
         return a.localeCompare(b);
      });
      setCategories(sorted);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      setIsLoading(true);
      try {
        console.log('添加分类:', newCategory.trim(), '类型:', selectedType);
        await dbService.addCategory(newCategory.trim(), selectedType);
        setNewCategory('');
        await refreshCategories();
      } catch (error: any) {
        console.error('添加分类失败:', error);
        if (error.message?.includes('Duplicate entry')) {
          alert(`分类 "${newCategory.trim()}" 已存在，请勿重复添加`);
        } else {
          alert('添加分类失败: ' + (error.message || '未知错误'));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startEdit = (cat: string) => {
    console.log('开始编辑分类:', cat);
    setEditingCategory(cat);
    setEditValue(cat);
    setConfirmDelete(null);
  };

  const saveEdit = async () => {
    console.log('保存编辑:', editingCategory, '->', editValue);
    if (editingCategory && editValue.trim() && editValue.trim() !== editingCategory) {
      setIsLoading(true);
      try {
        await dbService.renameCategory(editingCategory, editValue.trim(), selectedType);
        await refreshCategories();
      } catch (error) {
        console.error('重命名分类失败:', error);
        alert('重命名分类失败，请重试');
      } finally {
        setIsLoading(false);
      }
    }
    setEditingCategory(null);
  };

  const handleDeleteClick = async (cat: string) => {
    console.log('删除按钮点击:', cat, '当前确认状态:', confirmDelete);
    if (confirmDelete === cat) {
      console.log('确认删除:', cat);
      setIsLoading(true);
      try {
        await dbService.deleteCategory(cat, selectedType);
        setConfirmDelete(null);
        await refreshCategories();
      } catch (error) {
        console.error('删除分类失败:', error);
        alert('删除分类失败，请重试');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('等待确认删除:', cat);
      setConfirmDelete(cat);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // 安全检查：确保 selectedType 存在于 LOG_TYPES 中
  console.log('CategoryManager render - selectedType:', selectedType, 'initialType:', initialType);
  console.log('LOG_TYPES keys:', Object.keys(LOG_TYPES));
  const typeConfig = LOG_TYPES[selectedType];
  if (!typeConfig) {
    console.error(`Invalid log type: ${selectedType}, type of selectedType: ${typeof selectedType}`);
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-[#161b22] rounded-2xl p-8 text-center">
          <p className="text-red-500 mb-4">无效的分类类型: {String(selectedType)}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }
  const TypeIcon = typeConfig.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(239, 68, 68, 0.5); }
          50% { border-color: rgba(239, 68, 68, 1); }
        }
        .animate-pulse-border {
          animation: pulse-border 1s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-slide-in">

        {/* Left Sidebar: Log Types */}
        <div className="w-1/3 min-w-[220px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/30">
           <div className="p-5 border-b border-slate-200 dark:border-slate-800">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
               <FolderOpen size={20} className="text-primary-500" />
               日志类型
             </h3>
             <p className="text-xs text-slate-500 mt-1.5">选择类型管理其子分类</p>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {(Object.keys(LOG_TYPES) as LogType[]).map(type => {
                 const config = LOG_TYPES[type];
                 const Icon = config.icon;
                 const isActive = selectedType === type;
                 return (
                   <button
                     key={type}
                     onClick={() => setSelectedType(type)}
                     className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                       isActive
                         ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                         : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                     }`}
                   >
                      <div className="flex items-center gap-3">
                         <Icon size={18} className={isActive ? 'text-white' : config.color} />
                         <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      {isActive && <ChevronRight size={16} />}
                   </button>
                 );
              })}
           </div>
        </div>

        {/* Right Content: Categories */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0d1117]/50">
           <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#161b22]">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${LOG_TYPES[selectedType].color}`}>
                  <TypeIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">{LOG_TYPES[selectedType].label}</h3>
                  <p className="text-xs text-slate-500">{categories.length} 个分类</p>
                </div>
             </div>
             <button
               onClick={onClose}
               className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all"
             >
               <X size={20} />
             </button>
           </div>

           <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
             <form onSubmit={handleAdd} className="flex gap-3">
               <div className="flex-1 relative">
                 <input
                   type="text"
                   value={newCategory}
                   onChange={(e) => setNewCategory(e.target.value)}
                   placeholder={`新建 "${LOG_TYPES[selectedType].label}" 分类...`}
                   className="w-full bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600"
                   disabled={isLoading}
                 />
               </div>
               <Button
                 type="submit"
                 icon={<Plus size={18} />}
                 disabled={!newCategory.trim() || isLoading}
                 className="px-5"
               >
                 添加
               </Button>
             </form>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
             {isLoading && categories.length === 0 ? (
               <div className="h-full flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {categories.map(cat => (
                   <div
                     key={cat}
                     className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                       confirmDelete === cat
                         ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700 animate-pulse-border'
                         : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                     }`}
                   >
                     {editingCategory === cat ? (
                       <div className="flex items-center gap-2 flex-1 animate-fade-in">
                         <Folder size={16} className="text-primary-500" />
                         <input
                           type="text"
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           className="flex-1 bg-white dark:bg-[#0d1117] border border-primary-500 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-white outline-none"
                           autoFocus
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') saveEdit();
                             if (e.key === 'Escape') setEditingCategory(null);
                           }}
                         />
                         <button
                           onClick={saveEdit}
                           disabled={isLoading}
                           className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                         >
                           <Check size={14} />
                         </button>
                         <button
                           onClick={() => setEditingCategory(null)}
                           className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                         >
                           <X size={14} />
                         </button>
                       </div>
                     ) : (
                       <>
                         <div className="flex items-center gap-3">
                            <Folder size={16} className={cat === '未分类' ? 'text-slate-400' : 'text-primary-500'} />
                            <span className={`text-sm font-medium ${confirmDelete === cat ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {cat}
                            </span>
                            {cat === '未分类' && (
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">默认</span>
                            )}
                         </div>

                         {cat !== '未分类' && (
                           <div className="flex gap-1 items-center">
                             {confirmDelete === cat ? (
                                <span className="text-xs text-red-500 mr-2 font-medium animate-pulse">确认删除?</span>
                             ) : null}

                             <button
                               onClick={(e) => { e.stopPropagation(); startEdit(cat); }}
                               className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                               title="重命名"
                               type="button"
                             >
                               <Pencil size={14} />
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleDeleteClick(cat); }}
                               className={`p-2 rounded-lg transition-all ${
                                 confirmDelete === cat
                                   ? 'text-white bg-red-500 hover:bg-red-600 animate-pulse'
                                   : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                               }`}
                               title="删除"
                               type="button"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         )}
                       </>
                     )}
                   </div>
                 ))}
               </div>
             )}

             {categories.length === 0 && !isLoading && (
               <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                 <FolderOpen size={48} className="mb-4 opacity-30" />
                 <p className="text-sm">暂无分类</p>
                 <p className="text-xs mt-1 opacity-60">在上方输入框添加新分类</p>
               </div>
             )}
           </div>

           <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <AlertTriangle size={14} />
               <span>删除分类会将该分类下的日志移动至 "未分类"</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

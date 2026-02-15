
import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { LogType } from '../types';
import { LOG_TYPES } from '../constants';
import * as dbService from '../services/dbService';

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState<LogType>('comfyui');
  const [categories, setCategories] = useState<string[]>([]);
  
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch categories when type changes
  useEffect(() => {
    refreshCategories();
    setConfirmDelete(null);
    setEditingCategory(null);
  }, [selectedType]);

  const refreshCategories = async () => {
    const cats = await dbService.getCategories(selectedType);
    // Sort: '未分类' first, then alphabetical
    const sorted = cats.sort((a, b) => {
       if (a === '未分类') return -1;
       if (b === '未分类') return 1;
       return a.localeCompare(b);
    });
    setCategories(sorted);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      await dbService.addCategory(newCategory.trim(), selectedType);
      setNewCategory('');
      refreshCategories();
    }
  };

  const startEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
    setConfirmDelete(null);
  };

  const saveEdit = async () => {
    if (editingCategory && editValue.trim() && editValue.trim() !== editingCategory) {
      await dbService.renameCategory(editingCategory, editValue.trim(), selectedType);
      refreshCategories();
    }
    setEditingCategory(null);
  };

  const handleDeleteClick = async (cat: string) => {
    if (confirmDelete === cat) {
      await dbService.deleteCategory(cat, selectedType);
      setConfirmDelete(null);
      refreshCategories();
    } else {
      setConfirmDelete(cat);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const TypeIcon = LOG_TYPES[selectedType].icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-scale-in">
        
        {/* Left Sidebar: Log Types */}
        <div className="w-1/3 min-w-[200px] border-r border-slate-800 flex flex-col bg-slate-900/50">
           <div className="p-4 border-b border-slate-800">
             <h3 className="font-bold text-white text-lg">类型选择</h3>
             <p className="text-xs text-slate-500 mt-1">选择一个大类来管理其子分类</p>
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
                     className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                       isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
        <div className="flex-1 flex flex-col bg-slate-950/30">
           <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
             <div className="flex items-center gap-2">
                <TypeIcon className={LOG_TYPES[selectedType].color} size={20} />
                <h3 className="font-bold text-white text-lg">{LOG_TYPES[selectedType].label} <span className="text-slate-500">/ 分类管理</span></h3>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
           </div>

           <div className="p-4 border-b border-slate-800 bg-slate-900/50">
             <form onSubmit={handleAdd} className="flex gap-2">
               <input
                 type="text"
                 value={newCategory}
                 onChange={(e) => setNewCategory(e.target.value)}
                 placeholder={`在 "${LOG_TYPES[selectedType].label}" 下新建分类...`}
                 className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary-500 outline-none transition-all placeholder-slate-600"
               />
               <Button type="submit" icon={<Plus size={16} />}>添加</Button>
             </form>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {categories.map(cat => (
                 <div key={cat} className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${confirmDelete === cat ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                   {editingCategory === cat ? (
                     <div className="flex items-center gap-2 flex-1 animate-fade-in">
                       <input
                         type="text"
                         value={editValue}
                         onChange={(e) => setEditValue(e.target.value)}
                         className="flex-1 bg-slate-950 border border-primary-500 rounded px-2 py-1 text-sm text-white outline-none"
                         autoFocus
                         onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                       />
                       <button onClick={saveEdit} className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500 hover:text-white"><Check size={14} /></button>
                       <button onClick={() => setEditingCategory(null)} className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"><X size={14} /></button>
                     </div>
                   ) : (
                     <>
                       <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${cat === '未分类' ? 'bg-slate-600' : 'bg-primary-500'}`}></div>
                          <span className={`text-sm font-medium ${confirmDelete === cat ? 'text-red-400' : 'text-slate-200'}`}>{cat}</span>
                       </div>
                       
                       {cat !== '未分类' && (
                         <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                           {confirmDelete === cat ? (
                              <span className="text-[10px] text-red-400 mr-2 animate-pulse">确认删除?</span>
                           ) : null}
                           
                           <button onClick={() => startEdit(cat)} className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-slate-800 rounded transition-colors" title="重命名"><Pencil size={14} /></button>
                           <button 
                             onClick={() => handleDeleteClick(cat)} 
                             className={`p-1.5 rounded transition-colors ${confirmDelete === cat ? 'text-red-400 bg-red-900/30' : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'}`}
                             title="删除"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                       )}
                       {cat === '未分类' && <span className="text-[10px] text-slate-600 italic px-2">系统默认</span>}
                     </>
                   )}
                 </div>
               ))}
             </div>
             
             {categories.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-slate-500">
                 <p>暂无分类</p>
               </div>
             )}
           </div>
           
           <div className="p-3 border-t border-slate-800 bg-slate-900/30 text-xs text-slate-500 text-center">
             删除分类会将该分类下的日志移动至 "未分类"
           </div>
        </div>
      </div>
    </div>
  );
};

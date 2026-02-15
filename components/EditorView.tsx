
import React, { useState, useEffect } from 'react';
import { LogEntry, AIResource, ResourceType, LogType } from '../types';
import { RESOURCE_TYPES, LOG_TYPES, getResourceTypesByLogType, getDefaultResourceType } from '../constants';
import * as dbService from '../services/dbService';
import { Button } from './Button';
import { 
  ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, Video, X, Globe, Lock,
  Code, BookOpen, Coffee, Gamepad2, Wrench, Lightbulb, FileText, Hash, Layers
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface EditorViewProps {
  initialData?: LogEntry | null;
  onSave: (entry: LogEntry) => void;
  onCancel: () => void;
  categories: string[];
}

// 各类型专用字段配置
interface TypeSpecificFields {
  showPrompts: boolean;
  showParams: boolean;
  showResources: boolean;
  showCode: boolean;
  showTechStack: boolean;
  showDifficulty: boolean;
  showProgress: boolean;
  showRating: boolean;
  placeholder: {
    title: string;
    notes: string;
  };
  labels: {
    resources: string;
    notes: string;
    media: string;
  };
}

const getTypeConfig = (type: LogType): TypeSpecificFields => {
  const configs: Record<LogType, TypeSpecificFields> = {
    comfyui: {
      showPrompts: true,
      showParams: true,
      showResources: true,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入作品标题...",
        notes: "记录工作流思路、参数调整心得、生成过程中的问题和解决方案..."
      },
      labels: {
        resources: "模型与资源",
        notes: "工作流笔记",
        media: "生成结果"
      }
    },
    midjourney: {
      showPrompts: true,
      showParams: true,
      showResources: false,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入作品标题...",
        notes: "记录创作思路、风格探索、参数调整经验..."
      },
      labels: {
        resources: "参考资源",
        notes: "创作笔记",
        media: "生成结果"
      }
    },
    fooocus: {
      showPrompts: true,
      showParams: true,
      showResources: true,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入作品标题...",
        notes: "记录生成参数、风格调整、优化技巧..."
      },
      labels: {
        resources: "模型与样式",
        notes: "生成笔记",
        media: "生成结果"
      }
    },
    webui: {
      showPrompts: true,
      showParams: true,
      showResources: true,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入作品标题...",
        notes: "记录WebUI配置、插件使用、生成技巧..."
      },
      labels: {
        resources: "模型与插件",
        notes: "配置笔记",
        media: "生成结果"
      }
    },
    modeling: {
      showPrompts: false,
      showParams: false,
      showResources: true,
      showCode: false,
      showTechStack: false,
      showDifficulty: true,
      showProgress: true,
      showRating: false,
      placeholder: {
        title: "输入模型/作品名称...",
        notes: "记录建模过程、技术难点、材质设置、渲染参数..."
      },
      labels: {
        resources: "使用工具与插件",
        notes: "建模笔记",
        media: "作品截图"
      }
    },
    editing: {
      showPrompts: false,
      showParams: false,
      showResources: true,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入项目名称...",
        notes: "记录剪辑思路、特效制作、调色参数、导出设置..."
      },
      labels: {
        resources: "使用软件与素材",
        notes: "剪辑笔记",
        media: "项目截图"
      }
    },
    coding: {
      showPrompts: false,
      showParams: false,
      showResources: false,
      showCode: true,
      showTechStack: true,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入项目/功能名称...",
        notes: "描述功能需求、实现思路、遇到的问题和解决方案..."
      },
      labels: {
        resources: "依赖库",
        notes: "代码说明",
        media: "运行截图"
      }
    },
    general: {
      showPrompts: false,
      showParams: false,
      showResources: false,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: false,
      placeholder: {
        title: "输入标题...",
        notes: "记录学习内容、心得体会、关键知识点..."
      },
      labels: {
        resources: "参考资料",
        notes: "学习笔记",
        media: "相关图片"
      }
    },
    life: {
      showPrompts: false,
      showParams: false,
      showResources: false,
      showCode: false,
      showTechStack: false,
      showDifficulty: false,
      showProgress: false,
      showRating: true,
      placeholder: {
        title: "今天发生了什么？",
        notes: "记录此刻的心情、感受、想法..."
      },
      labels: {
        resources: "相关物品",
        notes: "心情日记",
        media: "照片"
      }
    },
    gaming: {
      showPrompts: false,
      showParams: false,
      showResources: false,
      showCode: false,
      showTechStack: false,
      showDifficulty: true,
      showProgress: true,
      showRating: true,
      placeholder: {
        title: "游戏名称 / 关卡...",
        notes: "记录游戏体验、攻略要点、心得感受..."
      },
      labels: {
        resources: "游戏平台",
        notes: "游戏笔记",
        media: "游戏截图"
      }
    }
  };
  return configs[type] || configs.general;
};

export const EditorView: React.FC<EditorViewProps> = ({ initialData, onSave, onCancel }) => {
  const [step, setStep] = useState<'type-select' | 'edit'>(initialData ? 'edit' : 'type-select');
  
  const [formData, setFormData] = useState<Partial<LogEntry>>({
    title: '',
    category: '未分类',
    mediaType: 'image',
    imageUrl: '',
    positivePrompt: '',
    negativePrompt: '',
    resources: [],
    notes: '',
    steps: 20,
    cfgScale: 7,
    seed: -1,
    tags: [],
    isPublic: true,
    logType: 'comfyui',
    // 新增字段
    codeSnippet: '',
    techStack: [],
    difficulty: 'medium',
    progress: 0,
    rating: 5
  });

  const [tagInput, setTagInput] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (initialData) {
        setFormData({
          ...formData,
          ...initialData,
          techStack: initialData.techStack || [],
          difficulty: initialData.difficulty || 'medium',
          progress: initialData.progress || 0,
          rating: initialData.rating || 5
        });
        setStep('edit');
        const cats = await dbService.getCategories(initialData.logType);
        setAvailableCategories(cats);
        if (initialData.category && !cats.includes(initialData.category)) {
          setIsCustomCategory(true);
          setCustomCategory(initialData.category);
        }
      }
    };
    loadData();
  }, [initialData]);

  useEffect(() => {
    const loadCats = async () => {
      if (!initialData && formData.logType) {
        const cats = await dbService.getCategories(formData.logType);
        setAvailableCategories(cats);
        if (!cats.includes(formData.category || '')) {
          handleChange('category', cats.includes('未分类') ? '未分类' : cats[0] || '');
        }
      }
    };
    loadCats();
  }, [formData.logType, initialData]);

  const handleChange = (field: keyof LogEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectType = (type: LogType) => {
    handleChange('logType', type);
    setStep('edit');
  };

  const handleBackToTypeSelect = () => {
    setStep('type-select');
  };

  const handleResourceChange = (index: number, field: keyof AIResource, value: any) => {
    const newResources = [...(formData.resources || [])];
    newResources[index] = { ...newResources[index], [field]: value };
    handleChange('resources', newResources);
  };

  const addResource = () => {
    const defaultType = getDefaultResourceType(formData.logType as LogType);
    const newRes: AIResource = { id: uuidv4(), name: '', type: defaultType as ResourceType };
    handleChange('resources', [...(formData.resources || []), newRes]);
  };

  const removeResource = (index: number) => {
    const newResources = [...(formData.resources || [])];
    newResources.splice(index, 1);
    handleChange('resources', newResources);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !formData.tags?.includes(tag)) {
        handleChange('tags', [...(formData.tags || []), tag]);
        setTagInput('');
      }
    }
  };

  const handleTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tech = techInput.trim();
      if (tech && !formData.techStack?.includes(tech)) {
        handleChange('techStack', [...(formData.techStack || []), tech]);
        setTechInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags?.filter(t => t !== tagToRemove) || []);
  };

  const removeTech = (techToRemove: string) => {
    handleChange('techStack', formData.techStack?.filter(t => t !== techToRemove) || []);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustomCategory(true);
      setCustomCategory('');
      handleChange('category', '');
    } else {
      setIsCustomCategory(false);
      handleChange('category', value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert('请填写标题');
    
    const finalCategory = isCustomCategory ? (customCategory || '未分类') : (formData.category || '未分类');

    const entry: LogEntry = {
      id: initialData?.id || uuidv4(),
      userId: initialData?.userId || '',
      createdAt: initialData?.createdAt || '',
      updatedAt: '',
      logType: (formData.logType as LogType) || 'comfyui',
      title: formData.title!,
      category: finalCategory,
      imageUrl: formData.imageUrl || '',
      mediaType: formData.mediaType || 'image',
      positivePrompt: formData.positivePrompt || '',
      negativePrompt: formData.negativePrompt || '',
      resources: formData.resources || [],
      notes: formData.notes || '',
      tags: formData.tags || [],
      steps: formData.steps,
      cfgScale: formData.cfgScale,
      seed: formData.seed,
      sampler: formData.sampler,
      scheduler: formData.scheduler,
      isPublic: formData.isPublic ?? true,
      codeSnippet: formData.codeSnippet,
      techStack: formData.techStack,
      difficulty: formData.difficulty,
      progress: formData.progress,
      rating: formData.rating
    };
    
    onSave(entry);
  };

  // 类型选择界面
  if (step === 'type-select') {
    return (
      <div className="h-full bg-[#f5f5f7] dark:bg-[#0d1117] overflow-y-auto custom-scrollbar p-6 animate-fade-in">
        <div className="max-w-5xl mx-auto pt-10">
          <button onClick={onCancel} className="mb-6 flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={20} className="mr-2"/> 返回
          </button>
          
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">你想记录什么？</h1>
            <p className="text-slate-500 dark:text-slate-400">选择一个日志类型，开始你的记录之旅</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(Object.keys(LOG_TYPES) as LogType[]).map((type) => {
              const config = LOG_TYPES[type];
              const Icon = config.icon;
              return (
                <div 
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="group bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-800 hover:border-primary-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#0d1117] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${config.color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                    <Icon size={32} className={config.color} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{config.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">{config.desc}</p>
                  <div className="absolute inset-0 border-2 border-primary-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const logTypeConfig = LOG_TYPES[formData.logType as LogType] || LOG_TYPES['comfyui'];
  const typeSpecific = getTypeConfig(formData.logType as LogType);
  const LogIcon = logTypeConfig.icon;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#0d1117] overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#161b22]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <Button type="button" variant="ghost" onClick={handleBackToTypeSelect} icon={<ArrowLeft size={18} />}>
            <span className="hidden sm:inline">返回</span>
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-[#0d1117] rounded-full border border-slate-200 dark:border-slate-700">
            <LogIcon size={16} className={logTypeConfig.color} />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{logTypeConfig.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0d1117] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleChange('isPublic', true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                formData.isPublic 
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Globe size={14}/> 公开
            </button>
            <button
              type="button"
              onClick={() => handleChange('isPublic', false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                !formData.isPublic 
                  ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-md' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Lock size={14}/> 私密
            </button>
          </div>
          <Button type="submit" variant="primary" icon={<Save size={18} />}>
            <span className="hidden sm:inline">保存日志</span>
            <span className="sm:hidden">保存</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-10 pb-20">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* 标题和分类 */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600"
                    placeholder={typeSpecific.placeholder.title}
                    autoFocus
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    分类 <span className="text-xs font-normal text-slate-500">({logTypeConfig.label})</span>
                  </label>
                  <div className="flex gap-2">
                    {!isCustomCategory ? (
                      <select 
                        value={formData.category} 
                        onChange={handleCategorySelect}
                        className="w-full bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-800 dark:text-white focus:border-primary-500 outline-none appearance-none"
                      >
                        <option value="未分类">未分类</option>
                        {availableCategories.filter(c => c !== '未分类').map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="custom" className="text-primary-500 font-bold">+ 自定义分类...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <input 
                          type="text" 
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="输入新分类名称"
                          className="w-full bg-white dark:bg-[#161b22] border border-primary-500 rounded-lg px-3 py-2.5 text-slate-800 dark:text-white outline-none"
                          autoFocus
                        />
                        <button 
                          type="button" 
                          onClick={() => setIsCustomCategory(false)}
                          className="px-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <X size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 技术栈（编程专用） */}
              {typeSpecific.showTechStack && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Layers size={16} /> 技术栈
                  </label>
                  <div className="bg-white dark:bg-[#161b22] border border-blue-200 dark:border-blue-800/30 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2 mb-2">
                    {formData.techStack?.map(tech => (
                      <span key={tech} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-xs px-2 py-1 rounded-md flex items-center gap-1">
                        {tech}
                        <button type="button" onClick={() => removeTech(tech)} className="hover:text-blue-900 dark:hover:text-white"><X size={12}/></button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={techInput}
                      onChange={e => setTechInput(e.target.value)}
                      onKeyDown={handleTechKeyDown}
                      className="bg-transparent outline-none text-sm min-w-[80px] flex-1 text-slate-700 dark:text-slate-300 placeholder-slate-500"
                      placeholder="输入技术栈（如 React, Node.js）..."
                    />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">输入后按回车或逗号添加</p>
                </div>
              )}

              {/* 难度和进度（3D建模/游戏专用） */}
              {(typeSpecific.showDifficulty || typeSpecific.showProgress) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {typeSpecific.showDifficulty && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
                      <label className="block text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">难度等级</label>
                      <div className="flex gap-2">
                        {['easy', 'medium', 'hard'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => handleChange('difficulty', level)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.difficulty === level
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-white dark:bg-[#161b22] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                            }`}
                          >
                            {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {typeSpecific.showProgress && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
                      <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                        完成进度: {formData.progress}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.progress}
                        onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                        className="w-full h-2 bg-emerald-200 dark:bg-emerald-800/50 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 评分（生活/游戏专用） */}
              {typeSpecific.showRating && (
                <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800/50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-pink-700 dark:text-pink-400 mb-2">评分</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleChange('rating', star)}
                        className={`w-10 h-10 rounded-lg text-xl transition-all ${
                          star <= (formData.rating || 0)
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-white dark:bg-[#161b22] text-pink-300 dark:text-pink-700 border border-pink-200 dark:border-pink-800/50 hover:bg-pink-100 dark:hover:bg-pink-900/20'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 媒体上传 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {typeSpecific.labels.media}
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleChange('mediaType', 'image')}
                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${formData.mediaType === 'image' ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400' : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <ImageIcon size={16} /> 图片
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('mediaType', 'video')}
                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${formData.mediaType === 'video' ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400' : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Video size={16} /> 视频
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => handleChange('imageUrl', e.target.value)}
                      className="flex-1 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-300 focus:border-primary-500 outline-none placeholder-slate-400 dark:placeholder-slate-600"
                      placeholder={formData.mediaType === 'image' ? "粘贴图片链接" : "粘贴视频链接"}
                    />
                    {formData.mediaType === 'image' && (
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg flex items-center justify-center text-sm transition-colors shrink-0">
                        <span className="text-slate-700 dark:text-slate-300">上传文件</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            
              {/* Prompts（AI绘图专用） */}
              {typeSpecific.showPrompts && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
                    <label className="block text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <Lightbulb size={16} /> 正向提示词 (Prompt)
                    </label>
                    <textarea
                      value={formData.positivePrompt}
                      onChange={(e) => handleChange('positivePrompt', e.target.value)}
                      rows={4}
                      className="w-full bg-white dark:bg-[#161b22] border border-green-200 dark:border-green-900/30 rounded-lg px-4 py-2 text-sm font-mono text-slate-700 dark:text-slate-300 focus:border-green-500 outline-none custom-scrollbar placeholder-slate-400"
                      placeholder="描述你想要生成的内容..."
                    />
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                    <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                      <X size={16} /> 反向提示词 (Negative Prompt)
                    </label>
                    <textarea
                      value={formData.negativePrompt}
                      onChange={(e) => handleChange('negativePrompt', e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-[#161b22] border border-red-200 dark:border-red-900/30 rounded-lg px-4 py-2 text-sm font-mono text-slate-700 dark:text-slate-300 focus:border-red-500 outline-none custom-scrollbar placeholder-slate-400"
                      placeholder="描述你不想要的内容..."
                    />
                  </div>
                </div>
              )}

              {/* 代码片段（编程专用） */}
              {typeSpecific.showCode && (
                <div className="bg-slate-900 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <Code size={16} /> 代码片段
                    </span>
                  </div>
                  <textarea
                    value={formData.codeSnippet}
                    onChange={(e) => handleChange('codeSnippet', e.target.value)}
                    rows={10}
                    className="w-full bg-slate-900 text-slate-100 px-4 py-3 text-sm font-mono outline-none custom-scrollbar placeholder-slate-600"
                    placeholder="// 粘贴代码片段..."
                  />
                </div>
              )}

              {/* 笔记 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {typeSpecific.labels.notes}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={typeSpecific.showCode ? 4 : 8}
                  className="w-full bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-slate-300 focus:border-primary-500 outline-none custom-scrollbar placeholder-slate-400"
                  placeholder={typeSpecific.placeholder.notes}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Preview */}
              <div className="aspect-square bg-slate-100 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative">
                {formData.imageUrl && formData.imageUrl.trim() !== '' ? (
                  formData.mediaType === 'video' ? (
                    <video src={formData.imageUrl} className="w-full h-full object-contain" controls />
                  ) : (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  )
                ) : (
                  <div className="text-slate-400 dark:text-slate-600 text-sm text-center px-4">
                    <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
                    <span>预览区域</span>
                  </div>
                )}
              </div>

              {/* AI参数（AI绘图专用） */}
              {typeSpecific.showParams && (
                <div className="bg-white dark:bg-[#161b22] rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Wrench size={14} /> 生成参数
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">采样步数 (Steps)</label>
                      <input 
                        type="number" 
                        value={formData.steps} 
                        onChange={e => handleChange('steps', parseInt(e.target.value))} 
                        className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-300 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">CFG Scale</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={formData.cfgScale} 
                        onChange={e => handleChange('cfgScale', parseFloat(e.target.value))} 
                        className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-300 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">随机种子 (Seed)</label>
                      <input 
                        type="text" 
                        value={formData.seed} 
                        onChange={e => handleChange('seed', e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-300 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                  <Hash size={14} /> 标签
                </label>
                <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2">
                  {formData.tags?.map(tag => (
                    <span key={tag} className="bg-primary-500/10 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-800/50 text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-900 dark:hover:text-white"><X size={12}/></button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="bg-transparent outline-none text-sm min-w-[80px] flex-1 text-slate-700 dark:text-slate-300 placeholder-slate-500"
                    placeholder="输入标签..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resources Section */}
          {typeSpecific.showResources && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {typeSpecific.labels.resources}
                </h3>
                <Button type="button" size="sm" variant="secondary" onClick={addResource} icon={<Plus size={14} />}>添加</Button>
              </div>
              
              <div className="space-y-2">
                {formData.resources?.length === 0 && (
                  <div className="text-slate-500 dark:text-slate-600 text-sm italic p-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center bg-slate-50 dark:bg-[#161b22]/30">
                    点击上方按钮添加{typeSpecific.labels.resources}
                  </div>
                )}
                {formData.resources?.map((res, idx) => {
                  const resourceTypes = getResourceTypesByLogType(formData.logType as LogType);
                  const isAIType = ['comfyui', 'midjourney', 'fooocus', 'webui'].includes(formData.logType as string);
                  
                  return (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 bg-slate-50 dark:bg-[#161b22]/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 items-start md:items-center">
                      <select 
                        value={res.type}
                        onChange={(e) => handleResourceChange(idx, 'type', e.target.value)}
                        className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500 w-full md:w-36"
                      >
                        {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      
                      <input 
                        type="text"
                        value={res.name}
                        onChange={(e) => handleResourceChange(idx, 'name', e.target.value)}
                        placeholder={isAIType ? "模型名称" : "名称/版本"}
                        className="flex-1 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500 w-full"
                      />

                      {/* 只有AI类型的Lora才显示权重 */}
                      {isAIType && res.type === 'Lora' && (
                        <div className="flex items-center gap-1 w-full md:w-auto">
                          <span className="text-xs text-slate-500 shrink-0">权重:</span>
                          <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            max="2"
                            value={res.weight || 1.0}
                            onChange={(e) => handleResourceChange(idx, 'weight', parseFloat(e.target.value))}
                            className="w-full md:w-20 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:border-primary-500 outline-none"
                          />
                        </div>
                      )}

                      <button 
                        type="button" 
                        onClick={() => removeResource(idx)}
                        className="text-slate-500 hover:text-red-500 p-2 md:p-1.5 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </form>
  );
};

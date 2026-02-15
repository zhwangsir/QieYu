
import { AIResource, LogEntry, LogType } from './types';
import { Cpu, Code, Box, Film, BookOpen, Coffee, Gamepad2, Sparkles, Zap, Image } from 'lucide-react';

export const APP_STORAGE_KEY = 'qieyu_data_v1';

export const DEFAULT_RESOURCE: AIResource = {
  id: '',
  name: '',
  type: 'Checkpoint',
  weight: 1.0,
};

// AI 绘图资源类型
export const AI_RESOURCE_TYPES = ['Checkpoint', 'Lora', 'Embedding', 'VAE', 'ControlNet', 'Other'];

// 3D建模资源类型
export const MODELING_RESOURCE_TYPES = ['Blender插件', '材质预设', '模型资产', '渲染引擎', '脚本工具', '其他'];

// 视频剪辑资源类型
export const EDITING_RESOURCE_TYPES = ['PR插件', 'AE插件', '转场预设', '调色LUT', '音效库', '字体', '其他'];

// 通用资源类型
export const GENERAL_RESOURCE_TYPES = ['工具', '插件', '素材', '参考', '其他'];

// 向后兼容
export const RESOURCE_TYPES = AI_RESOURCE_TYPES;

// 根据日志类型获取对应的资源类型列表
export const getResourceTypesByLogType = (logType: LogType): string[] => {
  switch (logType) {
    case 'comfyui':
    case 'midjourney':
    case 'fooocus':
    case 'webui':
      return AI_RESOURCE_TYPES;
    case 'modeling':
      return MODELING_RESOURCE_TYPES;
    case 'editing':
      return EDITING_RESOURCE_TYPES;
    case 'coding':
    case 'general':
    case 'life':
    case 'gaming':
      return GENERAL_RESOURCE_TYPES;
    default:
      return GENERAL_RESOURCE_TYPES;
  }
};

// 根据日志类型获取默认资源类型
export const getDefaultResourceType = (logType: LogType): string => {
  const types = getResourceTypesByLogType(logType);
  return types[0] || '其他';
};

// Configuration for the 10 Log Types
export const LOG_TYPES: Record<LogType, { label: string; icon: any; color: string; desc: string; defaultCategories: string[] }> = {
  comfyui: {
    label: 'ComfyUI 学习',
    icon: Cpu,
    color: 'text-purple-400',
    desc: '记录工作流、提示词、模型参数与生成效果',
    defaultCategories: ['人物', '二次元', '场景', '写实', '工作流', 'LoRA训练']
  },
  midjourney: {
    label: 'Midjourney',
    icon: Sparkles,
    color: 'text-indigo-400',
    desc: '记录Midjourney提示词、参数设置与生成效果',
    defaultCategories: ['人像', '插画', '概念艺术', '摄影', '抽象', '商业']
  },
  fooocus: {
    label: 'Fooocus',
    icon: Zap,
    color: 'text-cyan-400',
    desc: '记录Fooocus生成参数、风格设置与图像优化',
    defaultCategories: ['人像', '风景', '艺术', '产品', '设计', '实验']
  },
  webui: {
    label: 'WebUI',
    icon: Image,
    color: 'text-violet-400',
    desc: '记录Stable Diffusion WebUI提示词与生成参数',
    defaultCategories: ['人物', '二次元', '写实', '艺术', '设计', '动画']
  },
  coding: {
    label: '编程开发',
    icon: Code,
    color: 'text-blue-400',
    desc: '记录代码片段、Bug修复、技术栈学习心得',
    defaultCategories: ['前端', '后端', '算法', '架构', 'Debug', '学习笔记']
  },
  modeling: {
    label: '3D 建模',
    icon: Box,
    color: 'text-orange-400',
    desc: 'Blender/Maya 建模过程、材质节点与渲染设置',
    defaultCategories: ['角色', '场景', '硬表面', '材质', '动画', '渲染']
  },
  editing: {
    label: '视频剪辑',
    icon: Film,
    color: 'text-pink-400',
    desc: 'AE/PR 剪辑技巧、特效合成与分镜设计',
    defaultCategories: ['剪辑', '特效', '调色', '转场', '音效', '脚本']
  },
  general: {
    label: '通用学习',
    icon: BookOpen,
    color: 'text-emerald-400',
    desc: '读书笔记、思维导图、外语学习或其他技能',
    defaultCategories: ['阅读', '英语', '写作', '思维模型', '效率']
  },
  life: {
    label: '好好爱生活',
    icon: Coffee,
    color: 'text-yellow-400',
    desc: '日常碎片、美食探店、旅行日记与心情随笔',
    defaultCategories: ['日记', '美食', '旅行', '随笔', '运动', '种草']
  },
  gaming: {
    label: '打游戏吧',
    icon: Gamepad2,
    color: 'text-red-400',
    desc: '游戏通关截图、攻略心得、高光时刻记录',
    defaultCategories: ['3A大作', '独立游戏', '电竞', '攻略', '截图', '吐槽']
  }
};

export const DEFAULT_CATEGORIES = ['未分类']; // Fallback

export const SAMPLE_ENTRY: LogEntry = {
  id: 'sample-1',
  userId: 'sample-user',
  logType: 'comfyui',
  title: '赛博朋克霓虹人像研究',
  category: '人物',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  imageUrl: 'https://picsum.photos/seed/cyberpunk/800/1000',
  mediaType: 'image',
  positivePrompt: 'best quality, masterpiece, 1girl, cyberpunk city background, neon lights, rain, leather jacket, glowing eyes, detailed face, 8k resolution, cinematic lighting',
  negativePrompt: 'low quality, worst quality, bad anatomy, bad hands, text, watermark, signature, blurry, deformed',
  resources: [
    { id: 'r1', name: 'Juggernaut XL', type: 'Checkpoint' },
    { id: 'r2', name: 'Neon Style', type: 'Lora', weight: 0.8 }
  ],
  steps: 30,
  cfgScale: 7.0,
  sampler: 'dpmpp_2m',
  scheduler: 'karras',
  seed: 123456789,
  notes: '使用了高对比度的光照设置。注意 Neon Lora 的权重最好保持在 0.9 以下，否则容易产生噪点。\n\n学习重点：\n1. 轮廓光的运用\n2. 皮肤质感的保留',
  tags: ['赛博朋克', '人像', 'SDXL'],
  isPublic: true
};


// AI 绘图资源类型
export type AIResourceType = 'Checkpoint' | 'Lora' | 'Embedding' | 'VAE' | 'ControlNet' | 'Other';

// 3D建模资源类型
export type ModelingResourceType = 'Blender插件' | '材质预设' | '模型资产' | '渲染引擎' | '脚本工具' | '其他';

// 视频剪辑资源类型
export type EditingResourceType = 'PR插件' | 'AE插件' | '转场预设' | '调色LUT' | '音效库' | '字体' | '其他';

// 通用资源类型
export type GeneralResourceType = '工具' | '插件' | '素材' | '参考' | '其他';

// 所有资源类型的联合类型
export type ResourceType = AIResourceType | ModelingResourceType | EditingResourceType | GeneralResourceType;

// Defined Log Types
export type LogType = 'comfyui' | 'midjourney' | 'fooocus' | 'webui' | 'coding' | 'modeling' | 'editing' | 'general' | 'life' | 'gaming';

// Difficulty level for learning tasks
export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface User {
  id: string;
  username: string;
  password?: string;
  avatar: string;
  bio?: string;
  coverImage?: string; // 个人主页背景图
  createdAt: string;
  role?: 'user' | 'admin' | 'editor'; // Expanded roles
  status?: 'active' | 'banned';
  
  // Social & Customization
  friends?: string[]; 
  theme?: string; 
  themeMode?: 'light' | 'dark'; 
  chatBackground?: string; 
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'system' | 'friend_accept';
  title: string;
  content: string;
  data?: any; // Related ID etc
  read: boolean;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  userId: string;
  username: string;
  action: string; 
  module: string; // e.g., 'AUTH', 'USER', 'CONTENT'
  details: string;
  ip: string; 
  status: 'success' | 'fail';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'alert';
  createdAt: string;
  active: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalEntries: number;
  totalResources: number;
  recentUsers: User[];
  storageUsed: number;
  storageLimit: number;
  announcements?: Announcement[];
}

export interface AIResource {
  id: string;
  name: string;
  type: ResourceType;
  weight?: number; 
}

export interface LogEntry {
  id: string;
  userId: string; 
  authorName?: string; 
  authorAvatar?: string; 
  logType: LogType; 
  title: string;
  category: string; 
  createdAt: string; 
  updatedAt: string;
  isPublic: boolean; 
  
  // Media
  imageUrl: string; 
  mediaType: 'image' | 'video';
  
  // ComfyUI / AI Specific
  positivePrompt: string;
  negativePrompt: string;
  resources: AIResource[];
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number | string;
  
  // General
  notes: string;
  tags: string[];

  // Coding Specific
  codeSnippet?: string;
  techStack?: string[];

  // Learning & Gaming Progress
  difficulty?: DifficultyLevel;
  progress?: number; // 0-100
  rating?: number; // 1-10

  // Social
  likeCount?: number;
  isLiked?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  recipientId?: string; 
  content: string; 
  type: 'text' | 'image' | 'video' | 'audio' | 'entry_share';
  relatedEntryId?: string; 
  createdAt: string;
}

export type ViewState = 'AUTH' | 'LIBRARY' | 'CHAT' | 'AI_CHAT' | 'CREATE' | 'EDIT' | 'DETAILS' | 'PROFILE' | 'SETTINGS' | 'ADMIN';

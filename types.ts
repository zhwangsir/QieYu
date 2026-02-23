export type AIResourceType = 'Checkpoint' | 'Lora' | 'Embedding' | 'VAE' | 'ControlNet' | 'Other';

export type ModelingResourceType = 'Blender插件' | '材质预设' | '模型资产' | '渲染引擎' | '脚本工具' | '其他';

export type EditingResourceType = 'PR插件' | 'AE插件' | '转场预设' | '调色LUT' | '音效库' | '字体' | '其他';

export type GeneralResourceType = '工具' | '插件' | '素材' | '参考' | '其他';

export type ResourceType = AIResourceType | ModelingResourceType | EditingResourceType | GeneralResourceType;

export type LogType = 'comfyui' | 'midjourney' | 'fooocus' | 'webui' | 'coding' | 'modeling' | 'editing' | 'general' | 'life' | 'gaming';

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface User {
  id: string;
  username: string;
  password?: string;
  avatar: string;
  bio?: string;
  coverImage?: string;
  createdAt: string;
  role?: 'user' | 'admin' | 'editor';
  status?: 'active' | 'banned';
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
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
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
  imageUrl: string;
  mediaType: 'image' | 'video';
  positivePrompt: string;
  negativePrompt: string;
  resources: AIResource[];
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number | string;
  notes: string;
  tags: string[];
  codeSnippet?: string;
  techStack?: string[];
  difficulty?: DifficultyLevel;
  progress?: number;
  rating?: number;
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

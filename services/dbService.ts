
import { LogEntry, User, ChatMessage, LogType, SystemLog, AdminStats, Announcement, FriendRequest, Notification } from '../types';

// API Configuration
const API_URL = 'http://localhost:8000/api'; // Or relative '/api' if proxy configured

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  } : { 'Content-Type': 'application/json' };
};

// --- Error Handler ---
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  // 处理 204 No Content 响应
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null;
  }
  return res.json();
};

export const initDB = async (): Promise<void> => {
  // Check health or verify token
  console.log("Connected to Backend API");
};

// --- Auth ---

export const registerUser = async (username: string, password: string): Promise<User> => {
  const data = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(handleResponse);
  
  localStorage.setItem('access_token', data.access);
  return getUserProfile();
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const data = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(handleResponse);
  
  localStorage.setItem('access_token', data.access);
  return getUserProfile();
};

export const getUserProfile = async (): Promise<User> => {
  return fetch(`${API_URL}/users/profile`, { headers: getAuthHeaders() }).then(handleResponse);
};

/**
 * 获取指定用户的公开资料
 * @param userId 用户ID
 * @returns 用户公开资料
 */
export const getUserById = async (userId: string): Promise<User> => {
  return fetch(`${API_URL}/users/${userId}/profile`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
  return fetch(`${API_URL}/users/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  }).then(handleResponse);
};

// --- File Upload ---

/**
 * 上传文件到服务器
 * @param base64File Base64编码的文件数据
 * @param type 文件类型: 'avatars' | 'backgrounds' | 'entries' | 'files' | 'videos' | 'audios'
 * @param filename 可选，自定义文件名
 * @returns 文件访问URL
 */
export const uploadFile = async (
  base64File: string, 
  type: 'avatars' | 'backgrounds' | 'entries' | 'files' | 'videos' | 'audios',
  filename?: string
): Promise<{ url: string; filename: string; message: string }> => {
  return fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ file: base64File, type, filename })
  }).then(handleResponse);
};

/**
 * 删除上传的文件
 * @param url 文件URL
 */
export const deleteFile = async (url: string): Promise<{ message: string }> => {
  return fetch(`${API_URL}/upload`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url })
  }).then(handleResponse);
};

// --- Friends ---

export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<void> => {
  await fetch(`${API_URL}/friends/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ toUserId })
  }).then(handleResponse);
};

export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  await fetch(`${API_URL}/friends/accept`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ requestId })
  }).then(handleResponse);
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  // Logic not fully implemented in backend server example, assuming simple ignore for now
  // Or add endpoint
};

export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  await fetch(`${API_URL}/friends/remove`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ friendId })
  }).then(handleResponse);
};

export const getFriendsList = async (userId: string): Promise<User[]> => {
  return fetch(`${API_URL}/friends`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  return fetch(`${API_URL}/notifications`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const markNotificationRead = async (notifId: string) => {
  // Mocked locally as backend usually clears them on fetch or specific endpoint
  // For now we assume fetch gets unread or all
};

// --- Entries ---

/**
 * 获取日志列表
 * @param targetUserId 可选，指定用户ID来获取该用户的日志
 * @returns 日志列表（已根据当前用户权限过滤）
 */
export const getAllEntries = async (targetUserId?: string): Promise<LogEntry[]> => {
  const url = new URL(`${API_URL}/entries`);
  if (targetUserId) url.searchParams.append('user', targetUserId);
  const data = await fetch(url.toString(), { headers: getAuthHeaders() }).then(handleResponse);
  return data.results;
};

/**
 * 获取指定用户的日志
 */
export const getEntriesByUser = async (targetUserId: string): Promise<LogEntry[]> => {
  return getAllEntries(targetUserId);
};

/**
 * 获取单条日志详情
 * @param id 日志ID
 * @returns 日志详情
 */
export const getEntryById = async (id: string): Promise<LogEntry> => {
  return fetch(`${API_URL}/entries/${id}`, { headers: getAuthHeaders() }).then(handleResponse);
};

/**
 * 创建或更新日志
 * @param entry 日志数据
 * @returns 操作结果
 */
export const upsertEntry = async (entry: LogEntry): Promise<{ id: string; message: string }> => {
  // 验证数据
  if (!entry.title || entry.title.trim() === '') {
    throw new Error('标题不能为空');
  }
  
  if (typeof entry.isPublic !== 'boolean') {
    throw new Error('请选择日志可见性（公开或私密）');
  }
  
  // 如果有ID且有创建时间，说明是更新
  const isUpdate = entry.id && entry.createdAt;
  
  if (isUpdate) {
    const response = await fetch(`${API_URL}/entries/${entry.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(entry)
    }).then(handleResponse);
    return { id: entry.id, message: response.message || '更新成功' };
  } else {
    // 创建新日志
    const response = await fetch(`${API_URL}/entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entry)
    }).then(handleResponse);
    return { id: response.id, message: response.message || '创建成功' };
  }
};

/**
 * 删除日志
 * @param id 日志ID
 */
export const deleteEntry = async (id: string): Promise<void> => {
  await fetch(`${API_URL}/entries/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

// --- Likes ---

/**
 * 点赞日志
 */
export const likeEntry = async (entryId: string): Promise<void> => {
  await fetch(`${API_URL}/entries/${entryId}/like`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

/**
 * 取消点赞
 */
export const unlikeEntry = async (entryId: string): Promise<void> => {
  await fetch(`${API_URL}/entries/${entryId}/like`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

/**
 * 检查是否已点赞
 */
export const checkLikeStatus = async (entryId: string): Promise<boolean> => {
  const res = await fetch(`${API_URL}/entries/${entryId}/like`, {
    headers: getAuthHeaders()
  }).then(handleResponse);
  return res.isLiked;
};

/**
 * 获取用户点赞的日志列表
 */
export const getLikedEntries = async (): Promise<LogEntry[]> => {
  const data = await fetch(`${API_URL}/users/likes`, {
    headers: getAuthHeaders()
  }).then(handleResponse);
  return data.results || [];
};

/**
 * 切换点赞状态（旧版本兼容）
 */
export const toggleLike = async (userId: string, entryId: string): Promise<boolean> => {
  try {
    await likeEntry(entryId);
    return true;
  } catch (e: any) {
    if (e.message?.includes('已经点赞')) {
      await unlikeEntry(entryId);
      return false;
    }
    throw e;
  }
};

// --- Categories ---

export const getCategories = async (logType?: string): Promise<string[]> => {
  const url = `${API_URL}/categories?type=${logType || 'comfyui'}`;
  const cats = await fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  return ['未分类', ...cats];
};

export const addCategory = async (name: string, logType: string) => {
  await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, logType })
  }).then(handleResponse);
};

export const renameCategory = async (oldName: string, newName: string, logType: string) => {
  await fetch(`${API_URL}/categories/rename`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ oldName, newName, logType })
  }).then(handleResponse);
};

export const deleteCategory = async (name: string, logType: string) => {
  await fetch(`${API_URL}/categories?name=${encodeURIComponent(name)}&type=${logType}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

// --- Chat ---

export const getMessages = async (userId: string, recipientId?: string): Promise<ChatMessage[]> => {
  let url = `${API_URL}/messages`;
  if (recipientId) url += `?recipientId=${recipientId}`;
  return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
};

export const sendMessage = async (msg: Partial<ChatMessage>) => {
  await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(msg)
  }).then(handleResponse);
};

/**
 * 获取未读消息数量
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const data = await fetch(`${API_URL}/messages/unread/count`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
    return data.count || 0;
  } catch (e) {
    console.error('获取未读消息数量失败:', e);
    return 0;
  }
};

/**
 * 标记消息为已读
 */
export const markMessagesAsRead = async (senderId: string): Promise<void> => {
  await fetch(`${API_URL}/messages/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ senderId })
  }).then(handleResponse);
};

/**
 * 获取未读消息列表（按发送者分组）
 */
export const getUnreadMessages = async (userId: string): Promise<any[]> => {
  try {
    const data = await fetch(`${API_URL}/messages/unread`, {
      headers: getAuthHeaders()
    }).then(handleResponse);
    return data || [];
  } catch (e) {
    console.error('获取未读消息列表失败:', e);
    return [];
  }
};

// --- Admin ---

export const getAdminStats = async (): Promise<AdminStats> => {
  return fetch(`${API_URL}/admin/stats`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const getAllUsers = async (): Promise<User[]> => {
  return fetch(`${API_URL}/admin/users`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
  return fetch(`${API_URL}/admin/audit`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminDeleteUser = async (id: string, adminId: string) => {
  await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
};

export const adminUpdateUserStatus = async (id: string, status: string, adminId: string) => {
  await fetch(`${API_URL}/admin/users/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, status })
  });
};

export const adminAddAnnouncement = async (announcement: Announcement) => {
  await fetch(`${API_URL}/admin/announcements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(announcement)
  });
};

export const adminDeleteAnnouncement = async (id: string) => {
  await fetch(`${API_URL}/admin/announcements/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
};

// New Admin Functions
export const adminGetChats = async () => {
    return fetch(`${API_URL}/admin/chats`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminDeleteChat = async (id: string) => {
    await fetch(`${API_URL}/admin/chats/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
};

export const adminGetFiles = async () => {
    return fetch(`${API_URL}/admin/files`, { headers: getAuthHeaders() }).then(handleResponse);
};

// Utils
export const exportDataAsJSON = async (userId?: string) => {
  alert("请使用数据库工具导出 (Frontend JSON export deprecated for API mode)");
};

export const clearAllData = () => {
  localStorage.clear();
  window.location.reload();
};

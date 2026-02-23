
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
    console.error('API Error:', res.status, err);
    throw new Error(err.message || err.sqlMessage || 'Request failed');
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
    body: JSON.stringify({ username, password, confirmPassword: password })
  }).then(handleResponse);
  
  localStorage.setItem('access_token', data.token || data.access);
  return getUserProfile();
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const data = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(handleResponse);
  
  localStorage.setItem('access_token', data.token || data.access);
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
  return data.data?.list || data.list || data.results || data;
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
export const adminGetStats = async () => {
    return fetch(`${API_URL}/admin/stats`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminGetStatistics = async () => {
    return fetch(`${API_URL}/admin/statistics`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminGetUsers = async (params?: { page?: number; pageSize?: number; search?: string; status?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.role) query.append('role', params.role);
    const queryString = query.toString();
    return fetch(`${API_URL}/admin/users${queryString ? `?${queryString}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminGetAudit = async (params?: { page?: number; pageSize?: number; module?: string; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.module) query.append('module', params.module);
    if (params?.action) query.append('action', params.action);
    const queryString = query.toString();
    return fetch(`${API_URL}/admin/audit${queryString ? `?${queryString}` : ''}`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminGetChats = async () => {
    return fetch(`${API_URL}/admin/chats`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminDeleteChat = async (id: string) => {
    await fetch(`${API_URL}/admin/chats/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
};

export const adminGetFiles = async () => {
    return fetch(`${API_URL}/admin/files`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminGetOnlineUsers = async () => {
    return fetch(`${API_URL}/admin/online-users`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminForceLogout = async (userId: string) => {
    return fetch(`${API_URL}/admin/users/${userId}/force-logout`, {
        method: 'POST',
        headers: getAuthHeaders()
    }).then(handleResponse);
};

export const adminGetServerStatus = async () => {
    return fetch(`${API_URL}/admin/server/status`, { headers: getAuthHeaders() }).then(handleResponse);
};

// --- Notifications (Additional Functions) ---

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await fetch(`${API_URL}/notifications/read-all?userId=${userId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await fetch(`${API_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

// --- Friend Requests ---

export const getFriendRequests = async (userId: string): Promise<any[]> => {
  return fetch(`${API_URL}/friends/requests?userId=${userId}`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<void> => {
  await fetch(`${API_URL}/friends/requests/${requestId}/respond`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ accept })
  }).then(handleResponse);
};

// --- Announcements ---

export const getAnnouncements = async (): Promise<Announcement[]> => {
  return fetch(`${API_URL}/announcements`, { headers: getAuthHeaders() }).then(handleResponse);
};

// ================= 新增：角色权限管理 API =================

export const adminGetRoles = async () => {
  return fetch(`${API_URL}/admin/roles`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateRole = async (data: { name: string; code: string; description?: string }) => {
  return fetch(`${API_URL}/admin/roles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminUpdateRole = async (id: string, data: any) => {
  return fetch(`${API_URL}/admin/roles/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminDeleteRole = async (id: string) => {
  return fetch(`${API_URL}/admin/roles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

export const adminGetPermissions = async () => {
  return fetch(`${API_URL}/admin/permissions`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminAssignRolePermissions = async (roleId: string, permissionIds: string[]) => {
  return fetch(`${API_URL}/admin/roles/${roleId}/permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ permissionIds })
  }).then(handleResponse);
};

export const adminGetRolePermissions = async (roleId: string) => {
  return fetch(`${API_URL}/admin/roles/${roleId}/permissions`, { headers: getAuthHeaders() }).then(handleResponse);
};

// ================= 新增：系统配置管理 API =================

export const adminGetConfigs = async () => {
  return fetch(`${API_URL}/admin/configs`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateConfig = async (data: { key: string; value: string; type?: string; description?: string }) => {
  return fetch(`${API_URL}/admin/configs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminUpdateConfig = async (id: string, data: any) => {
  return fetch(`${API_URL}/admin/configs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminDeleteConfig = async (id: string) => {
  return fetch(`${API_URL}/admin/configs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

// ================= 新增：字典管理 API =================

export const adminGetDictTypes = async () => {
  return fetch(`${API_URL}/admin/dict-types`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateDictType = async (data: { name: string; type: string; description?: string }) => {
  return fetch(`${API_URL}/admin/dict-types`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminGetDictData = async (type?: string) => {
  const url = type ? `${API_URL}/admin/dict-data?type=${type}` : `${API_URL}/admin/dict-data`;
  return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateDictData = async (data: { dictType: string; label: string; value: string; sort?: number; remark?: string }) => {
  return fetch(`${API_URL}/admin/dict-data`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

// ================= 新增：定时任务管理 API =================

export const adminGetJobs = async () => {
  return fetch(`${API_URL}/admin/jobs`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateJob = async (data: { name: string; group?: string; cron: string; target: string; concurrent?: boolean; description?: string }) => {
  return fetch(`${API_URL}/admin/jobs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminUpdateJob = async (id: string, data: any) => {
  return fetch(`${API_URL}/admin/jobs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminDeleteJob = async (id: string) => {
  return fetch(`${API_URL}/admin/jobs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

export const adminRunJob = async (id: string) => {
  return fetch(`${API_URL}/admin/jobs/${id}/run`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

export const adminGetJobLogs = async (id: string) => {
  return fetch(`${API_URL}/admin/jobs/${id}/logs`, { headers: getAuthHeaders() }).then(handleResponse);
};

// ================= 新增：数据备份管理 API =================

export const adminGetBackups = async () => {
  return fetch(`${API_URL}/admin/backups`, { headers: getAuthHeaders() }).then(handleResponse);
};

export const adminCreateBackup = async (data: { name: string; type?: string; description?: string }) => {
  return fetch(`${API_URL}/admin/backups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);
};

export const adminDeleteBackup = async (id: string) => {
  return fetch(`${API_URL}/admin/backups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse);
};

// Utils
export const exportDataAsJSON = async (userId?: string) => {
  alert("请使用数据库工具导出 (Frontend JSON export deprecated for API mode)");
};

export const clearAllData = () => {
  localStorage.clear();
  window.location.reload();
};

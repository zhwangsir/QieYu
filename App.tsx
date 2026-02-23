import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, ViewState, User, LogType } from './types';
import * as dbService from './services/dbService';
import { LibraryView } from './components/LibraryView';
import { DetailsView } from './components/DetailsView';
import { EditorView } from './components/EditorView';
import { CategoryManager } from './components/CategoryManager';
import { NotificationCenter } from './components/NotificationCenter';
import { OptimizedNotificationCenter } from './components/OptimizedNotificationCenter';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { OptimizedChatView } from './components/OptimizedChatView';
import { AIChatView } from './components/AIChatView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { AdminLayout } from './components/admin/AdminLayout';
import { ResponsiveNav } from './components/ResponsiveNav';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Theme Definitions for initial load
const THEMES: Record<string, any> = {
  violet: { 50: '#f5f3ff', 500: '#8b5cf6', 600: '#7c3aed', 900: '#4c1d95' },
  blue: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 900: '#1e3a8a' },
  emerald: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 900: '#064e3b' },
  rose: { 50: '#fff1f2', 500: '#f43f5e', 600: '#e11d48', 900: '#881337' },
  amber: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 900: '#78350f' },
  cyan: { 50: '#ecfeff', 500: '#06b6d4', 600: '#0891b2', 900: '#164e63' },
  pink: { 50: '#fdf2f8', 500: '#ec4899', 600: '#db2777', 900: '#831843' },
  indigo: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 900: '#312e81' },
  teal: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', 900: '#134e4a' },
  orange: { 50: '#fff7ed', 500: '#f97316', 600: '#ea580c', 900: '#7c2d12' },
  red: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 900: '#7f1d1d' },
  slate: { 50: '#f8fafc', 500: '#64748b', 600: '#475569', 900: '#0f172a' },
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [currentLogTypeForCategory, setCurrentLogTypeForCategory] = useState<LogType>('comfyui');
  const [isLoading, setIsLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileUserData, setProfileUserData] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [likedEntries, setLikedEntries] = useState<LogEntry[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());

  // 未读消息数量
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // 聊天页面初始联系人ID
  const [chatInitialContactId, setChatInitialContactId] = useState<string | null>(null);

  // 功能开关：使用优化版本组件
  const [useOptimizedChat, setUseOptimizedChat] = useState(true);
  const [useOptimizedNotifications, setUseOptimizedNotifications] = useState(true);

  // 自动刷新间隔（毫秒）
  const AUTO_REFRESH_INTERVAL = 3000; // 3秒

  // Apply theme helper
  const applyTheme = (themeName: string, mode: 'light' | 'dark' = 'dark') => {
      const root = document.documentElement;

      // 处理自定义主题
      if (themeName === 'custom') {
        const customColor = localStorage.getItem('qieyu_custom_theme') || '#8b5cf6';
        root.style.setProperty('--color-primary-50', customColor + '0D');
        root.style.setProperty('--color-primary-500', customColor);
        root.style.setProperty('--color-primary-600', customColor);
        root.style.setProperty('--color-primary-900', customColor);
      } else {
        const t = THEMES[themeName] || THEMES['violet'];
        root.style.setProperty('--color-primary-50', t[50]);
        root.style.setProperty('--color-primary-500', t[500]);
        root.style.setProperty('--color-primary-600', t[600]);
        root.style.setProperty('--color-primary-900', t[900]);
      }

      if(mode === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
  };

  // 处理主题切换
  const handleApplyTheme = (themeId: string) => {
    applyTheme(themeId, currentUser?.themeMode || 'dark');
  };

  // 处理模式切换
  const handleToggleMode = (mode: 'light' | 'dark') => {
    applyTheme(currentUser?.theme || 'violet', mode);
  };

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        await dbService.initDB();
        if (localStorage.getItem('access_token')) {
           const user = await dbService.getUserProfile();
           setCurrentUser(user);
           if (user.theme) applyTheme(user.theme, user.themeMode || 'dark'); 
           setView('LIBRARY');
           await refreshData();
           const cats = await dbService.getCategories();
           setCategories(cats);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // 自动刷新机制
  useEffect(() => {
    if (!currentUser || view !== 'LIBRARY') return;

    // 定时自动刷新
    const intervalId = setInterval(() => {
      refreshData();
      setLastRefreshTime(Date.now());
    }, AUTO_REFRESH_INTERVAL);

    // 页面可见性变化时刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时，如果超过5秒没有刷新，则刷新
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        if (timeSinceLastRefresh > 5000) {
          refreshData();
          setLastRefreshTime(Date.now());
        }
      }
    };

    // 监听其他标签页的更新事件
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'qieyu_entries_updated') {
        // 其他标签页有新日志，立即刷新
        refreshData();
        setLastRefreshTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser, view, lastRefreshTime]);

  // 获取未读消息数量
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadCount = async () => {
      try {
        const count = await dbService.getUnreadMessageCount(currentUser.id);
        setUnreadChatCount(count);
      } catch (e) {
        console.error('获取未读消息失败:', e);
      }
    };

    fetchUnreadCount();
    // 每3秒刷新一次未读消息数量
    const intervalId = setInterval(fetchUnreadCount, 300);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', onUndo?: () => void) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type, onUndo }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    if (user.theme) applyTheme(user.theme, user.themeMode || 'dark');
    setView('LIBRARY');
    await refreshData();
  };

  const handleLogout = () => {
    dbService.clearAllData(); 
    setCurrentUser(null);
    setProfileUserId(null);
    setView('AUTH');
    setEntries([]);
  };

  const refreshData = async () => {
    const data = await dbService.getAllEntries();
    // 为每个日志检查点赞状态
    if (currentUser) {
      const entriesWithLikeStatus = await Promise.all(
        data.map(async (entry) => {
          try {
            const isLiked = await dbService.checkLikeStatus(entry.id);
            return { ...entry, isLiked };
          } catch {
            return entry;
          }
        })
      );
      setEntries(entriesWithLikeStatus);
      // 同时刷新收藏列表
      await refreshLikedEntries();
      // 刷新未读通知数量
      await refreshUnreadNotificationCount();
    } else {
      setEntries(data);
    }
  };

  // 刷新未读通知数量
  const refreshUnreadNotificationCount = async () => {
    if (!currentUser) return;
    try {
      // 获取未读通知数量
      const notifications = await dbService.getNotifications(currentUser.id);
      const unreadCount = notifications.filter(n => !n.read).length;
      setUnreadNotificationCount(unreadCount);
    } catch (e) {
      console.error('刷新未读通知数量失败:', e);
    }
  };

  // 刷新收藏列表
  const refreshLikedEntries = async () => {
    if (!currentUser) return;
    try {
      const likes = await dbService.getLikedEntries();
      setLikedEntries(likes);
    } catch (e) {
      console.error('刷新收藏列表失败:', e);
    }
  };

  const handleCreateEntry = () => {
    setSelectedEntryId(null);
    setView('CREATE');
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id);
    setView('DETAILS');
  };

  const handleViewUserProfile = async (userId: string) => {
    setProfileUserId(userId);
    setView('PROFILE');
    
    // 如果是查看自己的资料，直接使用 currentUser
    if (userId === currentUser?.id) {
      setProfileUserData(currentUser);
      return;
    }
    
    // 加载其他用户的资料
    setIsLoadingProfile(true);
    try {
      const user = await dbService.getUserById(userId);
      setProfileUserData(user);
    } catch (e: any) {
      console.error('加载用户资料失败:', e);
      showToast('加载用户资料失败: ' + e.message, 'error');
      // 加载失败时返回 Library
      setView('LIBRARY');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveEntry = async (entry: LogEntry) => {
    if (!currentUser) return;
    try {
      const isUpdate = !!entry.id; // 判断是新建还是更新
      const saved = await dbService.upsertEntry({ ...entry, userId: currentUser.id });

      // 立即更新本地状态
      if (isUpdate) {
        // 更新现有日志
        setEntries(prev => prev.map(e => e.id === saved.id ? { ...entry, ...saved, userId: currentUser.id } : e));
        showToast('日志编辑成功', 'success');
      } else {
        // 新建日志
        const newEntry = { ...entry, ...saved, userId: currentUser.id, authorName: currentUser.username, authorAvatar: currentUser.avatar };
        setEntries(prev => [newEntry, ...prev]);
        showToast('日志创建成功', 'success');
      }

      // 切换到详情页
      setView('DETAILS');
      setSelectedEntryId(saved.id);

      // 后台刷新确保数据同步
      await refreshData();

      // 广播更新事件，通知其他标签页
      localStorage.setItem('qieyu_entries_updated', Date.now().toString());
    } catch (e: any) {
      showToast('保存失败: ' + e.message, 'error');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('确定要删除这条日志吗？')) {
      try {
        await dbService.deleteEntry(id);

        // 立即从本地状态中移除
        setEntries(prev => prev.filter(e => e.id !== id));
        setLikedEntries(prev => prev.filter(e => e.id !== id));

        // 如果当前正在查看该日志，返回主页
        if (selectedEntryId === id) {
          setSelectedEntryId(null);
          setView('LIBRARY');
        }

        showToast('日志已删除', 'success');

        // 后台刷新确保数据同步
        if (currentUser) {
          await refreshData();
        }

        // 广播更新事件
        localStorage.setItem('qieyu_entries_updated', Date.now().toString());
      } catch (e: any) {
        showToast('删除失败: ' + e.message, 'error');
      }
    }
  };

  const handleLikeToggle = async (id: string) => {
    if (!currentUser) return;
    try {
      // 先检查当前点赞状态
      const currentStatus = await dbService.checkLikeStatus(id);

      if (currentStatus) {
        // 已点赞，取消点赞
        await dbService.unlikeEntry(id);
        setEntries(prev => prev.map(e =>
          e.id === id ? { ...e, isLiked: false, likeCount: Math.max((e.likeCount || 0) - 1, 0) } : e
        ));
        // 从收藏列表中移除
        setLikedEntries(prev => prev.filter(e => e.id !== id));
        showToast('已取消收藏', 'success');
      } else {
        // 未点赞，添加点赞
        await dbService.likeEntry(id);
        setEntries(prev => prev.map(e =>
          e.id === id ? { ...e, isLiked: true, likeCount: (e.likeCount || 0) + 1 } : e
        ));
        // 添加到收藏列表
        const entry = entries.find(e => e.id === id);
        if (entry) {
          setLikedEntries(prev => [{ ...entry, isLiked: true }, ...prev]);
        }
        showToast('已添加到收藏', 'success');
      }
    } catch (e: any) {
      showToast(e.message || '操作失败', 'error');
    }
  };

  const handleUpdateUser = async (updates: Partial<User>, currentPassword?: string) => {
    if (!currentUser) return;
    try {
      const updatedUser = await dbService.updateUser(currentUser.id, updates);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        // Apply theme immediately if changed
        if (updates.theme || updates.themeMode) {
             applyTheme(updates.theme || currentUser.theme || 'violet', updates.themeMode || currentUser.themeMode || 'dark');
        }
        showToast("个人信息已更新", 'success');
      }
    } catch (e: any) {
      throw new Error(e.message || "更新失败");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-primary-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (view === 'AUTH' || !currentUser) {
    return <AuthView onLogin={handleLogin} />;
  }

  if (view === 'ADMIN' && currentUser.role === 'admin') {
    return <AdminLayout currentUser={currentUser} onExit={() => setView('SETTINGS')} />;
  }

  const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;
  
  // 确定要显示的用户资料
  const profileUser = (view === 'PROFILE' && profileUserId) 
    ? (profileUserId === currentUser.id ? currentUser : (profileUserData || { id: profileUserId, username: 'Loading...', avatar: '' } as User))
    : currentUser;

  return (
    <div className="flex h-full overflow-hidden">
      {/* 响应式导航组件 - 处理 lg/md/默认 三种断点 */}
      <ResponsiveNav
        currentUser={currentUser}
        currentView={view}
        onChangeView={(v) => {
          if (v === 'PROFILE') {
             handleViewUserProfile(currentUser.id);
          } else {
             setView(v);
          }
        }}
        onLogout={handleLogout}
        unreadChatCount={unreadChatCount}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotificationCenter={() => setShowNotificationCenter(true)}
      />
      
      {/*
        主内容区域 - 响应式边距调整：
        - 大屏幕 (≥1041px): 左侧留出 w-64 (256px) 空间给固定侧边栏
        - 中等屏幕 (817px-1040px): 顶部留出 h-16 (64px) 空间给水平导航栏
        - 小屏幕 (<817px): 顶部留出 h-14 (56px) 空间给精简导航栏
      */}
      <main className="
        flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 relative transition-colors
        min-[1041px]:ml-64 min-[1041px]:mt-0
        min-[817px]:max-[1040px]:mt-16 min-[817px]:max-[1040px]:ml-0
        max-[816px]:mt-14 max-[816px]:ml-0
      ">
        {view === 'LIBRARY' && (
          <LibraryView 
            entries={entries} 
            currentUser={currentUser}
            onCreate={handleCreateEntry}
            onSelect={handleSelectEntry}
            onDelete={handleDeleteEntry}
            onLikeToggle={handleLikeToggle}
            categories={categories}
            onManageCategories={(logType) => {
              if (logType) {
                setCurrentLogTypeForCategory(logType);
              }
              setShowCategoryManager(true);
            }}
            onViewUser={handleViewUserProfile}
          />
        )}

        {view === 'DETAILS' && selectedEntry && (
          <DetailsView 
            entry={selectedEntry} 
            currentUserId={currentUser?.id}
            currentUserRole={currentUser?.role}
            onBack={() => setView('LIBRARY')}
            onEdit={(id) => { setSelectedEntryId(id); setView('EDIT'); }}
            onDelete={handleDeleteEntry}
            onViewUser={handleViewUserProfile}
          />
        )}

        {(view === 'CREATE' || view === 'EDIT') && (
          <EditorView 
            initialData={view === 'EDIT' ? selectedEntry : null}
            onSave={handleSaveEntry}
            onCancel={() => {
              if (view === 'EDIT' && selectedEntry) setView('DETAILS');
              else setView('LIBRARY');
            }}
            categories={categories}
          />
        )}

        {view === 'CHAT' && (
           useOptimizedChat ? (
             <OptimizedChatView
               currentUser={currentUser}
               onViewEntry={handleSelectEntry}
               onViewUser={handleViewUserProfile}
               initialContactId={chatInitialContactId}
             />
           ) : (
             <ChatView
               currentUser={currentUser}
               onViewEntry={handleSelectEntry}
               onViewUser={handleViewUserProfile}
               initialContactId={chatInitialContactId}
             />
           )
        )}

        {view === 'AI_CHAT' && (
           <AIChatView
             currentUser={currentUser}
             onOpenSettings={() => setView('SETTINGS')}
           />
        )}

        {view === 'PROFILE' && profileUser && (
          <ProfileView
            user={profileUser}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            onViewEntry={handleSelectEntry}
            onBack={profileUser.id !== currentUser.id ? () => setView('LIBRARY') : undefined}
            likedEntries={likedEntries}
            onUnlike={handleLikeToggle}
            onRefreshLikes={refreshLikedEntries}
          />
        )}

        {view === 'SETTINGS' && (
           <SettingsView
             user={currentUser}
             onUpdateUser={handleUpdateUser}
             onImport={async (data) => {
               // 导入学习日志数据
               if (data.entries && Array.isArray(data.entries)) {
                 for (const entry of data.entries) {
                   await dbService.upsertEntry({
                     ...entry,
                     userId: currentUser.id,
                     id: undefined // 创建新日志，不保留原ID避免冲突
                   });
                 }
                 await refreshData();
                 showToast(`成功导入 ${data.entries.length} 条学习日志`, 'success');
               } else {
                 throw new Error('无效的数据格式');
               }
             }}
             onExport={async () => {
               // 导出当前用户的学习日志
               const userEntries = entries.filter(e => e.userId === currentUser.id);
               const exportData = {
                 version: '1.0',
                 exportDate: new Date().toISOString(),
                 userId: currentUser.id,
                 username: currentUser.username,
                 entries: userEntries
               };

               // 创建并下载文件
               const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `qieyu_backup_${currentUser.username}_${new Date().toISOString().split('T')[0]}.json`;
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               URL.revokeObjectURL(url);

               showToast(`已导出 ${userEntries.length} 条学习日志`, 'success');
             }}
             onClearData={dbService.clearAllData}
             onOpenAdmin={() => setView('ADMIN')}
             onApplyTheme={handleApplyTheme}
             onToggleMode={handleToggleMode}
           />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {showCategoryManager && (
        <CategoryManager
          initialType={currentLogTypeForCategory}
          onClose={async () => {
             setShowCategoryManager(false);
             setCategories(await dbService.getCategories());
             if (currentUser) refreshData();
          }}
        />
      )}

      {showNotificationCenter && currentUser && (
        useOptimizedNotifications ? (
          <OptimizedNotificationCenter
            currentUser={currentUser}
            onClose={() => {
              setShowNotificationCenter(false);
              // 刷新未读通知计数
              refreshUnreadNotificationCount();
            }}
          />
        ) : (
          <NotificationCenter
            currentUser={currentUser}
            onClose={() => {
              setShowNotificationCenter(false);
              // 刷新未读通知计数
              refreshUnreadNotificationCount();
            }}
          />
        )
      )}
    </div>
  );
};

export default App;

/**
 * 管理后台布局组件
 * 参考RuoYi系统架构设计
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import * as dbService from '../../services/dbService';
import { Avatar } from '../Avatar';
import { RoleManagement } from './RoleManagement';
import { ConfigManagement } from './ConfigManagement';
import { DictManagement } from './DictManagement';
import { JobManagement } from './JobManagement';
import { BackupManagement } from './BackupManagement';
import { UserManagement } from './UserManagement';
import { DataStatistics } from './DataStatistics';
import { ServerMonitor } from './ServerMonitor';
import { OnlineUsers } from './OnlineUsers';
import { CodeGenerator } from './CodeGenerator';
import { ApiDocumentation } from './ApiDocumentation';
import { 
  Users, FileText, Database, Shield, LayoutDashboard, Search, Trash2, 
  RotateCcw, Activity, Ban, CheckCircle2, Server, Globe, FileJson, 
  ArrowLeft, Cpu, HardDrive, Bell, AlertTriangle, ExternalLink, Wrench,
  Menu, Folder, Lock, Key, File as FileIcon, BarChart3, PieChart, MessageSquare,
  Settings, BookOpen, Clock, ChevronRight, Home, LogOut, Moon, Sun,
  ChevronLeft, Star, X, Monitor, Smartphone, Globe2, Mail,
  FileCode, Layers, Zap, Target, TrendingUp, Award, Heart, Bookmark,
  Command, Sparkles, Layout, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { Button } from '../Button';

// 菜单项类型
interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: MenuItem[];
  badge?: number | string;
  isNew?: boolean;
}

interface AdminLayoutProps {
  currentUser: User;
  onExit: () => void;
}

type AdminModule = string;

// 菜单配置
const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
    children: [
      { id: 'dashboard', label: '数据概览', icon: Home },
      { id: 'statistics', label: '数据统计', icon: BarChart3 },
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    icon: Settings,
    children: [
      { id: 'users', label: '用户管理', icon: Users },
      { id: 'roles', label: '角色管理', icon: Shield },
      { id: 'configs', label: '系统配置', icon: Settings },
      { id: 'dicts', label: '字典管理', icon: BookOpen },
      { id: 'menus', label: '菜单管理', icon: Menu, isNew: true },
    ]
  },
  {
    id: 'monitor',
    label: '系统监控',
    icon: Monitor,
    children: [
      { id: 'online', label: '在线用户', icon: Users },
      { id: 'jobs', label: '定时任务', icon: Clock },
      { id: 'backups', label: '数据备份', icon: Database },
      { id: 'audit', label: '审计日志', icon: Activity },
      { id: 'server', label: '服务监控', icon: Server, isNew: true },
    ]
  },
  {
    id: 'content',
    label: '内容管理',
    icon: FileText,
    children: [
      { id: 'chats', label: '聊天管理', icon: MessageSquare },
      { id: 'announcements', label: '公告管理', icon: Bell },
      { id: 'files', label: '文件管理', icon: Folder },
    ]
  },
  {
    id: 'tools',
    label: '系统工具',
    icon: Wrench,
    children: [
      { id: 'codegen', label: '代码生成', icon: FileCode, isNew: true },
      { id: 'api', label: '系统接口', icon: Globe2, isNew: true },
    ]
  }
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentUser, onExit }) => {
  // 状态
  const [activeModule, setActiveModule] = useState<AdminModule>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['dashboard', 'system']));
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['dashboard', 'users']));
  const [recentVisited, setRecentVisited] = useState<string[]>(['dashboard']);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // 数据状态
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // 初始化
  useEffect(() => {
    loadData();
    // 从localStorage加载收藏和最近访问
    const savedFavorites = localStorage.getItem('admin_favorites');
    const savedRecent = localStorage.getItem('admin_recent');
    if (savedFavorites) setFavorites(new Set(JSON.parse(savedFavorites)));
    if (savedRecent) setRecentVisited(JSON.parse(savedRecent));
  }, []);

  // 加载数据
  const loadData = async () => {
    try {
      const [statsData, usersData, chatsData, logsData, annData] = await Promise.all([
        dbService.adminGetStats().catch(() => null),
        dbService.adminGetUsers().catch(() => []),
        dbService.adminGetChats().catch(() => []),
        dbService.getSystemLogs().catch(() => []),
        dbService.getAnnouncements().catch(() => [])
      ]);
      setStats(statsData);
      setUsers(usersData);
      setChats(chatsData);
      setLogs(logsData);
      setAnnouncements(annData);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 切换菜单展开
  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  // 切换收藏
  const toggleFavorite = (moduleId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(moduleId)) {
      newFavorites.delete(moduleId);
    } else {
      newFavorites.add(moduleId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('admin_favorites', JSON.stringify([...newFavorites]));
  };

  // 访问模块
  const visitModule = (moduleId: string) => {
    setActiveModule(moduleId);
    // 更新最近访问
    const newRecent = [moduleId, ...recentVisited.filter(id => id !== moduleId)].slice(0, 5);
    setRecentVisited(newRecent);
    localStorage.setItem('admin_recent', JSON.stringify(newRecent));
  };

  // 搜索过滤菜单
  const filteredMenus = useMemo(() => {
    if (!searchTerm) return menuConfig;
    const term = searchTerm.toLowerCase();
    return menuConfig.map(menu => ({
      ...menu,
      children: menu.children?.filter(child => 
        child.label.toLowerCase().includes(term)
      )
    })).filter(menu => menu.children && menu.children.length > 0);
  }, [searchTerm]);

  // 获取所有菜单项（扁平化）
  const allMenuItems = useMemo(() => {
    const items: { id: string; label: string; icon: React.ElementType; parentId: string }[] = [];
    menuConfig.forEach(menu => {
      menu.children?.forEach(child => {
        items.push({ id: child.id, label: child.label, icon: child.icon, parentId: menu.id });
      });
    });
    return items;
  }, []);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return allMenuItems.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allMenuItems]);

  // 获取当前模块标题
  const getCurrentTitle = () => {
    for (const menu of menuConfig) {
      const child = menu.children?.find(c => c.id === activeModule);
      if (child) return { parent: menu.label, current: child.label };
    }
    return { parent: '仪表盘', current: '数据概览' };
  };

  const currentTitle = getCurrentTitle();

  // 渲染侧边栏菜单项
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const isActive = activeModule === item.id;
    const isFavorite = favorites.has(item.id);

    return (
      <div key={item.id}>
        <div
          onClick={() => hasChildren ? toggleMenu(item.id) : visitModule(item.id)}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
            ${level === 0 ? 'mx-2' : 'ml-6 mr-2'}
            ${isActive 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }
          `}
        >
          <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.isNew && (
                <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded">新</span>
              )}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] bg-primary-500 text-white rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
              {!hasChildren && !level && (
                <button
                  onClick={(e) => toggleFavorite(item.id, e)}
                  className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star 
                    size={14} 
                    className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-500"} 
                  />
                </button>
              )}
              {hasChildren && (
                <ChevronRight 
                  size={16} 
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                />
              )}
            </>
          )}
        </div>
        
        {!collapsed && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
      {/* 侧边栏 */}
      <aside 
        className={`
          ${collapsed ? 'w-16' : 'w-60'} 
          bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="text-primary-500" size={24} />
              <span className="font-bold text-white">Admin<span className="text-primary-500">Pro</span></span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* 搜索 */}
        {!collapsed && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="搜索菜单..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-slate-600 text-slate-300 rounded">
                ⌘K
              </kbd>
              
              {/* 搜索结果下拉 */}
              {showSearch && searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          visitModule(item.id);
                          setSearchTerm('');
                          setShowSearch(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-600 cursor-pointer text-sm text-slate-200"
                      >
                        <item.icon size={16} className="text-slate-400" />
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-500 ml-auto">{item.parentId}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-400">无搜索结果</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 收藏 */}
        {!collapsed && favorites.size > 0 && (
          <div className="px-3 mb-2">
            <div className="text-xs text-slate-500 px-2 mb-1">收藏夹</div>
            <div className="flex flex-wrap gap-1">
              {Array.from(favorites).slice(0, 4).map(id => {
                const itemId = id as string;
                const item = allMenuItems.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <button
                    key={itemId}
                    onClick={() => visitModule(itemId)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                  >
                    <item.icon size={12} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 菜单列表 */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-1">
          {filteredMenus.map(menu => renderMenuItem(menu))}
        </nav>

        {/* 底部用户信息 */}
        <div className="p-3 border-t border-slate-700">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <Avatar avatar={currentUser.avatar} name={currentUser.username} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{currentUser.username}</div>
                <div className="text-xs text-slate-400">{currentUser.role === 'admin' ? '超级管理员' : '管理员'}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={onExit}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="退出"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 text-sm">
            <Home size={16} className="text-slate-400" />
            <ChevronRight size={14} className="text-slate-500" />
            <span className="text-slate-400">{currentTitle.parent}</span>
            <ChevronRight size={14} className="text-slate-500" />
            <span className="text-white font-medium">{currentTitle.current}</span>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center gap-2">
            {/* 最近访问 */}
            <div className="hidden md:flex items-center gap-1">
              {recentVisited.slice(0, 3).map(id => {
                const item = allMenuItems.find(i => i.id === id);
                if (!item) return null;
                return (
                  <button
                    key={id}
                    onClick={() => visitModule(id)}
                    className={`px-2 py-1 text-xs rounded ${
                      activeModule === id 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* 刷新 */}
            <button
              onClick={loadData}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="刷新数据"
            >
              <RotateCcw size={18} />
            </button>

            {/* 主题切换 */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="切换主题"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* 全屏 */}
            <button
              onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="全屏"
            >
              <Monitor size={18} />
            </button>

            <div className="w-px h-5 bg-slate-700" />

            {/* 退出 */}
            <Button
              onClick={onExit}
              variant="secondary"
              className="flex items-center gap-2 text-sm"
            >
              <ArrowLeft size={16} />
              返回前台
            </Button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
          {/* Dashboard */}
          {activeModule === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="总用户数" value={stats?.totalUsers || 0} icon={Users} color="text-blue-500" change="+12%" />
                <StatCard title="日志总数" value={stats?.totalEntries || 0} icon={FileText} color="text-purple-500" change="+8%" />
                <StatCard title="聊天消息" value={chats.length} icon={MessageSquare} color="text-indigo-500" change="+15%" />
                <StatCard title="系统公告" value={announcements.length} icon={Bell} color="text-orange-500" change="+3%" />
              </div>

              {/* 快捷入口 */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-yellow-500" />
                  快捷入口
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { id: 'users', label: '用户管理', icon: Users, color: 'text-blue-500' },
                    { id: 'roles', label: '角色管理', icon: Shield, color: 'text-purple-500' },
                    { id: 'configs', label: '系统配置', icon: Settings, color: 'text-green-500' },
                    { id: 'jobs', label: '定时任务', icon: Clock, color: 'text-orange-500' },
                    { id: 'backups', label: '数据备份', icon: Database, color: 'text-cyan-500' },
                    { id: 'audit', label: '审计日志', icon: Activity, color: 'text-red-500' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => visitModule(item.id)}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors group"
                    >
                      <item.icon size={24} className={item.color} />
                      <span className="text-sm text-slate-300 group-hover:text-white">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 系统信息 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Server size={20} className="text-green-500" />
                    系统信息
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: '系统版本', value: 'v1.0.0' },
                      { label: '运行环境', value: 'Production' },
                      { label: '数据库', value: 'MySQL 8.0' },
                      { label: '缓存', value: 'Redis' },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between py-2 border-b border-slate-700 last:border-0">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    最近操作
                  </h3>
                  <div className="space-y-3">
                    {logs.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <Activity size={14} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{log.action}</div>
                          <div className="text-xs text-slate-500">{log.username} · {new Date(log.created_at).toLocaleString('zh-CN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {activeModule === 'statistics' && <DataStatistics />}

          {/* User Management */}
          {activeModule === 'users' && <UserManagement />}

          {/* Role Management */}
          {activeModule === 'roles' && <RoleManagement />}

          {/* Config Management */}
          {activeModule === 'configs' && <ConfigManagement />}

          {/* Dict Management */}
          {activeModule === 'dicts' && <DictManagement />}

          {/* Job Management */}
          {activeModule === 'jobs' && <JobManagement />}

          {/* Backup Management */}
          {activeModule === 'backups' && <BackupManagement />}

          {/* Audit Logs */}
          {activeModule === 'audit' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity size={20} className="text-blue-500" />
                  审计日志
                </h3>
              </div>
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">操作人</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">操作类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">操作详情</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">IP地址</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">操作时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-200">{log.username}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm max-w-xs truncate">{log.details}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{log.ip || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Chat Management */}
          {activeModule === 'chats' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-500" />
                  聊天管理
                </h3>
              </div>
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">发送者</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">内容</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">时间</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {chats.map((chat, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-200">{chat.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${chat.recipient_id ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                          {chat.recipient_id ? '私聊' : '公共'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm max-w-md truncate">{chat.content}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{new Date(chat.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1.5 hover:bg-red-500/20 rounded text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Announcements */}
          {activeModule === 'announcements' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bell size={20} className="text-orange-500" />
                  公告管理
                </h3>
                <Button className="flex items-center gap-2">
                  <Bell size={16} />
                  发布公告
                </Button>
              </div>
              <div className="divide-y divide-slate-700">
                {announcements.map((ann, i) => (
                  <div key={i} className="p-4 hover:bg-slate-700/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-white">{ann.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{ann.content}</p>
                        <div className="text-xs text-slate-500 mt-2">{new Date(ann.created_at).toLocaleString('zh-CN')}</div>
                      </div>
                      <button className="p-1.5 hover:bg-red-500/20 rounded text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server Monitor */}
          {activeModule === 'server' && <ServerMonitor />}

          {/* Online Users */}
          {activeModule === 'online' && <OnlineUsers />}

          {/* Code Generator */}
          {activeModule === 'codegen' && <CodeGenerator />}

          {/* API Documentation */}
          {activeModule === 'api' && <ApiDocumentation />}

          {/* Placeholder for remaining modules */}
          {['menus', 'files'].includes(activeModule) && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <Wrench size={40} className="opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">功能开发中</h3>
              <p className="text-slate-400">该模块正在开发中，敬请期待...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  change?: string;
}> = ({ title, value, icon: Icon, color, change }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg bg-slate-700 ${color}`}>
        <Icon size={20} />
      </div>
      {change && (
        <span className={`text-xs ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
    <div className="text-sm text-slate-400 mt-1">{title}</div>
  </div>
);

export default AdminLayout;

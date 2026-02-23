import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, FileText, MessageSquare, Database, Activity, 
  TrendingUp, Clock, AlertCircle, CheckCircle, Bell,
  RefreshCw, ChevronRight, Shield, Server, HardDrive
} from 'lucide-react';
import * as dbService from '../../services/dbService';

interface DashboardStats {
  totalUsers: number;
  totalEntries: number;
  totalResources: number;
  totalMessages: number;
  todayUsers: number;
  todayEntries: number;
  todayMessages: number;
  storageUsed: number;
  recentUsers: Array<{
    id: string;
    username: string;
    role: string;
    created_at: string;
    status: string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dbService.adminGetStats();
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const statCards = [
    {
      title: '总用户数',
      value: stats?.totalUsers || 0,
      change: stats?.todayUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: '日志总数',
      value: stats?.totalEntries || 0,
      change: stats?.todayEntries || 0,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: '消息总数',
      value: stats?.totalMessages || 0,
      change: stats?.todayMessages || 0,
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: '资源总数',
      value: stats?.totalResources || 0,
      change: 0,
      icon: Database,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="text-primary-500" />
            管理后台
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            系统运营数据概览
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock size={14} />
            上次更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </div>
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white`}>
                <card.icon size={24} />
              </div>
              {card.change > 0 && (
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp size={14} />
                  +{card.change}
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {(card.value || 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{card.title}</div>
            {card.change > 0 && (
              <div className="text-xs text-slate-400 mt-2">
                今日新增 +{card.change}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              最近注册用户
            </h3>
            <a href="#/admin/users" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              查看全部 <ChevronRight size={14} />
            </a>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} />
              加载中...
            </div>
          ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                    user.role === 'admin' ? 'bg-red-500' : user.role === 'moderator' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 dark:text-white">{user.username}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '版主' : '用户'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.status === 'active' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {user.status === 'active' ? '正常' : '异常'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{getTimeAgo(user.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-slate-400">
              暂无用户数据
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-yellow-500" />
              系统公告
            </h3>
            <a href="#/admin/announcements" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              管理 <ChevronRight size={14} />
            </a>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} />
              加载中...
            </div>
          ) : stats?.announcements && stats.announcements.length > 0 ? (
            <div className="space-y-3">
              {stats.announcements.slice(0, 5).map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    ann.type === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                    ann.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                    ann.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="font-medium text-slate-800 dark:text-white text-sm">{ann.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ann.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-slate-400">
              暂无公告
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-500">
              <Server size={20} />
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">服务器状态</div>
              <div className="font-semibold text-green-500">运行正常</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            系统运行稳定，所有服务正常
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-500">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">存储使用</div>
              <div className="font-semibold text-slate-800 dark:text-white">
                {formatBytes(stats?.storageUsed || 0)}
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${Math.min(((stats?.storageUsed || 0) / (10 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-500">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">今日活跃</div>
              <div className="font-semibold text-slate-800 dark:text-white">
                {(stats?.todayUsers || 0) + (stats?.todayEntries || 0) + (stats?.todayMessages || 0)} 次操作
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            用户注册、日志发布、消息发送
          </div>
        </div>
      </div>
    </div>
  );
};

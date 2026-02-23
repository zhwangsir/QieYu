import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserX, Clock, RefreshCw, Shield, MoreVertical,
  LogOut, AlertTriangle, CheckCircle, Search
} from 'lucide-react';
import * as dbService from '../../services/dbService';

interface OnlineUser {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  status: string;
  lastActive: string;
  isOnline: boolean;
}

export const OnlineUsers: React.FC = () => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const loadOnlineUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dbService.adminGetOnlineUsers();
      if (data && Array.isArray(data)) {
        setUsers(data);
      } else if (data?.data) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('加载在线用户失败:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, [loadOnlineUsers]);

  const handleForceLogout = async (userId: string) => {
    if (!window.confirm('确定要强制该用户下线吗？')) return;
    
    try {
      await dbService.adminForceLogout(userId);
      setUsers(users.filter(u => u.id !== userId));
      setSelectedUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (error) {
      console.error('强制下线失败:', error);
      alert('操作失败');
    }
  };

  const handleBatchLogout = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`确定要强制 ${selectedUsers.size} 个用户下线吗？`)) return;

    try {
      for (const userId of selectedUsers) {
        await dbService.adminForceLogout(userId);
      }
      setUsers(users.filter(u => !selectedUsers.has(u.id)));
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('批量下线失败:', error);
      alert('部分操作失败');
    }
  };

  const toggleSelect = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      moderator: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    const labels: Record<string, string> = {
      admin: '管理员',
      moderator: '版主',
      user: '用户'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.user}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="text-primary-500" />
            在线用户
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            当前在线用户监控与管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            共 {users.length} 人在线
          </div>
          <button
            onClick={loadOnlineUsers}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>
          {selectedUsers.size > 0 && (
            <button
              onClick={handleBatchLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <LogOut size={16} />
              批量下线 ({selectedUsers.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="animate-spin mr-2" size={24} />
            加载中...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users size={48} className="mb-4 opacity-50" />
            <p>暂无在线用户</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => toggleSelect(user.id)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                    user.role === 'admin' ? 'bg-red-500' : user.role === 'moderator' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-white">{user.username}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <Clock size={12} />
                    最后活动: {getTimeAgo(user.lastActive)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {user.status === 'active' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {user.status === 'active' ? '正常' : '异常'}
                  </div>
                  
                  <button
                    onClick={() => handleForceLogout(user.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="强制下线"
                  >
                    <UserX size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-blue-500 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">安全提示</h4>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              强制下线操作会立即终止用户会话，用户需要重新登录。请谨慎使用此功能。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

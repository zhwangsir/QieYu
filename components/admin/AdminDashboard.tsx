
import React, { useState, useEffect } from 'react';
import { User, AdminStats, LogEntry, SystemLog, Announcement } from '../../types';
import * as dbService from '../../services/dbService';
import { Avatar } from '../Avatar';
import { 
  Users, FileText, Database, Shield, LayoutDashboard, Search, Trash2, 
  RotateCcw, Activity, Ban, CheckCircle2, Server, Globe, FileJson, 
  ArrowLeft, Cpu, HardDrive, Bell, AlertTriangle, ExternalLink, Wrench,
  Menu, Folder, Lock, Key, File as FileIcon, BarChart3, PieChart, MessageSquare
} from 'lucide-react';
import { Button } from '../Button';

interface AdminDashboardProps {
  currentUser: User;
  onExit: () => void;
}

type AdminModule = 'dashboard' | 'users' | 'roles' | 'audit' | 'chats' | 'menus' | 'content' | 'files' | 'announcements';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onExit }) => {
  const [activeModule, setActiveModule] = useState<AdminModule>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [annText, setAnnText] = useState('');

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const statsData = await dbService.getAdminStats();
      const allUsers = await dbService.getAllUsers(); 
      const sysLogs = await dbService.getSystemLogs();
      const allChats = await dbService.adminGetChats();
      const allFiles = await dbService.adminGetFiles();

      setStats(statsData);
      setUsers(allUsers);
      setLogs(sysLogs);
      setChats(allChats);
      setFiles(allFiles);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // --- Actions ---

  const handleUserStatus = async (userId: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    if(confirm(`确定要${newStatus === 'banned' ? '冻结' : '解冻'}该用户吗？`)) {
        await dbService.adminUpdateUserStatus(userId, newStatus, currentUser.id);
        refreshAll();
    }
  };

  const handleDeleteUser = async (userId: string) => {
      if(confirm("警告：删除用户将同时删除其所有日志和数据，不可恢复！确定继续？")) {
          await dbService.adminDeleteUser(userId, currentUser.id);
          refreshAll();
      }
  };

  const handleAddAnnouncement = async () => {
      if(!annText) return;
      const ann: Announcement = {
          id: '', // Backend handles ID
          title: "系统公告",
          content: annText,
          type: 'info',
          active: true,
          createdAt: new Date().toISOString()
      };
      await dbService.adminAddAnnouncement(ann);
      setAnnText('');
      refreshAll();
  };

  const handleDeleteChat = async (id: string) => {
      if(confirm("确定删除这条聊天记录吗？")) {
          await dbService.adminDeleteChat(id);
          refreshAll();
      }
  };

  // --- Sub-Components ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: AdminModule, icon: any, label: string }) => (
    <button
      onClick={() => setActiveModule(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
        activeModule === id 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20 font-medium' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const StatCard = ({ title, value, icon: Icon, color, subText }: any) => (
      <div className="bg-[#1e293b] border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-all shadow-lg">
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('text-', 'bg-')}`}>
              <Icon size={64} />
          </div>
          <div className="relative z-10">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
              <div className="text-3xl font-bold text-white mb-2">{value}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                 {subText}
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex h-full bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#1e293b] border-r border-white/5 flex flex-col shrink-0 shadow-2xl z-20">
            <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
                <Shield className="text-primary-500" size={24} />
                <span className="font-bold text-lg text-white tracking-tight">Admin<span className="text-primary-500">Panel</span></span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-2">仪表盘</div>
                <SidebarItem id="dashboard" icon={LayoutDashboard} label="数据概览" />
                
                <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-6">用户权限</div>
                <SidebarItem id="users" icon={Users} label="用户管理" />
                <SidebarItem id="roles" icon={Key} label="角色权限" />
                <SidebarItem id="audit" icon={Activity} label="审计日志" />
                
                <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-6">系统配置</div>
                <SidebarItem id="chats" icon={MessageSquare} label="聊天管理" />
                <SidebarItem id="announcements" icon={Bell} label="公告管理" />
                <SidebarItem id="files" icon={Folder} label="文件管理" />
                <SidebarItem id="menus" icon={Menu} label="菜单管理" />
            </div>

            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <Avatar avatar={currentUser.avatar} name={currentUser.username} size="sm" />
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{currentUser.username}</div>
                        <div className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Super Admin
                        </div>
                    </div>
                </div>
                <Button variant="secondary" className="w-full justify-center bg-slate-800 hover:bg-slate-700 border-none text-slate-300" onClick={onExit} icon={<ArrowLeft size={16}/>}>
                    返回前台
                </Button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
            {/* Top Header */}
            <div className="h-16 bg-[#1e293b]/50 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="opacity-50">系统管理</span>
                    <span>/</span>
                    <span className="text-white capitalize">{activeModule}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={refreshAll} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-xs text-white rounded-lg transition-colors shadow-lg shadow-primary-900/20">
                        <RotateCcw size={14} /> 刷新数据
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                
                {/* 1. DASHBOARD - Data Viz */}
                {activeModule === 'dashboard' && stats && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title="总用户数" 
                                value={stats.totalUsers} 
                                icon={Users} 
                                color="text-blue-500" 
                                subText="活跃用户增长中"
                            />
                            <StatCard 
                                title="日志总数" 
                                value={stats.totalEntries} 
                                icon={FileText} 
                                color="text-purple-500" 
                                subText="知识库持续积累"
                            />
                            <StatCard 
                                title="聊天消息" 
                                value={chats.length} 
                                icon={MessageSquare} 
                                color="text-indigo-500" 
                                subText="最近100条"
                            />
                            <StatCard 
                                title="系统存储" 
                                value={`${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB`} 
                                icon={HardDrive} 
                                color="text-orange-500" 
                                subText={`DB Files`}
                            />
                        </div>

                        {/* Charts Mockup */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-[#1e293b] border border-white/5 rounded-xl p-6 h-80 flex flex-col">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary-500"/> 用户增长趋势</h3>
                                <div className="flex-1 flex items-end justify-between px-4 pb-2 gap-2">
                                    {[30, 45, 35, 60, 75, 50, 90].map((h, i) => (
                                        <div key={i} className="w-full bg-slate-800 rounded-t-sm hover:bg-primary-600 transition-colors relative group" style={{height: `${h}%`}}>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between px-4 text-xs text-slate-500 border-t border-white/5 pt-2">
                                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                                </div>
                            </div>
                            
                            <div className="bg-[#1e293b] border border-white/5 rounded-xl p-6 h-80">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><PieChart size={18} className="text-purple-500"/> 热门分类占比</h3>
                                <div className="flex h-full items-center justify-center relative -top-4">
                                    <div className="w-40 h-40 rounded-full border-[16px] border-indigo-500 border-r-purple-500 border-b-blue-500 border-l-cyan-500"></div>
                                    <div className="absolute ml-48 space-y-2">
                                        <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-indigo-500 rounded-full"/> ComfyUI (40%)</div>
                                        <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-purple-500 rounded-full"/> Modeling (25%)</div>
                                        <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-blue-500 rounded-full"/> Coding (20%)</div>
                                        <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 bg-cyan-500 rounded-full"/> Life (15%)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. USER MANAGEMENT */}
                {activeModule === 'users' && (
                    <div className="bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white">用户列表</h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    className="bg-[#0f172a] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:border-primary-500 outline-none w-48" 
                                />
                            </div>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0f172a] text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.filter(u => u.username.includes(userSearch)).map(u => (
                                    <tr key={u.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <Avatar avatar={u.avatar} name={u.username} size="sm" />
                                            <span className="font-bold text-slate-200">{u.username}</span>
                                        </td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-white/5 rounded text-xs">{u.role}</span></td>
                                        <td className="px-6 py-4">
                                            {u.status === 'active' ? <span className="text-green-400 text-xs">Active</span> : <span className="text-red-400 text-xs">Banned</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleUserStatus(u.id, u.status)} className="p-1 hover:text-white text-slate-400"><Ban size={16}/></button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-1 hover:text-red-400 text-slate-400 ml-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 3. CHAT MANAGEMENT */}
                {activeModule === 'chats' && (
                    <div className="bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-bold text-white">聊天监控 (最近100条)</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0f172a] text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">时间</th>
                                        <th className="px-4 py-3">发送者</th>
                                        <th className="px-4 py-3">类型</th>
                                        <th className="px-4 py-3">内容</th>
                                        <th className="px-4 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {chats.map(chat => (
                                        <tr key={chat.message_id} className="hover:bg-white/5">
                                            <td className="px-4 py-3 text-slate-500 text-xs">{new Date(chat.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-bold text-slate-300">{chat.username}</td>
                                            <td className="px-4 py-3 text-xs text-slate-400">{chat.recipient_id ? '私聊' : '公共'}</td>
                                            <td className="px-4 py-3 text-slate-200 max-w-md truncate">{chat.content}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleDeleteChat(chat.message_id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. AUDIT LOGS */}
                {activeModule === 'audit' && (
                    <div className="bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2"><Activity size={18}/> 安全审计日志</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-[#0f172a] text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Timestamp</th>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Module</th>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5">
                                            <td className="px-4 py-2.5 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-slate-300">{log.username}</td>
                                            <td className="px-4 py-2.5"><span className="bg-slate-800 px-1 rounded text-slate-400">{log.module || 'SYS'}</span></td>
                                            <td className="px-4 py-2.5 text-blue-400">{log.action}</td>
                                            <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{log.details}</td>
                                            <td className="px-4 py-2.5 text-green-400">{log.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. ANNOUNCEMENTS */}
                {activeModule === 'announcements' && (
                    <div className="bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden animate-fade-in p-6">
                        <h3 className="font-bold text-white mb-4">系统公告管理</h3>
                        <div className="flex gap-4 mb-6">
                            <input type="text" value={annText} onChange={e => setAnnText(e.target.value)} className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary-500" placeholder="发布新公告..." />
                            <Button onClick={handleAddAnnouncement}>发布</Button>
                        </div>
                        <div className="space-y-3">
                            {stats?.announcements?.map(ann => (
                                <div key={ann.id} className="p-4 bg-[#0f172a] border border-white/5 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-200">{ann.title}</div>
                                        <div className="text-slate-500 text-sm">{ann.content}</div>
                                    </div>
                                    <button onClick={() => dbService.adminDeleteAnnouncement(ann.id).then(refreshAll)} className="text-red-400 hover:bg-white/5 p-2 rounded"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. FILES */}
                {activeModule === 'files' && (
                    <div className="bg-[#1e293b] border border-white/5 rounded-xl overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-bold text-white">文件资源管理</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0f172a] text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">文件名/ID</th>
                                        <th className="px-4 py-3">类型</th>
                                        <th className="px-4 py-3">大小 (Est)</th>
                                        <th className="px-4 py-3">上传时间</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {files.map((file, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="px-4 py-3 text-slate-200 truncate max-w-xs">{file.name || file.id}</td>
                                            <td className="px-4 py-3 text-slate-400">{file.type}</td>
                                            <td className="px-4 py-3 text-slate-400">{(file.size / 1024).toFixed(2)} KB</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(file.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 7. ROLES & MENUS */}
                {['roles', 'menus', 'content'].includes(activeModule) && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-fade-in">
                        <div className="w-20 h-20 bg-[#1e293b] rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <Lock size={40} className="opacity-50"/>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 capitalize">{activeModule} Management</h3>
                        <p>Advanced Module (Visual Placeholder for Demo)</p>
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md opacity-50">
                            <div className="bg-[#1e293b] p-4 rounded border border-white/5 h-24"></div>
                            <div className="bg-[#1e293b] p-4 rounded border border-white/5 h-24"></div>
                            <div className="bg-[#1e293b] p-4 rounded border border-white/5 h-24 col-span-2"></div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

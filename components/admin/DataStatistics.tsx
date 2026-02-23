import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, FileText, MessageSquare,
  Activity, Eye, Clock, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Calendar, RefreshCw, Database, HardDrive
} from 'lucide-react';
import * as dbService from '../../services/dbService';

interface StatCard {
  title: string;
  value: number | string;
  change: number;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface Statistics {
  userTrend: TimeSeriesData[];
  entryTrend: TimeSeriesData[];
  messageTrend: TimeSeriesData[];
  logTypeDistribution: { log_type: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
}

export const DataStatistics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [categoryData, setCategoryData] = useState<ChartData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<TimeSeriesData[]>([]);
  const [entryTrendData, setEntryTrendData] = useState<TimeSeriesData[]>([]);
  const [logTypeData, setLogTypeData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const [statsData, statisticsData, auditData] = await Promise.all([
        dbService.adminGetStats(),
        dbService.adminGetStatistics(),
        dbService.adminGetAudit()
      ]);

      setStats([
        {
          title: '总用户数',
          value: statsData.totalUsers || 0,
          change: statsData.todayUsers ? (statsData.todayUsers / Math.max(statsData.totalUsers - statsData.todayUsers, 1)) * 100 : 0,
          icon: Users,
          color: 'text-blue-500',
          trend: statsData.todayUsers > 0 ? 'up' : 'neutral'
        },
        {
          title: '日志总数',
          value: statsData.totalEntries || 0,
          change: statsData.todayEntries ? (statsData.todayEntries / Math.max(statsData.totalEntries - statsData.todayEntries, 1)) * 100 : 0,
          icon: FileText,
          color: 'text-purple-500',
          trend: statsData.todayEntries > 0 ? 'up' : 'neutral'
        },
        {
          title: '消息总数',
          value: statsData.totalMessages || 0,
          change: statsData.todayMessages ? (statsData.todayMessages / Math.max(statsData.totalMessages - statsData.todayMessages, 1)) * 100 : 0,
          icon: MessageSquare,
          color: 'text-green-500',
          trend: statsData.todayMessages > 0 ? 'up' : 'neutral'
        },
        {
          title: '资源总数',
          value: statsData.totalResources || 0,
          icon: Database,
          color: 'text-orange-500',
          trend: 'neutral',
          change: 0
        }
      ]);

      const statistics = statisticsData as Statistics;
      
      if (statistics?.userTrend) {
        setUserGrowthData(statistics.userTrend.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          value: item.count
        })));
      }

      if (statistics?.entryTrend) {
        setEntryTrendData(statistics.entryTrend.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          value: item.count
        })));
      }

      if (statistics?.logTypeDistribution) {
        const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'];
        const total = statistics.logTypeDistribution.reduce((sum: number, item: any) => sum + item.count, 0) || 1;
        setLogTypeData(statistics.logTypeDistribution.map((item: any, index: number) => ({
          label: item.log_type || '其他',
          value: Math.round((item.count / total) * 100),
          color: colors[index % colors.length]
        })));
      }

      if (statistics?.categoryDistribution) {
        const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500'];
        const total = statistics.categoryDistribution.reduce((sum: number, item: any) => sum + item.count, 0) || 1;
        setCategoryData(statistics.categoryDistribution.map((item: any, index: number) => ({
          label: item.category || '未分类',
          value: Math.round((item.count / total) * 100),
          color: colors[index % colors.length]
        })));
      }

      if (auditData && Array.isArray(auditData)) {
        setRecentActivities(auditData.slice(0, 5).map((log: any) => ({
          user: log.username || '系统',
          action: getActionText(log.action),
          target: log.details || '',
          time: getTimeAgo(log.createdAt),
          type: getActivityType(log.action)
        })));
      }

    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionText = (action: string): string => {
    const actionMap: Record<string, string> = {
      'LOGIN': '登录了系统',
      'REGISTER': '注册了账号',
      'CREATE_ENTRY': '发布了新日志',
      'UPDATE_ENTRY': '更新了日志',
      'DELETE_ENTRY': '删除了日志',
      'LIKE_ENTRY': '点赞了日志',
      'UPDATE_PROFILE': '更新了个人资料',
      'FRIEND_REQUEST': '发送了好友请求',
      'ACCEPT_FRIEND': '接受了好友请求',
      'CREATE_ANNOUNCEMENT': '发布了公告',
      'UPDATE_STATUS': '更新了用户状态'
    };
    return actionMap[action] || action;
  };

  const getActivityType = (action: string): string => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'create';
    if (action.includes('DELETE')) return 'delete';
    if (action.includes('UPDATE')) return 'update';
    if (action.includes('LOGIN') || action.includes('REGISTER')) return 'register';
    if (action.includes('LIKE')) return 'like';
    return 'other';
  };

  const getTimeAgo = (dateStr: string): string => {
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

  const maxValue = Math.max(...userGrowthData.map(d => d.value), 1);
  const maxEntryValue = Math.max(...entryTrendData.map(d => d.value), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-primary-500" />
            数据统计
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">系统运营数据概览与分析</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="90d">近90天</option>
          </select>
          <button
            onClick={loadStatistics}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-700 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {stat.change !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-slate-500'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {Math.abs(stat.change).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            用户增长趋势
          </h3>
          {userGrowthData.length > 0 ? (
            <>
              <div className="h-64 flex items-end gap-1">
                {userGrowthData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-colors relative"
                      style={{ height: `${(data.value / maxValue) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {data.value} 人
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-slate-500 overflow-hidden">
                {userGrowthData.filter((_, i) => i % Math.ceil(userGrowthData.length / 7) === 0).map((data, index) => (
                  <span key={index}>{data.date}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无数据
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <FileText size={20} className="text-purple-500" />
            日志发布趋势
          </h3>
          {entryTrendData.length > 0 ? (
            <>
              <div className="h-64 flex items-end gap-1">
                {entryTrendData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-purple-500 rounded-t-sm hover:bg-purple-400 transition-colors relative"
                      style={{ height: `${(data.value / maxEntryValue) * 100}%`, minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {data.value} 篇
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-slate-500 overflow-hidden">
                {entryTrendData.filter((_, i) => i % Math.ceil(entryTrendData.length / 7) === 0).map((data, index) => (
                  <span key={index}>{data.date}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-indigo-500" />
            日志类型分布
          </h3>
          {logTypeData.length > 0 ? (
            <>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {logTypeData.reduce((acc, item, index) => {
                      const prevOffset = acc.offset;
                      const dashArray = (item.value / 100) * 283;
                      
                      acc.elements.push(
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="20"
                          strokeDasharray={`${dashArray} 283`}
                          strokeDashoffset={-prevOffset}
                          className={item.color.replace('bg-', 'text-')}
                        />
                      );
                      
                      acc.offset += dashArray;
                      return acc;
                    }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                  </svg>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {logTypeData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              暂无数据
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity size={20} className="text-green-500" />
            最近活动
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'create' ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/30' :
                    activity.type === 'delete' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' :
                    activity.type === 'register' ? 'bg-purple-100 text-purple-500 dark:bg-purple-900/30' :
                    activity.type === 'like' ? 'bg-pink-100 text-pink-500 dark:bg-pink-900/30' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-700'
                  }`}>
                    {activity.type === 'create' && <FileText size={18} />}
                    {activity.type === 'delete' && <HardDrive size={18} />}
                    {activity.type === 'register' && <Users size={18} />}
                    {activity.type === 'like' && <TrendingUp size={18} />}
                    {activity.type === 'update' && <Activity size={18} />}
                    {activity.type === 'other' && <Activity size={18} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-800 dark:text-white">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-slate-500 dark:text-slate-400"> {activity.action} </span>
                      {activity.target && (
                        <span className="font-medium text-primary-500">{activity.target}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={12} />
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              暂无活动记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

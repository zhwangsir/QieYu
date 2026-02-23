import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Search, Play, Pause, History } from 'lucide-react';
import * as dbService from '../../services/dbService';
import { Button } from '../Button';

interface Job {
  id: string;
  name: string;
  group: string;
  cron: string;
  target: string;
  status: number;
  concurrent: number;
  description: string;
  lastRunTime: string;
  nextRunTime: string;
}

interface JobLog {
  id: string;
  jobId: string;
  jobName: string;
  status: number;
  errorMsg: string;
  startTime: string;
  endTime: string;
}

export const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJobLogs, setSelectedJobLogs] = useState<JobLog[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    group: 'DEFAULT',
    cron: '',
    target: '',
    concurrent: true,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.adminGetJobs();
      setJobs(data);
    } catch (error) {
      console.error('加载定时任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingJob) {
        await dbService.adminUpdateJob(editingJob.id, formData);
      } else {
        await dbService.adminCreateJob(formData);
      }
      setShowModal(false);
      setEditingJob(null);
      setFormData({ name: '', group: 'DEFAULT', cron: '', target: '', concurrent: true, description: '' });
      loadData();
    } catch (error) {
      console.error('保存定时任务失败:', error);
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个定时任务吗？')) return;
    try {
      await dbService.adminDeleteJob(id);
      loadData();
    } catch (error) {
      console.error('删除定时任务失败:', error);
      alert('删除失败');
    }
  };

  const handleRun = async (id: string) => {
    try {
      await dbService.adminRunJob(id);
      alert('任务已手动执行');
      loadData();
    } catch (error) {
      console.error('执行任务失败:', error);
      alert('执行失败');
    }
  };

  const viewLogs = async (job: Job) => {
    try {
      const logs = await dbService.adminGetJobLogs(job.id);
      setSelectedJobLogs(logs);
      setShowLogModal(true);
    } catch (error) {
      console.error('加载日志失败:', error);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="text-primary-500" />
            定时任务
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理系统定时任务和调度</p>
        </div>
        <Button
          onClick={() => {
            setEditingJob(null);
            setFormData({ name: '', group: 'DEFAULT', cron: '', target: '', concurrent: true, description: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          新建任务
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="搜索任务名称或调用目标..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">任务名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Cron表达式</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">调用目标</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">上次执行</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800 dark:text-white">{job.name}</div>
                    <div className="text-xs text-slate-500">{job.group}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {job.cron}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm max-w-xs truncate">
                    {job.target}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 1
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {job.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                    {job.lastRunTime ? new Date(job.lastRunTime).toLocaleString('zh-CN') : '从未执行'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRun(job.id)}
                        className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="立即执行"
                      >
                        <Play size={18} />
                      </button>
                      <button
                        onClick={() => viewLogs(job)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="查看日志"
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingJob(job);
                          setFormData({
                            name: job.name,
                            group: job.group,
                            cron: job.cron,
                            target: job.target,
                            concurrent: job.concurrent === 1,
                            description: job.description
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              暂无定时任务
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {editingJob ? '编辑定时任务' : '新建定时任务'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">任务名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">任务组</label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cron表达式</label>
                <input
                  type="text"
                  value={formData.cron}
                  onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono"
                  required
                  placeholder="0 0 * * * *"
                />
                <p className="text-xs text-slate-500 mt-1">例如: 0 0 * * * * 表示每小时执行</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">调用目标</label>
                <input
                  type="text"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="如: backupService.run()"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.concurrent}
                    onChange={(e) => setFormData({ ...formData, concurrent: e.target.checked })}
                    className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">允许并发执行</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingJob ? '保存' : '创建'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">执行日志</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedJobLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无执行记录</div>
              ) : (
                <div className="space-y-3">
                  {selectedJobLogs.map((log) => (
                    <div key={log.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800 dark:text-white">{log.jobName}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 1
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {log.status === 1 ? '成功' : '失败'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        开始: {new Date(log.startTime).toLocaleString('zh-CN')}
                      </div>
                      {log.errorMsg && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                          {log.errorMsg}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <Button onClick={() => setShowLogModal(false)} className="w-full">关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Search, AlertCircle } from 'lucide-react';
import * as dbService from '../../services/dbService';
import { Button } from '../Button';

interface Config {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
}

export const ConfigManagement: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);

  const [formData, setFormData] = useState({
    key: '',
    value: '',
    type: 'string',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.adminGetConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await dbService.adminUpdateConfig(editingConfig.id, { value: formData.value, description: formData.description });
      } else {
        await dbService.adminCreateConfig(formData);
      }
      setShowModal(false);
      setEditingConfig(null);
      setFormData({ key: '', value: '', type: 'string', description: '' });
      loadData();
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存失败，请检查配置键是否重复');
    }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('系统内置配置不能删除');
      return;
    }
    if (!confirm('确定要删除这个配置吗？')) return;
    try {
      await dbService.adminDeleteConfig(id);
      loadData();
    } catch (error) {
      console.error('删除配置失败:', error);
      alert('删除失败');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'number': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'boolean': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'json': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  const filteredConfigs = configs.filter(config =>
    config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="text-primary-500" />
            系统配置
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理系统运行参数和配置项</p>
        </div>
        <Button
          onClick={() => {
            setEditingConfig(null);
            setFormData({ key: '', value: '', type: 'string', description: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          新建配置
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="搜索配置键或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Alert */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-amber-800 dark:text-amber-400">
          <p className="font-medium">注意事项</p>
          <p className="mt-1">系统内置配置（标记为系统）不能删除，修改配置后可能需要刷新页面才能生效。</p>
        </div>
      </div>

      {/* Configs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">配置键</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">配置值</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">类型</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">描述</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">系统</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-800 dark:text-slate-200 font-mono">
                      {config.key}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-slate-700 dark:text-slate-300" title={config.value}>
                      {config.value}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(config.type)}`}>
                      {config.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {config.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {config.isSystem ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        系统
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        自定义
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingConfig(config);
                          setFormData({
                            key: config.key,
                            value: config.value,
                            type: config.type,
                            description: config.description
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id, config.isSystem)}
                        className={`p-2 rounded-lg transition-colors ${
                          config.isSystem
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                        title={config.isSystem ? '系统配置不能删除' : '删除'}
                        disabled={config.isSystem}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredConfigs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              暂无配置数据
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {editingConfig ? '编辑配置' : '新建配置'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">配置键</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={!!editingConfig}
                  placeholder="如: system.name"
                />
                {editingConfig && (
                  <p className="text-xs text-slate-500 mt-1">配置键创建后不可修改</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">配置值</label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  required
                />
              </div>
              {!editingConfig && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">值类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="string">字符串 (string)</option>
                    <option value="number">数字 (number)</option>
                    <option value="boolean">布尔值 (boolean)</option>
                    <option value="json">JSON (json)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="配置项的用途说明"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingConfig ? '保存' : '创建'}
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
    </div>
  );
};

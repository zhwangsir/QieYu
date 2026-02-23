import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import * as dbService from '../../services/dbService';
import { Button } from '../Button';

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  status: number;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  type: string;
  children?: Permission[];
}

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        dbService.adminGetRoles(),
        dbService.adminGetPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await dbService.adminUpdateRole(editingRole.id, formData);
      } else {
        await dbService.adminCreateRole(formData);
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: '', code: '', description: '', status: 1 });
      loadData();
    } catch (error) {
      console.error('保存角色失败:', error);
      alert('保存失败，请检查角色编码是否重复');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;
    try {
      await dbService.adminDeleteRole(id);
      loadData();
    } catch (error) {
      console.error('删除角色失败:', error);
      alert('删除失败');
    }
  };

  const openPermissionModal = async (role: Role) => {
    setEditingRole(role);
    setShowPermissionModal(true);
    try {
      const data = await dbService.adminGetRolePermissions(role.id);
      if (data && data.data && Array.isArray(data.data)) {
        setSelectedPermissions(new Set(data.data.map((p: any) => p.id || p.permission_id)));
      } else if (data && Array.isArray(data)) {
        setSelectedPermissions(new Set(data.map((p: any) => p.id || p.permission_id)));
      } else {
        setSelectedPermissions(new Set());
      }
    } catch (error) {
      console.error('加载角色权限失败:', error);
      setSelectedPermissions(new Set());
    }
  };

  const handlePermissionSubmit = async () => {
    if (!editingRole) return;
    try {
      await dbService.adminAssignRolePermissions(editingRole.id, Array.from(selectedPermissions));
      setShowPermissionModal(false);
      alert('权限分配成功');
    } catch (error) {
      console.error('分配权限失败:', error);
      alert('分配权限失败');
    }
  };

  const togglePermission = (id: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPermissions(newSet);
  };

  const toggleModule = (module: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(module)) {
      newSet.delete(module);
    } else {
      newSet.add(module);
    }
    setExpandedModules(newSet);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="text-primary-500" />
            角色管理
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理系统角色和权限分配</p>
        </div>
        <Button
          onClick={() => {
            setEditingRole(null);
            setFormData({ name: '', code: '', description: '', status: 1 });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          新建角色
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="搜索角色名称或编码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Roles Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">角色名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">角色编码</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">描述</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800 dark:text-white">{role.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-600 dark:text-slate-400">
                      {role.code}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{role.description || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      role.status === 1
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {role.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                    {new Date(role.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPermissionModal(role)}
                        className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="分配权限"
                      >
                        <Shield size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setFormData({
                            name: role.name,
                            code: role.code,
                            description: role.description,
                            status: role.status
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
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
          {filteredRoles.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              暂无角色数据
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {editingRole ? '编辑角色' : '新建角色'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">角色名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">角色编码</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={!!editingRole}
                />
                <p className="text-xs text-slate-500 mt-1">唯一标识，创建后不可修改</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>启用</option>
                  <option value={0}>禁用</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingRole ? '保存' : '创建'}
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

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                分配权限 - {editingRole?.name}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {permissions.map((module) => (
                  <div key={module.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.module)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <span className="font-medium text-slate-800 dark:text-white">{module.name}</span>
                      {expandedModules.has(module.module) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    {expandedModules.has(module.module) && module.children && (
                      <div className="p-4 space-y-2">
                        {module.children.map((perm) => (
                          <label key={perm.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/30 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-slate-700 dark:text-slate-300">{perm.name}</span>
                            <code className="ml-auto text-xs text-slate-400">{perm.code}</code>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <Button onClick={handlePermissionSubmit} className="flex-1">
                保存权限
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPermissionModal(false)}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

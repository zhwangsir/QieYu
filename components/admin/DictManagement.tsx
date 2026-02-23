import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import * as dbService from '../../services/dbService';
import { Button } from '../Button';

interface DictType {
  id: string;
  name: string;
  type: string;
  description: string;
  status: number;
  createdAt: string;
}

interface DictData {
  id: string;
  dictType: string;
  label: string;
  value: string;
  sort: number;
  status: number;
  remark: string;
}

export const DictManagement: React.FC = () => {
  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [dictData, setDictData] = useState<DictData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingData, setEditingData] = useState<DictData | null>(null);

  const [typeForm, setTypeForm] = useState({ name: '', type: '', description: '' });
  const [dataForm, setDataForm] = useState({ label: '', value: '', sort: 0, remark: '' });

  useEffect(() => {
    loadDictTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDictData(selectedType);
    }
  }, [selectedType]);

  const loadDictTypes = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.adminGetDictTypes();
      setDictTypes(data);
      if (data.length > 0 && !selectedType) {
        setSelectedType(data[0].type);
      }
    } catch (error) {
      console.error('加载字典类型失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDictData = async (type: string) => {
    try {
      const data = await dbService.adminGetDictData(type);
      setDictData(data);
    } catch (error) {
      console.error('加载字典数据失败:', error);
    }
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.adminCreateDictType(typeForm);
      setShowTypeModal(false);
      setTypeForm({ name: '', type: '', description: '' });
      loadDictTypes();
    } catch (error) {
      console.error('创建字典类型失败:', error);
      alert('创建失败，请检查类型编码是否重复');
    }
  };

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    try {
      await dbService.adminCreateDictData({
        dictType: selectedType,
        ...dataForm
      });
      setShowDataModal(false);
      setDataForm({ label: '', value: '', sort: 0, remark: '' });
      loadDictData(selectedType);
    } catch (error) {
      console.error('创建字典数据失败:', error);
      alert('创建失败');
    }
  };

  const filteredTypes = dictTypes.filter(dt =>
    dt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dt.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="text-primary-500" />
            字典管理
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理系统数据字典</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingType(null);
              setTypeForm({ name: '', type: '', description: '' });
              setShowTypeModal(true);
            }}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            新建类型
          </Button>
          <Button
            onClick={() => {
              if (!selectedType) {
                alert('请先选择字典类型');
                return;
              }
              setEditingData(null);
              setDataForm({ label: '', value: '', sort: 0, remark: '' });
              setShowDataModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            新建数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dict Types List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索字典类型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTypes.map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => setSelectedType(dt.type)}
                      className={`w-full text-left p-4 transition-colors ${
                        selectedType === dt.type
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/30 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="font-medium text-slate-800 dark:text-white">{dt.name}</div>
                      <code className="text-xs text-slate-500 dark:text-slate-400">{dt.type}</code>
                      <div className="text-xs text-slate-400 mt-1">{dt.description || '无描述'}</div>
                    </button>
                  ))}
                </div>
              )}
              {filteredTypes.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无字典类型
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dict Data Table */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white">
                {selectedType ? `字典数据: ${selectedType}` : '请选择字典类型'}
              </h3>
            </div>
            {selectedType ? (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">标签</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">键值</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">排序</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">备注</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {dictData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-slate-800 dark:text-white">{item.label}</td>
                      <td className="px-4 py-3">
                        <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                          {item.value}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.sort}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{item.remark || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                请从左侧选择字典类型
              </div>
            )}
            {selectedType && dictData.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                该类型下暂无数据
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">新建字典类型</h3>
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">类型名称</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">类型编码</label>
                <input
                  type="text"
                  value={typeForm.type}
                  onChange={(e) => setTypeForm({ ...typeForm, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="如: sys_user_status"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                <input
                  type="text"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">创建</Button>
                <Button type="button" variant="secondary" onClick={() => setShowTypeModal(false)} className="flex-1">取消</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Modal */}
      {showDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">新建字典数据</h3>
            <form onSubmit={handleDataSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">标签</label>
                <input
                  type="text"
                  value={dataForm.label}
                  onChange={(e) => setDataForm({ ...dataForm, label: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="显示文本"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">键值</label>
                <input
                  type="text"
                  value={dataForm.value}
                  onChange={(e) => setDataForm({ ...dataForm, value: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                  placeholder="存储值"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">排序</label>
                <input
                  type="number"
                  value={dataForm.sort}
                  onChange={(e) => setDataForm({ ...dataForm, sort: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">备注</label>
                <input
                  type="text"
                  value={dataForm.remark}
                  onChange={(e) => setDataForm({ ...dataForm, remark: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">创建</Button>
                <Button type="button" variant="secondary" onClick={() => setShowDataModal(false)} className="flex-1">取消</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

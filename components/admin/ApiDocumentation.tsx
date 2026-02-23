/**
 * API接口文档模块
 * 展示系统所有API接口
 */

import React, { useState, useMemo } from 'react';
import { 
  Globe, Search, Copy, Check, ChevronDown, ChevronRight,
  Code, Lock, Unlock, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  tags: string[];
  requiresAuth: boolean;
  parameters?: {
    name: string;
    in: 'path' | 'query' | 'body';
    type: string;
    required: boolean;
    description: string;
  }[];
  responses?: {
    code: number;
    description: string;
    schema?: string;
  }[];
}

const apiEndpoints: ApiEndpoint[] = [
  // 认证接口
  {
    method: 'POST',
    path: '/api/auth/login',
    summary: '用户登录',
    tags: ['认证'],
    requiresAuth: false,
    parameters: [
      { name: 'username', in: 'body', type: 'string', required: true, description: '用户名' },
      { name: 'password', in: 'body', type: 'string', required: true, description: '密码' }
    ],
    responses: [
      { code: 200, description: '登录成功', schema: '{ access_token, user }' },
      { code: 401, description: '认证失败' }
    ]
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    summary: '用户注册',
    tags: ['认证'],
    requiresAuth: false,
    parameters: [
      { name: 'username', in: 'body', type: 'string', required: true, description: '用户名' },
      { name: 'password', in: 'body', type: 'string', required: true, description: '密码' }
    ],
    responses: [
      { code: 201, description: '注册成功' },
      { code: 400, description: '用户名已存在' }
    ]
  },
  // 用户接口
  {
    method: 'GET',
    path: '/api/users',
    summary: '获取用户列表',
    tags: ['用户'],
    requiresAuth: true,
    parameters: [
      { name: 'page', in: 'query', type: 'number', required: false, description: '页码' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: '每页数量' }
    ],
    responses: [
      { code: 200, description: '成功', schema: '{ users[], total }' }
    ]
  },
  {
    method: 'GET',
    path: '/api/users/{id}',
    summary: '获取用户详情',
    tags: ['用户'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '用户ID' }
    ],
    responses: [
      { code: 200, description: '成功' },
      { code: 404, description: '用户不存在' }
    ]
  },
  {
    method: 'PUT',
    path: '/api/users/{id}',
    summary: '更新用户信息',
    tags: ['用户'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '用户ID' },
      { name: 'data', in: 'body', type: 'object', required: true, description: '用户数据' }
    ],
    responses: [
      { code: 200, description: '更新成功' }
    ]
  },
  {
    method: 'DELETE',
    path: '/api/users/{id}',
    summary: '删除用户',
    tags: ['用户'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '用户ID' }
    ],
    responses: [
      { code: 200, description: '删除成功' }
    ]
  },
  // 日志接口
  {
    method: 'GET',
    path: '/api/entries',
    summary: '获取日志列表',
    tags: ['日志'],
    requiresAuth: true,
    parameters: [
      { name: 'type', in: 'query', type: 'string', required: false, description: '日志类型' },
      { name: 'category', in: 'query', type: 'string', required: false, description: '分类' }
    ],
    responses: [
      { code: 200, description: '成功' }
    ]
  },
  {
    method: 'POST',
    path: '/api/entries',
    summary: '创建日志',
    tags: ['日志'],
    requiresAuth: true,
    parameters: [
      { name: 'data', in: 'body', type: 'object', required: true, description: '日志数据' }
    ],
    responses: [
      { code: 201, description: '创建成功' }
    ]
  },
  {
    method: 'PUT',
    path: '/api/entries/{id}',
    summary: '更新日志',
    tags: ['日志'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '日志ID' },
      { name: 'data', in: 'body', type: 'object', required: true, description: '日志数据' }
    ],
    responses: [
      { code: 200, description: '更新成功' }
    ]
  },
  {
    method: 'DELETE',
    path: '/api/entries/{id}',
    summary: '删除日志',
    tags: ['日志'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '日志ID' }
    ],
    responses: [
      { code: 200, description: '删除成功' }
    ]
  },
  // 管理接口
  {
    method: 'GET',
    path: '/api/admin/users',
    summary: '获取所有用户(管理员)',
    tags: ['管理'],
    requiresAuth: true,
    responses: [
      { code: 200, description: '成功' },
      { code: 403, description: '无权限' }
    ]
  },
  {
    method: 'PUT',
    path: '/api/admin/users/{id}/status',
    summary: '更新用户状态',
    tags: ['管理'],
    requiresAuth: true,
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: '用户ID' },
      { name: 'status', in: 'body', type: 'string', required: true, description: '状态' }
    ],
    responses: [
      { code: 200, description: '更新成功' }
    ]
  },
  {
    method: 'GET',
    path: '/api/admin/stats',
    summary: '获取系统统计',
    tags: ['管理'],
    requiresAuth: true,
    responses: [
      { code: 200, description: '成功' }
    ]
  },
  {
    method: 'GET',
    path: '/api/admin/roles',
    summary: '获取角色列表',
    tags: ['管理'],
    requiresAuth: true,
    responses: [
      { code: 200, description: '成功' }
    ]
  },
  {
    method: 'POST',
    path: '/api/admin/roles',
    summary: '创建角色',
    tags: ['管理'],
    requiresAuth: true,
    parameters: [
      { name: 'data', in: 'body', type: 'object', required: true, description: '角色数据' }
    ],
    responses: [
      { code: 201, description: '创建成功' }
    ]
  }
];

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-green-500/20', text: 'text-green-400' },
  POST: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  PUT: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  DELETE: { bg: 'bg-red-500/20', text: 'text-red-400' }
};

export const ApiDocumentation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    apiEndpoints.forEach(ep => ep.tags.forEach(tag => tagSet.add(tag)));
    return ['all', ...Array.from(tagSet)];
  }, []);

  const filteredEndpoints = useMemo(() => {
    return apiEndpoints.filter(ep => {
      const matchesSearch = 
        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === 'all' || ep.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, selectedTag]);

  const toggleEndpoint = (path: string) => {
    const newSet = new Set(expandedEndpoints);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setExpandedEndpoints(newSet);
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="text-primary-500" />
            API接口文档
          </h2>
          <p className="text-slate-400 mt-1">系统所有API接口说明</p>
        </div>
        <div className="text-sm text-slate-400">
          共 {apiEndpoints.length} 个接口
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索接口路径或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:border-primary-500 outline-none"
            />
          </div>
          
          {/* Tag Filter */}
          <div className="flex items-center gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedTag === tag
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tag === 'all' ? '全部' : tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="divide-y divide-slate-700">
          {filteredEndpoints.map((endpoint) => {
            const methodStyle = methodColors[endpoint.method];
            const isExpanded = expandedEndpoints.has(endpoint.path + endpoint.method);

            return (
              <div key={endpoint.path + endpoint.method} className="hover:bg-slate-700/30">
                {/* Header */}
                <div
                  onClick={() => toggleEndpoint(endpoint.path + endpoint.method)}
                  className="flex items-center gap-4 p-4 cursor-pointer"
                >
                  <span className={`px-2 py-1 rounded text-xs font-bold ${methodStyle.bg} ${methodStyle.text}`}>
                    {endpoint.method}
                  </span>
                  <code 
                    className="text-sm text-white font-mono flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPath(endpoint.path);
                    }}
                  >
                    {endpoint.path}
                    {copiedPath === endpoint.path && (
                      <Check size={14} className="inline ml-2 text-green-400" />
                    )}
                  </code>
                  <span className="text-sm text-slate-400">{endpoint.summary}</span>
                  <span className="flex items-center gap-1">
                    {endpoint.requiresAuth ? (
                      <Lock size={14} className="text-orange-400" title="需要认证" />
                    ) : (
                      <Unlock size={14} className="text-green-400" title="无需认证" />
                    )}
                  </span>
                  <ChevronRight 
                    size={16} 
                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                </div>

                {/* Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700 bg-slate-700/20">
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Parameters */}
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">参数</h4>
                          <div className="bg-slate-700/50 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-600">
                                  <th className="px-3 py-2 text-left">名称</th>
                                  <th className="px-3 py-2 text-left">位置</th>
                                  <th className="px-3 py-2 text-left">类型</th>
                                  <th className="px-3 py-2 text-center">必填</th>
                                  <th className="px-3 py-2 text-left">说明</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-600">
                                {endpoint.parameters.map((param, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 text-white font-mono">{param.name}</td>
                                    <td className="px-3 py-2 text-slate-300">{param.in}</td>
                                    <td className="px-3 py-2 text-blue-400">{param.type}</td>
                                    <td className="px-3 py-2 text-center">
                                      {param.required ? (
                                        <span className="text-red-400">是</span>
                                      ) : (
                                        <span className="text-slate-500">否</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-slate-400">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Responses */}
                      {endpoint.responses && endpoint.responses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">响应</h4>
                          <div className="space-y-2">
                            {endpoint.responses.map((resp, i) => (
                              <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    resp.code >= 200 && resp.code < 300
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {resp.code}
                                  </span>
                                  <span className="text-slate-300">{resp.description}</span>
                                </div>
                                {resp.schema && (
                                  <code className="text-xs text-slate-400 block mt-1">
                                    {resp.schema}
                                  </code>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Globe className="mx-auto mb-4 opacity-50" size={48} />
            <p>没有找到匹配的接口</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiDocumentation;

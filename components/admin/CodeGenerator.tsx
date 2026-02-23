/**
 * 代码生成器模块
 * 自动生成CRUD代码
 */

import React, { useState } from 'react';
import { 
  Code, Play, Copy, Download, RefreshCw, Settings,
  FileCode, Database, Table, Check, ChevronDown,
  Sparkles, Zap
} from 'lucide-react';
import { Button } from '../Button';

interface TableInfo {
  name: string;
  comment: string;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  comment: string;
  isPrimary: boolean;
  isNullable: boolean;
}

interface GenerateConfig {
  tableName: string;
  moduleName: string;
  businessName: string;
  functionName: string;
  author: string;
  packageName: string;
  generateType: 'all' | 'frontend' | 'backend';
  templateType: 'crud' | 'tree' | 'sub';
}

const mockTables: TableInfo[] = [
  {
    name: 'sys_user',
    comment: '用户信息表',
    columns: [
      { name: 'user_id', type: 'VARCHAR(36)', comment: '用户ID', isPrimary: true, isNullable: false },
      { name: 'username', type: 'VARCHAR(50)', comment: '用户名', isPrimary: false, isNullable: false },
      { name: 'password', type: 'VARCHAR(255)', comment: '密码', isPrimary: false, isNullable: false },
      { name: 'email', type: 'VARCHAR(100)', comment: '邮箱', isPrimary: false, isNullable: true },
      { name: 'phone', type: 'VARCHAR(20)', comment: '手机号', isPrimary: false, isNullable: true },
      { name: 'status', type: 'TINYINT', comment: '状态', isPrimary: false, isNullable: false },
      { name: 'created_at', type: 'DATETIME', comment: '创建时间', isPrimary: false, isNullable: false }
    ]
  },
  {
    name: 'sys_role',
    comment: '角色表',
    columns: [
      { name: 'role_id', type: 'VARCHAR(36)', comment: '角色ID', isPrimary: true, isNullable: false },
      { name: 'role_name', type: 'VARCHAR(50)', comment: '角色名称', isPrimary: false, isNullable: false },
      { name: 'role_code', type: 'VARCHAR(50)', comment: '角色编码', isPrimary: false, isNullable: false },
      { name: 'description', type: 'VARCHAR(200)', comment: '描述', isPrimary: false, isNullable: true }
    ]
  },
  {
    name: 'sys_config',
    comment: '系统配置表',
    columns: [
      { name: 'config_id', type: 'VARCHAR(36)', comment: '配置ID', isPrimary: true, isNullable: false },
      { name: 'config_key', type: 'VARCHAR(100)', comment: '配置键', isPrimary: false, isNullable: false },
      { name: 'config_value', type: 'TEXT', comment: '配置值', isPrimary: false, isNullable: true },
      { name: 'config_type', type: 'VARCHAR(20)', comment: '值类型', isPrimary: false, isNullable: false }
    ]
  }
];

export const CodeGenerator: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [config, setConfig] = useState<GenerateConfig>({
    tableName: '',
    moduleName: 'system',
    businessName: '',
    functionName: '',
    author: 'admin',
    packageName: 'com.qieyu',
    generateType: 'all',
    templateType: 'crud'
  });
  const [generatedCode, setGeneratedCode] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState('frontend');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectTable = (table: TableInfo) => {
    setSelectedTable(table);
    setConfig({
      ...config,
      tableName: table.name,
      businessName: table.name.replace('sys_', ''),
      functionName: table.comment.replace('表', '')
    });
  };

  const handleGenerate = async () => {
    if (!selectedTable) {
      alert('请先选择数据表');
      return;
    }
    
    setIsGenerating(true);
    
    // 模拟生成代码
    setTimeout(() => {
      const businessName = config.businessName;
      const className = businessName.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
      
      setGeneratedCode({
        frontend: generateFrontendCode(className, selectedTable),
        backend: generateBackendCode(className, selectedTable, config),
        api: generateApiCode(className, selectedTable),
        sql: generateSqlCode(className, selectedTable)
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('已复制到剪贴板');
  };

  const handleDownload = () => {
    const content = Object.entries(generatedCode)
      .map(([key, code]) => `// ===== ${key.toUpperCase()} =====\n\n${code}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.businessName}_code.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code className="text-primary-500" />
            代码生成
          </h2>
          <p className="text-slate-400 mt-1">自动生成CRUD代码，提高开发效率</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            className="flex items-center gap-2"
            disabled={!selectedTable || isGenerating}
          >
            {isGenerating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            生成代码
          </Button>
          {Object.keys(generatedCode).length > 0 && (
            <Button
              onClick={handleDownload}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download size={16} />
              下载代码
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 表选择 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Table size={18} className="text-blue-500" />
              选择数据表
            </h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {mockTables.map((table) => (
              <div
                key={table.name}
                onClick={() => handleSelectTable(table)}
                className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
                  selectedTable?.name === table.name
                    ? 'bg-primary-500/20 border-l-4 border-l-primary-500'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <div className="font-medium text-white">{table.name}</div>
                <div className="text-sm text-slate-400">{table.comment}</div>
                <div className="text-xs text-slate-500 mt-1">{table.columns.length} 个字段</div>
              </div>
            ))}
          </div>
        </div>

        {/* 配置 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Settings size={18} className="text-green-500" />
            生成配置
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">模块名称</label>
              <input
                type="text"
                value={config.moduleName}
                onChange={(e) => setConfig({ ...config, moduleName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">业务名称</label>
              <input
                type="text"
                value={config.businessName}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">功能名称</label>
              <input
                type="text"
                value={config.functionName}
                onChange={(e) => setConfig({ ...config, functionName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">作者</label>
              <input
                type="text"
                value={config.author}
                onChange={(e) => setConfig({ ...config, author: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">生成类型</label>
              <select
                value={config.generateType}
                onChange={(e) => setConfig({ ...config, generateType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="all">全部代码</option>
                <option value="frontend">仅前端</option>
                <option value="backend">仅后端</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">模板类型</label>
              <select
                value={config.templateType}
                onChange={(e) => setConfig({ ...config, templateType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="crud">单表CRUD</option>
                <option value="tree">树表结构</option>
                <option value="sub">主子表</option>
              </select>
            </div>
          </div>
          
          {/* 表字段预览 */}
          {selectedTable && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-300 mb-2">字段预览</h4>
              <div className="bg-slate-700/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {selectedTable.columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-slate-300">{col.name}</span>
                    <span className="text-slate-500">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 代码预览 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode size={18} className="text-purple-500" />
              <h3 className="font-semibold text-white">代码预览</h3>
            </div>
            {generatedCode[activeTab] && (
              <button
                onClick={() => handleCopy(generatedCode[activeTab])}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                <Copy size={16} />
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {['frontend', 'backend', 'api', 'sql'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 text-sm transition-colors ${
                  activeTab === tab
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-slate-700/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'frontend' ? '前端' : 
                 tab === 'backend' ? '后端' : 
                 tab === 'api' ? 'API' : 'SQL'}
              </button>
            ))}
          </div>
          
          {/* Code */}
          <div className="p-4 h-[400px] overflow-y-auto">
            {generatedCode[activeTab] ? (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {generatedCode[activeTab]}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Sparkles size={48} className="mb-4 opacity-50" />
                <p>选择数据表并点击生成</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 生成前端代码
function generateFrontendCode(className: string, table: TableInfo): string {
  return `import React, { useState, useEffect } from 'react';
import { ${className} } from './types';

export const ${className}Management: React.FC = () => {
  const [data, setData] = useState<${className}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // const response = await api.get${className}s();
      // setData(response.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2>${table.comment}管理</h2>
      {/* TODO: 实现表格和表单 */}
    </div>
  );
};
`;
}

// 生成后端代码
function generateBackendCode(className: string, table: TableInfo, config: GenerateConfig): string {
  return `/**
 * ${config.functionName}控制器
 * @author ${config.author}
 */
@RestController
@RequestMapping('/${config.moduleName}/${config.businessName}')
public class ${className}Controller {
    
    @Autowired
    private ${className}Service ${config.businessName}Service;
    
    @GetMapping('/list')
    public Result list(${className}Query query) {
        return ${config.businessName}Service.selectList(query);
    }
    
    @GetMapping('/{id}')
    public Result getInfo(@PathVariable String id) {
        return ${config.businessName}Service.selectById(id);
    }
    
    @PostMapping
    public Result add(@RequestBody ${className} entity) {
        return ${config.businessName}Service.insert(entity);
    }
    
    @PutMapping
    public Result edit(@RequestBody ${className} entity) {
        return ${config.businessName}Service.update(entity);
    }
    
    @DeleteMapping('/{ids}')
    public Result remove(@PathVariable String[] ids) {
        return ${config.businessName}Service.deleteByIds(ids);
    }
}
`;
}

// 生成API代码
function generateApiCode(className: string, table: TableInfo): string {
  return `// ${table.comment} API
export const get${className}List = (params: any) => {
  return request.get('/api/${table.name.replace('sys_', '')}', { params });
};

export const get${className}ById = (id: string) => {
  return request.get(\`/api/${table.name.replace('sys_', '')}/\${id}\`);
};

export const create${className} = (data: any) => {
  return request.post('/api/${table.name.replace('sys_', '')}', data);
};

export const update${className} = (id: string, data: any) => {
  return request.put(\`/api/${table.name.replace('sys_', '')}/\${id}\`, data);
};

export const delete${className} = (id: string) => {
  return request.delete(\`/api/${table.name.replace('sys_', '')}/\${id}\`);
};
`;
}

// 生成SQL代码
function generateSqlCode(className: string, table: TableInfo): string {
  return `-- ${table.comment}
CREATE TABLE IF NOT EXISTS ${table.name} (
${table.columns.map(col => 
  `  ${col.name} ${col.type}${col.isNullable ? '' : ' NOT NULL'}${col.isPrimary ? ' PRIMARY KEY' : ''} COMMENT '${col.comment}'`
).join(',\n')}
) COMMENT='${table.comment}';
`;
}

export default CodeGenerator;

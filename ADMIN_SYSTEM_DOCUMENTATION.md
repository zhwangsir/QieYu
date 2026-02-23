
# 切语笔记 - 后端管理系统功能文档

## 一、现有功能清单

### 1. 数据概览模块 (Dashboard)
- **功能描述**: 展示系统核心数据指标
- **已有功能**:
  - 用户总数统计
  - 日志总数统计
  - 资源总数统计
  - 最近注册用户列表
  - 系统公告列表
  - 存储使用情况（模拟数据）

### 2. 用户管理模块 (User Management)
- **功能描述**: 管理系统用户信息
- **已有功能**:
  - 查看所有用户列表
  - 冻结/解冻用户账号
  - 删除用户账号
  - 查看用户基本信息（用户名、角色、状态、注册时间）
- **待完善**:
  - 用户详情查看
  - 用户角色分配
  - 批量操作
  - 用户搜索筛选

### 3. 审计日志模块 (Audit Log)
- **功能描述**: 记录系统操作日志
- **已有功能**:
  - 查看操作日志列表
  - 记录操作类型（UPDATE_STATUS, DELETE_USER, DELETE_CHAT）
  - 记录操作人、时间、详情
- **待完善**:
  - 日志筛选（按时间、模块、操作人）
  - 日志导出
  - 日志清理策略

### 4. 聊天管理模块 (Chat Management)
- **功能描述**: 管理聊天消息
- **已有功能**:
  - 查看聊天消息列表
  - 删除聊天消息
- **待完善**:
  - 敏感词过滤
  - 消息审核
  - 聊天记录导出

### 5. 公告管理模块 (Announcement)
- **功能描述**: 管理系统公告
- **已有功能**:
  - 发布公告
  - 删除公告
  - 查看公告列表
- **待完善**:
  - 公告编辑
  - 公告置顶
  - 公告类型管理

### 6. 文件管理模块 (File Management)
- **功能描述**: 管理系统文件
- **已有功能**:
  - 查看文件列表（基于日志图片）
- **待完善**:
  - 实际上传文件管理
  - 文件分类
  - 文件存储统计
  - 文件清理

---

## 二、新增功能模块设计

### 1. 角色权限管理 (RBAC)

#### 数据库表设计
```sql
-- 角色表
CREATE TABLE sys_role (
    role_id VARCHAR(36) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    description VARCHAR(200) COMMENT '角色描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_code (role_code)
);

-- 权限表
CREATE TABLE sys_permission (
    permission_id VARCHAR(36) PRIMARY KEY,
    permission_name VARCHAR(50) NOT NULL COMMENT '权限名称',
    permission_code VARCHAR(100) NOT NULL COMMENT '权限编码',
    module VARCHAR(50) COMMENT '所属模块',
    description VARCHAR(200) COMMENT '权限描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE sys_role_permission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES sys_role(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES sys_permission(permission_id) ON DELETE CASCADE
);

-- 用户角色关联表（扩展现有用户表）
ALTER TABLE sys_user ADD COLUMN role_id VARCHAR(36);
```

#### 功能点
- 角色增删改查
- 权限树形管理
- 角色权限分配
- 用户角色分配
- 权限校验中间件

### 2. 系统配置管理

#### 数据库表设计
```sql
CREATE TABLE sys_config (
    config_id VARCHAR(36) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type VARCHAR(20) DEFAULT 'string' COMMENT '值类型: string/number/boolean/json',
    description VARCHAR(200) COMMENT '配置说明',
    is_system TINYINT DEFAULT 0 COMMENT '是否系统内置: 1是 0否',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_key (config_key)
);
```

#### 功能点
- 配置项增删改查
- 配置项分类管理
- 配置缓存机制
- 配置导入导出

### 3. 字典管理

#### 数据库表设计
```sql
-- 字典类型表
CREATE TABLE sys_dict_type (
    dict_id VARCHAR(36) PRIMARY KEY,
    dict_name VARCHAR(50) NOT NULL COMMENT '字典名称',
    dict_type VARCHAR(50) NOT NULL COMMENT '字典类型编码',
    description VARCHAR(200) COMMENT '字典描述',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dict_type (dict_type)
);

-- 字典数据表
CREATE TABLE sys_dict_data (
    data_id VARCHAR(36) PRIMARY KEY,
    dict_type VARCHAR(50) NOT NULL COMMENT '字典类型',
    dict_label VARCHAR(100) NOT NULL COMMENT '字典标签',
    dict_value VARCHAR(100) NOT NULL COMMENT '字典键值',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    remark VARCHAR(200) COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dict_type) REFERENCES sys_dict_type(dict_type) ON DELETE CASCADE
);
```

#### 功能点
- 字典类型管理
- 字典数据管理
- 字典缓存
- 字典导入导出

### 4. 定时任务管理

#### 数据库表设计
```sql
CREATE TABLE sys_job (
    job_id VARCHAR(36) PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL COMMENT '任务名称',
    job_group VARCHAR(50) DEFAULT 'DEFAULT' COMMENT '任务组',
    cron_expression VARCHAR(100) NOT NULL COMMENT 'Cron表达式',
    invoke_target VARCHAR(500) NOT NULL COMMENT '调用目标',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    concurrent TINYINT DEFAULT 1 COMMENT '是否并发: 1允许 0禁止',
    description VARCHAR(200) COMMENT '任务描述',
    last_run_time DATETIME COMMENT '上次执行时间',
    next_run_time DATETIME COMMENT '下次执行时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 任务执行日志
CREATE TABLE sys_job_log (
    log_id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL,
    job_name VARCHAR(100) NOT NULL,
    job_group VARCHAR(50) NOT NULL,
    invoke_target VARCHAR(500),
    status TINYINT COMMENT '执行状态: 1成功 0失败',
    error_msg TEXT COMMENT '错误信息',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 功能点
- 定时任务CRUD
- Cron表达式生成器
- 任务执行日志
- 任务手动触发
- 任务并发控制

### 5. 数据备份与恢复

#### 功能点
- 数据库备份（全量/增量）
- 定时自动备份
- 备份文件管理
- 数据恢复
- 备份策略配置

### 6. 系统监控

#### 功能点
- 服务器性能监控（CPU、内存、磁盘）
- 在线用户监控
- 操作日志实时监控
- 异常日志监控
- 系统通知告警

---

## 三、UI界面优化方案

### 1. 整体布局优化
- 采用现代化侧边栏 + 顶部导航布局
- 响应式设计，支持移动端适配
- 深色/浅色主题切换
- 可折叠侧边栏

### 2. 数据表格优化
- 支持列自定义显示/隐藏
- 支持列拖拽排序
- 支持表格数据导出（Excel/CSV）
- 支持批量操作
- 支持分页、排序、筛选

### 3. 表单优化
- 表单验证实时反馈
- 表单自动保存草稿
- 富文本编辑器
- 图片上传预览
- 日期时间选择器

### 4. 图表可视化
- 数据概览使用图表展示
- 支持 ECharts/AntV 图表库
- 实时数据刷新

---

## 四、后端API规划

### 角色权限管理API
```
GET    /api/admin/roles              # 获取角色列表
POST   /api/admin/roles              # 创建角色
PUT    /api/admin/roles/:id          # 更新角色
DELETE /api/admin/roles/:id          # 删除角色
GET    /api/admin/permissions        # 获取权限树
POST   /api/admin/roles/:id/permissions  # 分配权限
```

### 系统配置API
```
GET    /api/admin/configs            # 获取配置列表
POST   /api/admin/configs            # 创建配置
PUT    /api/admin/configs/:id        # 更新配置
DELETE /api/admin/configs/:id        # 删除配置
GET    /api/admin/configs/:key       # 获取指定配置
```

### 字典管理API
```
GET    /api/admin/dict-types         # 获取字典类型列表
POST   /api/admin/dict-types         # 创建字典类型
PUT    /api/admin/dict-types/:id     # 更新字典类型
DELETE /api/admin/dict-types/:id     # 删除字典类型
GET    /api/admin/dict-data          # 获取字典数据列表
POST   /api/admin/dict-data          # 创建字典数据
PUT    /api/admin/dict-data/:id      # 更新字典数据
DELETE /api/admin/dict-data/:id      # 删除字典数据
```

### 定时任务API
```
GET    /api/admin/jobs               # 获取任务列表
POST   /api/admin/jobs               # 创建任务
PUT    /api/admin/jobs/:id           # 更新任务
DELETE /api/admin/jobs/:id           # 删除任务
POST   /api/admin/jobs/:id/run       # 立即执行任务
GET    /api/admin/jobs/:id/logs      # 获取任务日志
```

### 数据备份API
```
POST   /api/admin/backup             # 执行备份
GET    /api/admin/backups            # 获取备份列表
POST   /api/admin/backups/:id/restore # 恢复备份
DELETE /api/admin/backups/:id        # 删除备份
```

---

## 五、实施计划

### 第一阶段：基础功能完善
1. 优化现有用户管理模块
2. 完善审计日志功能
3. 优化公告管理

### 第二阶段：核心功能开发
1. 角色权限管理系统
2. 系统配置管理
3. 字典管理

### 第三阶段：高级功能开发
1. 定时任务管理
2. 数据备份与恢复
3. 系统监控

### 第四阶段：UI优化
1. 整体布局重构
2. 数据表格优化
3. 图表可视化

---

## 六、参考系统

- **RuoYi**: 优秀的权限管理系统设计
- **Halo**: 现代化的后台管理界面
- **Ant Design Pro**: 企业级中后台前端解决方案

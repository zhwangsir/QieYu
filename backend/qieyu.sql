-- =====================================================
-- QieYu 日志库系统 - 数据库结构
-- 版本: 1.0
-- =====================================================

CREATE DATABASE IF NOT EXISTS qieyu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE qieyu;

-- =====================================================
-- 1. 用户表 (User)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_user (
    user_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '加密后的密码',
    avatar LONGTEXT COMMENT '头像URL或Base64',
    bio VARCHAR(500) DEFAULT '' COMMENT '个人简介',
    cover_image LONGTEXT COMMENT '个人主页背景图URL或Base64',
    role VARCHAR(20) DEFAULT 'user' COMMENT '角色: user/admin',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/banned',
    theme VARCHAR(50) DEFAULT 'cupertino' COMMENT '主题',
    theme_mode VARCHAR(20) DEFAULT 'light' COMMENT '主题模式: light/dark',
    chat_background LONGTEXT COMMENT '聊天背景图',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_role (role)
) COMMENT='用户信息表';

-- 插入默认管理员账户 (密码: admin123)
-- 注意：生产环境请修改默认密码
-- 密码使用 bcrypt 加密，salt rounds = 10
INSERT IGNORE INTO sys_user (user_id, username, password, role, status, bio, avatar, theme) VALUES
('admin-0000-0000-0000-000000000001', 'admin', '$2a$10$EIPehQSzhKCofGH3eunluOD.AMemJEfrsgO3r1T2zVO3tTcpMIb0m', 'admin', 'active', '系统管理员', 'bg-red-500', 'violet');

-- =====================================================
-- 2. 好友关系表 (Friends)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_friend (
    user_id VARCHAR(36) NOT NULL,
    friend_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'accepted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

-- =====================================================
-- 3. 好友请求表 (Friend Requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_friend_request (
    request_id VARCHAR(36) PRIMARY KEY,
    from_user_id VARCHAR(36) NOT NULL,
    to_user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. 日志主表 (Log Entry)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_log_entry (
    entry_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    user_id VARCHAR(36) NOT NULL COMMENT '作者ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    log_type VARCHAR(20) NOT NULL COMMENT '日志类型: comfyui/midjourney/fooocus/webui/coding/modeling/editing/general/life/gaming',
    category VARCHAR(50) DEFAULT '未分类' COMMENT '分类',
    image_url LONGTEXT COMMENT '主图URL',
    media_type VARCHAR(10) DEFAULT 'image' COMMENT '媒体类型: image/video',
    positive_prompt TEXT COMMENT '正向提示词(AI绘图)',
    negative_prompt TEXT COMMENT '反向提示词(AI绘图)',
    steps INT DEFAULT 20 COMMENT '采样步数',
    cfg_scale FLOAT DEFAULT 7.0 COMMENT 'CFG Scale',
    sampler VARCHAR(50) COMMENT '采样器',
    scheduler VARCHAR(50) COMMENT '调度器',
    seed VARCHAR(100) COMMENT '随机种子',
    code_snippet LONGTEXT COMMENT '代码片段(编程类型)',
    tech_stack JSON COMMENT '技术栈(编程类型)',
    difficulty VARCHAR(20) COMMENT '难度: beginner/easy/medium/hard/expert',
    progress INT DEFAULT 0 COMMENT '进度 0-100',
    rating INT COMMENT '评分 1-10',
    notes LONGTEXT COMMENT '笔记内容',
    is_public TINYINT(1) DEFAULT 1 COMMENT '是否公开: 1公开 0私密',
    view_count INT DEFAULT 0 COMMENT '浏览数',
    like_count INT DEFAULT 0 COMMENT '点赞数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_log_type (log_type),
    INDEX idx_category (category),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX ft_title (title),
    FULLTEXT INDEX ft_notes (notes)
) COMMENT='学习日志主表';

-- =====================================================
-- 5. 资源关联表 (AI模型/插件/工具等)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_resource (
    resource_id VARCHAR(36) PRIMARY KEY,
    entry_id VARCHAR(36) NOT NULL COMMENT '关联的日志ID',
    name VARCHAR(100) NOT NULL COMMENT '资源名称',
    type VARCHAR(50) NOT NULL COMMENT '资源类型: Checkpoint/Lora/Blender插件/PR插件等',
    weight FLOAT DEFAULT 1.0 COMMENT '权重(AI模型的Lora)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES sys_log_entry(entry_id) ON DELETE CASCADE,
    INDEX idx_entry_id (entry_id),
    INDEX idx_type (type)
) COMMENT='日志资源关联表';

-- =====================================================
-- 6. 标签表
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_tag (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id VARCHAR(36) NOT NULL COMMENT '关联的日志ID',
    tag_name VARCHAR(50) NOT NULL COMMENT '标签名称',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES sys_log_entry(entry_id) ON DELETE CASCADE,
    INDEX idx_entry_id (entry_id),
    INDEX idx_tag_name (tag_name),
    UNIQUE KEY uk_entry_tag (entry_id, tag_name)
) COMMENT='日志标签表';

-- =====================================================
-- 7. 分类字典表
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    log_type VARCHAR(20) NOT NULL COMMENT '日志类型',
    created_by VARCHAR(36) COMMENT '创建者ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES sys_user(user_id) ON DELETE SET NULL,
    UNIQUE KEY uk_type_name (log_type, name),
    INDEX idx_log_type (log_type)
) COMMENT='分类字典表';

-- =====================================================
-- 8. 点赞表
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_like (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    entry_id VARCHAR(36) NOT NULL COMMENT '日志ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, entry_id),
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES sys_log_entry(entry_id) ON DELETE CASCADE,
    INDEX idx_entry_id (entry_id),
    INDEX idx_created_at (created_at)
) COMMENT='点赞记录表';

-- =====================================================
-- 9. 聊天消息表 (Chat)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_chat_message (
    message_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '发送者ID',
    recipient_id VARCHAR(36) COMMENT '接收者ID，NULL表示公共大厅',
    content LONGTEXT NOT NULL,
    msg_type VARCHAR(20) DEFAULT 'text' COMMENT '消息类型：text, image, file',
    related_entry_id VARCHAR(36) COMMENT '关联的日志ID',
    is_read BOOLEAN DEFAULT FALSE COMMENT '接收者是否已读',
    read_at DATETIME COMMENT '已读时间',
    is_deleted_by_sender BOOLEAN DEFAULT FALSE COMMENT '发送者是否删除',
    is_deleted_by_recipient BOOLEAN DEFAULT FALSE COMMENT '接收者是否删除',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    INDEX idx_recipient_read (recipient_id, is_read),
    INDEX idx_sender (user_id, created_at),
    INDEX idx_conversation (user_id, recipient_id, created_at)
) COMMENT='聊天消息表';

-- =====================================================
-- 10. 审计日志 (Audit)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) COMMENT '用户ID',
    username VARCHAR(50) COMMENT '用户名',
    action VARCHAR(50) COMMENT '操作类型',
    module VARCHAR(50) COMMENT '模块: AUTH/USER/CONTENT等',
    details TEXT COMMENT '详情',
    ip VARCHAR(50) COMMENT 'IP地址',
    status VARCHAR(20) COMMENT '状态: success/fail',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_module (module),
    INDEX idx_created_at (created_at)
) COMMENT='审计日志表';

-- =====================================================
-- 11. 消息通知表 (Message Notification)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_message_notification (
    notification_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '接收者ID',
    sender_id VARCHAR(36) NOT NULL COMMENT '发送者ID',
    message_id VARCHAR(36) COMMENT '关联的消息ID',
    content_preview VARCHAR(200) COMMENT '消息内容预览',
    unread_count INT DEFAULT 1 COMMENT '未读消息数量',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at DATETIME COMMENT '已读时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_sender (sender_id, created_at),
    UNIQUE KEY uk_user_sender (user_id, sender_id)
) COMMENT='消息通知表，用于消息提醒';

-- =====================================================
-- 11.1 系统通知表 (System Notification)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_notification (
    notification_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '接收者ID',
    type VARCHAR(20) NOT NULL COMMENT '类型: friend_request/friend_accept/message/announcement/system',
    title VARCHAR(100) NOT NULL COMMENT '标题',
    content TEXT COMMENT '内容',
    data JSON COMMENT '附加数据',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at DATETIME COMMENT '已读时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, type),
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at)
) COMMENT='系统通知表，用于各类通知消息';

-- =====================================================
-- 12. 公告表 (Announcement)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_announcement (
    ann_id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) COMMENT '公告标题',
    content TEXT COMMENT '公告内容',
    type VARCHAR(20) DEFAULT 'info' COMMENT '类型: info/warning/alert',
    is_active TINYINT DEFAULT 1 COMMENT '是否激活: 1是 0否',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_type (type)
) COMMENT='系统公告表';

-- =====================================================
-- 13. 文件管理表 (Files - Metadata only for DB, files on disk/S3 in real app)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_file (
    file_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) COMMENT '上传者ID',
    file_name VARCHAR(255) COMMENT '文件名',
    file_type VARCHAR(50) COMMENT '文件类型: image/video/audio/document',
    file_size INT COMMENT '文件大小(字节)',
    url LONGTEXT COMMENT '文件URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_file_type (file_type)
) COMMENT='文件管理表';

-- =====================================================
-- 14. 菜单/权限表 (Simplified)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_menu (
    menu_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) COMMENT '菜单名称',
    path VARCHAR(100) COMMENT '路由路径',
    icon VARCHAR(50) COMMENT '图标',
    role_required VARCHAR(20) DEFAULT 'user' COMMENT '所需角色: user/admin',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active TINYINT DEFAULT 1 COMMENT '是否激活',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_role (role_required),
    INDEX idx_sort (sort_order)
) COMMENT='菜单权限表';

-- =====================================================
-- 15. 系统配置表 (System Config)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_config (
    config_id VARCHAR(36) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type VARCHAR(20) DEFAULT 'string' COMMENT '值类型: string/number/boolean/json',
    description VARCHAR(200) COMMENT '配置说明',
    is_system TINYINT DEFAULT 0 COMMENT '是否系统内置: 1是 0否',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_key (config_key),
    INDEX idx_config_type (config_type)
) COMMENT='系统配置表';

-- =====================================================
-- 16. 角色表 (Role)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_role (
    role_id VARCHAR(36) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    description VARCHAR(200) COMMENT '角色描述',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_code (role_code),
    INDEX idx_role_status (status)
) COMMENT='角色表';

-- =====================================================
-- 17. 权限表 (Permission)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_permission (
    permission_id VARCHAR(36) PRIMARY KEY,
    permission_name VARCHAR(50) NOT NULL COMMENT '权限名称',
    permission_code VARCHAR(100) NOT NULL COMMENT '权限编码',
    module VARCHAR(50) COMMENT '所属模块',
    parent_id VARCHAR(36) COMMENT '父权限ID',
    permission_type VARCHAR(20) DEFAULT 'menu' COMMENT '类型: menu/button/api',
    sort_order INT DEFAULT 0 COMMENT '排序',
    description VARCHAR(200) COMMENT '权限描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_permission_code (permission_code),
    INDEX idx_permission_module (module),
    INDEX idx_permission_parent (parent_id)
) COMMENT='权限表';

-- =====================================================
-- 18. 角色权限关联表
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_role_permission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES sys_role(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES sys_permission(permission_id) ON DELETE CASCADE
) COMMENT='角色权限关联表';

-- =====================================================
-- 19. 字典类型表 (Dictionary Type)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_dict_type (
    dict_id VARCHAR(36) PRIMARY KEY,
    dict_name VARCHAR(50) NOT NULL COMMENT '字典名称',
    dict_type VARCHAR(50) NOT NULL COMMENT '字典类型编码',
    description VARCHAR(200) COMMENT '字典描述',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dict_type (dict_type),
    INDEX idx_dict_status (status)
) COMMENT='字典类型表';

-- =====================================================
-- 20. 字典数据表 (Dictionary Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_dict_data (
    data_id VARCHAR(36) PRIMARY KEY,
    dict_type VARCHAR(50) NOT NULL COMMENT '字典类型',
    dict_label VARCHAR(100) NOT NULL COMMENT '字典标签',
    dict_value VARCHAR(100) NOT NULL COMMENT '字典键值',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态: 1启用 0禁用',
    remark VARCHAR(200) COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_data_dict_type (dict_type),
    INDEX idx_data_status (status),
    INDEX idx_data_sort (sort_order)
) COMMENT='字典数据表';

-- =====================================================
-- 21. 定时任务表 (Job)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_job (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_status (status),
    INDEX idx_job_group (job_group)
) COMMENT='定时任务表';

-- =====================================================
-- 22. 定时任务日志表 (Job Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_job_log (
    log_id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    job_name VARCHAR(100) NOT NULL COMMENT '任务名称',
    job_group VARCHAR(50) NOT NULL COMMENT '任务组',
    invoke_target VARCHAR(500) COMMENT '调用目标',
    status TINYINT COMMENT '执行状态: 1成功 0失败',
    error_msg TEXT COMMENT '错误信息',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_log_job_id (job_id),
    INDEX idx_log_status (status),
    INDEX idx_log_created (created_at)
) COMMENT='定时任务日志表';

-- =====================================================
-- 23. 数据备份表 (Backup)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_backup (
    backup_id VARCHAR(36) PRIMARY KEY,
    backup_name VARCHAR(100) NOT NULL COMMENT '备份名称',
    backup_type VARCHAR(20) DEFAULT 'full' COMMENT '备份类型: full/incremental',
    file_path VARCHAR(500) COMMENT '备份文件路径',
    file_size BIGINT COMMENT '文件大小(字节)',
    description VARCHAR(200) COMMENT '备份描述',
    status VARCHAR(20) DEFAULT 'success' COMMENT '状态: success/failed/running',
    created_by VARCHAR(36) COMMENT '创建者ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_backup_type (backup_type),
    INDEX idx_backup_status (status)
) COMMENT='数据备份表';

-- =====================================================
-- 24. 初始化数据
-- =====================================================

-- 初始化角色数据
INSERT INTO sys_role (role_id, role_name, role_code, description, status) VALUES
('role_admin', '超级管理员', 'admin', '系统超级管理员，拥有所有权限', 1),
('role_user', '普通用户', 'user', '普通用户，拥有基本权限', 1)
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- 初始化权限数据
INSERT INTO sys_permission (permission_id, permission_name, permission_code, module, permission_type, sort_order, description) VALUES
('perm_dashboard', '数据概览', 'admin:dashboard:view', 'dashboard', 'menu', 1, '查看数据概览'),
('perm_user_view', '用户查看', 'admin:user:view', 'user', 'menu', 2, '查看用户列表'),
('perm_user_edit', '用户编辑', 'admin:user:edit', 'user', 'button', 3, '编辑用户信息'),
('perm_role_view', '角色查看', 'admin:role:view', 'role', 'menu', 4, '查看角色列表'),
('perm_role_edit', '角色编辑', 'admin:role:edit', 'role', 'button', 5, '编辑角色信息'),
('perm_config_view', '配置查看', 'admin:config:view', 'config', 'menu', 6, '查看系统配置'),
('perm_config_edit', '配置编辑', 'admin:config:edit', 'config', 'button', 7, '编辑系统配置'),
('perm_dict_view', '字典查看', 'admin:dict:view', 'dict', 'menu', 8, '查看数据字典'),
('perm_dict_edit', '字典编辑', 'admin:dict:edit', 'dict', 'button', 9, '编辑数据字典'),
('perm_job_view', '任务查看', 'admin:job:view', 'job', 'menu', 10, '查看定时任务'),
('perm_job_edit', '任务编辑', 'admin:job:edit', 'job', 'button', 11, '编辑定时任务'),
('perm_backup_view', '备份查看', 'admin:backup:view', 'backup', 'menu', 12, '查看数据备份'),
('perm_backup_edit', '备份编辑', 'admin:backup:edit', 'backup', 'button', 13, '编辑数据备份')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name);

-- 为超级管理员分配所有权限
INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 'role_admin', permission_id FROM sys_permission
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 初始化系统配置
INSERT INTO sys_config (config_id, config_key, config_value, config_type, description, is_system) VALUES
('config_site_name', 'site.name', '切语笔记', 'string', '网站名称', 1),
('config_site_desc', 'site.description', '一个优雅的日志管理系统', 'string', '网站描述', 1),
('config_site_logo', 'site.logo', '/logo.png', 'string', '网站Logo', 1),
('config_user_reg', 'user.registration.enabled', 'true', 'boolean', '是否开放用户注册', 1),
('config_upload_max', 'upload.maxSize', '10485760', 'number', '最大上传文件大小(字节)', 1)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 初始化字典类型
INSERT INTO sys_dict_type (dict_id, dict_name, dict_type, description, status) VALUES
('dict_user_status', '用户状态', 'sys_user_status', '用户账号状态', 1),
('dict_log_type', '日志类型', 'sys_log_type', '系统日志类型', 1),
('dict_job_status', '任务状态', 'sys_job_status', '定时任务状态', 1)
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name);

-- 初始化字典数据
INSERT INTO sys_dict_data (data_id, dict_type, dict_label, dict_value, sort_order, status, remark) VALUES
('data_user_active', 'sys_user_status', '正常', 'active', 1, 1, '用户正常状态'),
('data_user_frozen', 'sys_user_status', '冻结', 'frozen', 2, 1, '用户被冻结'),
('data_log_info', 'sys_log_type', '信息', 'info', 1, 1, '普通信息日志'),
('data_log_warn', 'sys_log_type', '警告', 'warn', 2, 1, '警告日志'),
('data_log_error', 'sys_log_type', '错误', 'error', 3, 1, '错误日志'),
('data_job_running', 'sys_job_status', '运行中', 'running', 1, 1, '任务正在运行'),
('data_job_success', 'sys_job_status', '成功', 'success', 2, 1, '任务执行成功'),
('data_job_failed', 'sys_job_status', '失败', 'failed', 3, 1, '任务执行失败')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

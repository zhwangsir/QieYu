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
    config_key VARCHAR(100) PRIMARY KEY COMMENT '配置键',
    config_value LONGTEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '描述',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='系统配置表';

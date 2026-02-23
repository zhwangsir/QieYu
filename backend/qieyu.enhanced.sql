-- QieYu 增强版数据库结构
-- 包含：角色权限、系统配置、字典管理、定时任务、数据备份等

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 用户表
-- ----------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `user_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin', 'moderator') DEFAULT 'user',
  `avatar` VARCHAR(255) DEFAULT 'bg-blue-500',
  `bio` TEXT,
  `status` ENUM('active', 'banned', 'inactive') DEFAULT 'active',
  `theme` VARCHAR(50) DEFAULT 'cupertino',
  `theme_mode` ENUM('light', 'dark', 'auto') DEFAULT 'light',
  `chat_background` VARCHAR(500),
  `cover_image` VARCHAR(500),
  `last_login_at` DATETIME,
  `last_login_ip` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_status` (`status`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 角色表
-- ----------------------------
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `role_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL,
  `role_code` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化角色
INSERT INTO `sys_role` (`role_id`, `role_name`, `role_code`, `description`, `sort_order`) VALUES
('role-admin', '超级管理员', 'admin', '拥有系统所有权限', 1),
('role-moderator', '版主', 'moderator', '内容审核权限', 2),
('role-user', '普通用户', 'user', '基本用户权限', 3);

-- ----------------------------
-- 权限表
-- ----------------------------
DROP TABLE IF EXISTS `sys_permission`;
CREATE TABLE `sys_permission` (
  `permission_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `permission_name` VARCHAR(50) NOT NULL,
  `permission_code` VARCHAR(100) NOT NULL UNIQUE,
  `permission_type` ENUM('menu', 'button', 'api') DEFAULT 'menu',
  `parent_id` VARCHAR(36),
  `module` VARCHAR(50),
  `path` VARCHAR(255),
  `icon` VARCHAR(50),
  `sort_order` INT DEFAULT 0,
  `visible` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化权限
INSERT INTO `sys_permission` (`permission_id`, `permission_name`, `permission_code`, `permission_type`, `parent_id`, `module`, `sort_order`) VALUES
('perm-system', '系统管理', 'system', 'menu', NULL, 'system', 1),
('perm-user', '用户管理', 'system:user', 'menu', 'perm-system', 'system', 1),
('perm-user-list', '用户列表', 'system:user:list', 'button', 'perm-user', 'system', 1),
('perm-user-edit', '用户编辑', 'system:user:edit', 'button', 'perm-user', 'system', 2),
('perm-user-delete', '用户删除', 'system:user:delete', 'button', 'perm-user', 'system', 3),
('perm-role', '角色管理', 'system:role', 'menu', 'perm-system', 'system', 2),
('perm-role-list', '角色列表', 'system:role:list', 'button', 'perm-role', 'system', 1),
('perm-role-edit', '角色编辑', 'system:role:edit', 'button', 'perm-role', 'system', 2),
('perm-content', '内容管理', 'content', 'menu', NULL, 'content', 2),
('perm-entry', '日志管理', 'content:entry', 'menu', 'perm-content', 'content', 1),
('perm-entry-audit', '日志审核', 'content:entry:audit', 'button', 'perm-entry', 'content', 1),
('perm-entry-delete', '日志删除', 'content:entry:delete', 'button', 'perm-entry', 'content', 2),
('perm-chat', '聊天管理', 'content:chat', 'menu', 'perm-content', 'content', 2),
('perm-monitor', '系统监控', 'monitor', 'menu', NULL, 'monitor', 3),
('perm-online', '在线用户', 'monitor:online', 'menu', 'perm-monitor', 'monitor', 1),
('perm-log', '操作日志', 'monitor:log', 'menu', 'perm-monitor', 'monitor', 2);

-- ----------------------------
-- 角色权限关联表
-- ----------------------------
DROP TABLE IF EXISTS `sys_role_permission`;
CREATE TABLE `sys_role_permission` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `role_id` VARCHAR(36) NOT NULL,
  `permission_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`role_id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `sys_permission`(`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理员拥有所有权限
INSERT INTO `sys_role_permission` (`id`, `role_id`, `permission_id`)
SELECT UUID(), 'role-admin', `permission_id` FROM `sys_permission`;

-- ----------------------------
-- 审计日志表
-- ----------------------------
DROP TABLE IF EXISTS `sys_audit_log`;
CREATE TABLE `sys_audit_log` (
  `log_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36),
  `username` VARCHAR(50),
  `action` VARCHAR(50) NOT NULL,
  `module` VARCHAR(50),
  `details` TEXT,
  `status` ENUM('success', 'fail') DEFAULT 'success',
  `ip` VARCHAR(50),
  `user_agent` VARCHAR(500),
  `request_id` VARCHAR(36),
  `duration` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 系统配置表
-- ----------------------------
DROP TABLE IF EXISTS `sys_config`;
CREATE TABLE `sys_config` (
  `config_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL UNIQUE,
  `config_value` TEXT,
  `config_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  `description` VARCHAR(255),
  `is_system` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化系统配置
INSERT INTO `sys_config` (`config_id`, `config_key`, `config_value`, `config_type`, `description`, `is_system`) VALUES
('config-site-name', 'site.name', 'QieYu', 'string', '网站名称', 1),
('config-site-desc', 'site.description', 'AI学习日志与社交平台', 'string', '网站描述', 1),
('config-max-upload', 'upload.maxSize', '10', 'number', '最大上传大小(MB)', 1),
('config-allow-reg', 'user.allowRegister', 'true', 'boolean', '是否允许注册', 1),
('config-need-audit', 'content.needAudit', 'false', 'boolean', '内容是否需要审核', 1);

-- ----------------------------
-- 字典类型表
-- ----------------------------
DROP TABLE IF EXISTS `sys_dict_type`;
CREATE TABLE `sys_dict_type` (
  `dict_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `dict_name` VARCHAR(50) NOT NULL,
  `dict_type` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化字典类型
INSERT INTO `sys_dict_type` (`dict_id`, `dict_name`, `dict_type`, `description`) VALUES
('dict-status', '状态', 'sys_status', '通用状态字典'),
('dict-log-type', '日志类型', 'log_type', '日志类型字典'),
('dict-msg-type', '消息类型', 'msg_type', '消息类型字典');

-- ----------------------------
-- 字典数据表
-- ----------------------------
DROP TABLE IF EXISTS `sys_dict_data`;
CREATE TABLE `sys_dict_data` (
  `data_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `dict_type` VARCHAR(100) NOT NULL,
  `dict_label` VARCHAR(100) NOT NULL,
  `dict_value` VARCHAR(100) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `remark` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_dict_type` (`dict_type`),
  FOREIGN KEY (`dict_type`) REFERENCES `sys_dict_type`(`dict_type`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化字典数据
INSERT INTO `sys_dict_data` (`data_id`, `dict_type`, `dict_label`, `dict_value`, `sort_order`) VALUES
(UUID(), 'sys_status', '正常', 'active', 1),
(UUID(), 'sys_status', '禁用', 'inactive', 2),
(UUID(), 'log_type', 'ComfyUI', 'comfyui', 1),
(UUID(), 'log_type', 'Stable Diffusion', 'sd', 2),
(UUID(), 'log_type', 'Midjourney', 'mj', 3),
(UUID(), 'log_type', '其他', 'other', 99),
(UUID(), 'msg_type', '文本', 'text', 1),
(UUID(), 'msg_type', '图片', 'image', 2),
(UUID(), 'msg_type', '视频', 'video', 3),
(UUID(), 'msg_type', '音频', 'audio', 4),
(UUID(), 'msg_type', '日志分享', 'entry_share', 5);

-- ----------------------------
-- 定时任务表
-- ----------------------------
DROP TABLE IF EXISTS `sys_job`;
CREATE TABLE `sys_job` (
  `job_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `job_name` VARCHAR(100) NOT NULL,
  `job_group` VARCHAR(50) DEFAULT 'DEFAULT',
  `cron_expression` VARCHAR(100) NOT NULL,
  `invoke_target` VARCHAR(255) NOT NULL,
  `status` ENUM('running', 'paused', 'error') DEFAULT 'paused',
  `concurrent` TINYINT(1) DEFAULT 1,
  `misfire_policy` ENUM('execute', 'ignore', 'once') DEFAULT 'once',
  `description` VARCHAR(255),
  `last_run_time` DATETIME,
  `next_run_time` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化定时任务
INSERT INTO `sys_job` (`job_id`, `job_name`, `job_group`, `cron_expression`, `invoke_target`, `status`, `description`) VALUES
('job-clean-logs', '清理过期日志', 'system', '0 0 3 * * ?', 'cleanExpiredLogs', 'paused', '每天凌晨3点清理90天前的日志'),
('job-backup', '自动备份', 'system', '0 0 4 * * ?', 'autoBackup', 'paused', '每天凌晨4点自动备份数据库');

-- ----------------------------
-- 任务执行日志表
-- ----------------------------
DROP TABLE IF EXISTS `sys_job_log`;
CREATE TABLE `sys_job_log` (
  `log_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `job_id` VARCHAR(36) NOT NULL,
  `job_name` VARCHAR(100),
  `job_group` VARCHAR(50),
  `invoke_target` VARCHAR(255),
  `status` ENUM('running', 'success', 'fail') DEFAULT 'running',
  `error_msg` TEXT,
  `start_time` DATETIME,
  `end_time` DATETIME,
  `duration` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_job` (`job_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 数据备份表
-- ----------------------------
DROP TABLE IF EXISTS `sys_backup`;
CREATE TABLE `sys_backup` (
  `backup_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `backup_name` VARCHAR(100) NOT NULL,
  `backup_type` ENUM('full', 'partial', 'data') DEFAULT 'full',
  `file_path` VARCHAR(500),
  `file_size` BIGINT DEFAULT 0,
  `status` ENUM('running', 'success', 'fail') DEFAULT 'running',
  `description` VARCHAR(255),
  `created_by` VARCHAR(36),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_type` (`backup_type`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 日志表
-- ----------------------------
DROP TABLE IF EXISTS `sys_log_entry`;
CREATE TABLE `sys_log_entry` (
  `entry_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `log_type` VARCHAR(50) DEFAULT 'comfyui',
  `category` VARCHAR(50) DEFAULT '未分类',
  `image_url` TEXT,
  `media_type` VARCHAR(10) DEFAULT 'image',
  `positive_prompt` TEXT,
  `negative_prompt` TEXT,
  `steps` INT DEFAULT 20,
  `cfg_scale` FLOAT DEFAULT 7.0,
  `sampler` VARCHAR(50),
  `scheduler` VARCHAR(50),
  `seed` VARCHAR(100),
  `notes` LONGTEXT,
  `is_public` TINYINT(1) DEFAULT 1,
  `view_count` INT DEFAULT 0,
  `like_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`log_type`),
  INDEX `idx_category` (`category`),
  INDEX `idx_public` (`is_public`),
  INDEX `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 标签表
-- ----------------------------
DROP TABLE IF EXISTS `sys_tag`;
CREATE TABLE `sys_tag` (
  `tag_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `entry_id` VARCHAR(36) NOT NULL,
  `tag_name` VARCHAR(50) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_entry` (`entry_id`),
  INDEX `idx_name` (`tag_name`),
  FOREIGN KEY (`entry_id`) REFERENCES `sys_log_entry`(`entry_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 资源表
-- ----------------------------
DROP TABLE IF EXISTS `sys_resource`;
CREATE TABLE `sys_resource` (
  `resource_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `entry_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50),
  `weight` FLOAT DEFAULT 1.0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_entry` (`entry_id`),
  FOREIGN KEY (`entry_id`) REFERENCES `sys_log_entry`(`entry_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 分类表
-- ----------------------------
DROP TABLE IF EXISTS `sys_category`;
CREATE TABLE `sys_category` (
  `category_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `log_type` VARCHAR(50) DEFAULT 'comfyui',
  `created_by` VARCHAR(36),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_name_type` (`name`, `log_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 点赞表
-- ----------------------------
DROP TABLE IF EXISTS `sys_like`;
CREATE TABLE `sys_like` (
  `like_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `entry_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_entry` (`user_id`, `entry_id`),
  INDEX `idx_entry` (`entry_id`),
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`entry_id`) REFERENCES `sys_log_entry`(`entry_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 好友关系表
-- ----------------------------
DROP TABLE IF EXISTS `sys_friend`;
CREATE TABLE `sys_friend` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `friend_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_friend` (`user_id`, `friend_id`),
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`friend_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 好友请求表
-- ----------------------------
DROP TABLE IF EXISTS `sys_friend_request`;
CREATE TABLE `sys_friend_request` (
  `request_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `from_user_id` VARCHAR(36) NOT NULL,
  `to_user_id` VARCHAR(36) NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_to` (`to_user_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`from_user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 聊天消息表
-- ----------------------------
DROP TABLE IF EXISTS `sys_chat_message`;
CREATE TABLE `sys_chat_message` (
  `message_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `recipient_id` VARCHAR(36),
  `content` TEXT NOT NULL,
  `msg_type` VARCHAR(20) DEFAULT 'text',
  `related_entry_id` VARCHAR(36),
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_recipient` (`recipient_id`),
  INDEX `idx_created` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 公告表
-- ----------------------------
DROP TABLE IF EXISTS `sys_announcement`;
CREATE TABLE `sys_announcement` (
  `ann_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT,
  `type` ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- 用户会话表（用于在线用户管理）
-- ----------------------------
DROP TABLE IF EXISTS `sys_user_session`;
CREATE TABLE `sys_user_session` (
  `session_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `token` VARCHAR(500),
  `ip` VARCHAR(50),
  `user_agent` VARCHAR(500),
  `last_active` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_token` (`token`(255)),
  INDEX `idx_expires` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

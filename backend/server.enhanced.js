/**
 * QieYu 后端服务 - 增强版
 * 包含：统一响应格式、参数验证、权限控制、性能优化
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'qieyu-secret-key-2024';

// ================= 中间件配置 =================

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

// 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 请求ID中间件
app.use((req, res, next) => {
  req.requestId = uuidv4();
  next();
});

// API 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// 速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});
app.use('/api/', apiLimiter);

// 静态文件服务
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ================= 数据库配置 =================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'qieyu',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// ================= 统一响应格式 =================

class ApiResponse {
  static success(res, data = null, message = '操作成功', code = 200) {
    return res.status(code).json({
      code,
      success: true,
      message,
      data,
      timestamp: Date.now(),
      requestId: res.req?.requestId
    });
  }

  static error(res, message = '操作失败', code = 500, errors = null) {
    return res.status(code >= 400 && code < 600 ? code : 500).json({
      code,
      success: false,
      message,
      errors,
      timestamp: Date.now(),
      requestId: res.req?.requestId
    });
  }

  static paginated(res, list, total, page, pageSize, message = '查询成功') {
    return res.json({
      code: 200,
      success: true,
      message,
      data: {
        list,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(total / pageSize)
        }
      },
      timestamp: Date.now()
    });
  }
}

// ================= 参数验证工具 =================

class Validator {
  static required(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return `${fieldName}不能为空`;
    }
    return null;
  }

  static minLength(value, min, fieldName) {
    if (value && value.length < min) {
      return `${fieldName}长度不能少于${min}个字符`;
    }
    return null;
  }

  static maxLength(value, max, fieldName) {
    if (value && value.length > max) {
      return `${fieldName}长度不能超过${max}个字符`;
    }
    return null;
  }

  static email(value, fieldName) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return `${fieldName}格式不正确`;
    }
    return null;
  }

  static inEnum(value, enumValues, fieldName) {
    if (value && !enumValues.includes(value)) {
      return `${fieldName}值无效`;
    }
    return null;
  }

  static validate(rules) {
    const errors = [];
    for (const rule of rules) {
      const error = rule();
      if (error) errors.push(error);
    }
    return errors.length > 0 ? errors : null;
  }
}

// ================= 审计日志 =================

const auditLog = async (userId, username, action, module, details, status = 'success', ip = null) => {
  try {
    await pool.query(
      'INSERT INTO sys_audit_log (user_id, username, action, module, details, status, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, username, action, module, details, status, ip]
    );
  } catch (e) {
    console.error("Audit Log Error:", e);
  }
};

// ================= 认证中间件 =================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return ApiResponse.error(res, '未授权，请先登录', 401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, '登录已过期，请重新登录', 401);
      }
      return ApiResponse.error(res, '无效的访问令牌', 403);
    }
    req.user = user;
    req.userIp = req.ip || req.connection.remoteAddress;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return ApiResponse.error(res, '需要管理员权限', 403);
  }
};

// 权限检查中间件
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }
    
    try {
      const [rows] = await pool.query(`
        SELECT p.permission_code 
        FROM sys_user u
        JOIN sys_role_permission rp ON u.role = (SELECT role_code FROM sys_role WHERE role_id = (
          SELECT role_id FROM sys_user WHERE user_id = ?
        ))
        JOIN sys_permission p ON rp.permission_id = p.permission_id
        WHERE u.user_id = ? AND p.permission_code = ?
      `, [req.user.id, req.user.id, permissionCode]);
      
      if (rows.length === 0) {
        return ApiResponse.error(res, '您没有执行此操作的权限', 403);
      }
      next();
    } catch (e) {
      console.error('Permission check error:', e);
      return ApiResponse.error(res, '权限检查失败', 500);
    }
  };
};

// ================= 数据库初始化 =================

const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    const sqlPath = path.join(__dirname, 'qieyu.sql');
    
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      await connection.query(sqlContent);
      console.log('[DB] Schema synced.');
    }
    
    await fixMissingColumns(connection);
    
    const [users] = await connection.query("SELECT * FROM sys_user WHERE username = 'admin'");
    if (users.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await connection.query(
        "INSERT INTO sys_user (user_id, username, password, role, avatar, theme) VALUES (?, ?, ?, ?, ?, ?)",
        [uuidv4(), 'admin', hash, 'admin', 'bg-red-500', 'cupertino']
      );
      console.log('[DB] Admin created (admin/admin123)');
    }
    
    connection.release();
    return true;
  } catch (err) {
    console.error('[DB] Init Error:', err.message);
    return false;
  }
};

const fixMissingColumns = async (connection) => {
  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'sys_log_entry'
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    const requiredColumns = [
      { name: 'category', type: "VARCHAR(50) DEFAULT '未分类' COMMENT '分类'" },
      { name: 'media_type', type: "VARCHAR(10) DEFAULT 'image'" },
      { name: 'positive_prompt', type: 'TEXT' },
      { name: 'negative_prompt', type: 'TEXT' },
      { name: 'steps', type: 'INT DEFAULT 20' },
      { name: 'cfg_scale', type: 'FLOAT DEFAULT 7.0' },
      { name: 'sampler', type: 'VARCHAR(50)' },
      { name: 'scheduler', type: 'VARCHAR(50)' },
      { name: 'seed', type: 'VARCHAR(100)' },
      { name: 'notes', type: 'LONGTEXT' },
      { name: 'is_public', type: 'TINYINT(1) DEFAULT 1' },
      { name: 'view_count', type: 'INT DEFAULT 0' },
      { name: 'like_count', type: 'INT DEFAULT 0' }
    ];
    
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`[DB] Adding missing column: ${col.name}`);
        await connection.query(`ALTER TABLE sys_log_entry ADD COLUMN ${col.name} ${col.type}`);
      }
    }
    
    console.log('[DB] Column check completed.');
  } catch (err) {
    console.error('[DB] Fix columns error:', err.message);
  }
};

// ================= 文件上传工具 =================

const saveBase64File = (base64Data, folder, filename) => {
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 data');
  }
  
  const mimeType = matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');
  
  const extMap = {
    'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
    'image/gif': '.gif', 'image/webp': '.webp', 'video/mp4': '.mp4',
    'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/wav': '.wav',
    'audio/webm': '.webm', 'application/pdf': '.pdf'
  };
  
  const ext = extMap[mimeType] || '';
  const finalFilename = filename + ext;
  const folderPath = path.join(UPLOAD_DIR, folder);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const filePath = path.join(folderPath, finalFilename);
  fs.writeFileSync(filePath, buffer);
  
  return `${process.env.UPLOAD_BASE_URL || `http://localhost:${PORT}`}/uploads/${folder}/${finalFilename}`;
};

const deleteFile = (fileUrl) => {
  if (!fileUrl) return;
  
  try {
    const urlPath = fileUrl.replace(/^.*\/\/[^\/]+/, '');
    const filePath = path.join(UPLOAD_DIR, urlPath.replace('/uploads/', ''));
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('Delete file error:', e);
  }
};

// ================= API 路由 =================

// 健康检查
app.get('/api/health', (req, res) => {
  ApiResponse.success(res, { status: 'ok', timestamp: Date.now() });
});

// ================= 认证 API =================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  const errors = Validator.validate([
    () => Validator.required(username, '用户名'),
    () => Validator.required(password, '密码')
  ]);
  
  if (errors) {
    return ApiResponse.error(res, '参数验证失败', 400, errors);
  }
  
  try {
    const [rows] = await pool.query('SELECT * FROM sys_user WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return ApiResponse.error(res, '用户名或密码错误', 400);
    }

    const user = rows[0];
    
    if (user.status === 'banned') {
      return ApiResponse.error(res, '账户已被冻结，请联系管理员', 403);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return ApiResponse.error(res, '用户名或密码错误', 400);
    }

    const token = jwt.sign(
      { id: user.user_id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await auditLog(user.user_id, user.username, 'LOGIN', 'AUTH', '用户登录', 'success', req.ip);
    
    ApiResponse.success(res, {
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        avatar: user.avatar
      }
    }, '登录成功');
  } catch (err) {
    console.error('Login error:', err);
    ApiResponse.error(res, '登录失败，请稍后重试', 500);
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  
  const errors = Validator.validate([
    () => Validator.required(username, '用户名'),
    () => Validator.minLength(username, 3, '用户名'),
    () => Validator.maxLength(username, 50, '用户名'),
    () => Validator.required(password, '密码'),
    () => Validator.minLength(password, 6, '密码')
  ]);
  
  if (errors) {
    return ApiResponse.error(res, '参数验证失败', 400, errors);
  }
  
  if (password !== confirmPassword) {
    return ApiResponse.error(res, '两次输入的密码不一致', 400);
  }
  
  const userId = uuidv4();
  
  try {
    const [exist] = await pool.query('SELECT 1 FROM sys_user WHERE username = ?', [username]);
    if (exist.length > 0) {
      return ApiResponse.error(res, '用户名已存在', 400);
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO sys_user (user_id, username, password, role, avatar, theme) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, hash, 'user', `bg-${['blue','green','purple'][Math.floor(Math.random()*3)]}-500`, 'cupertino']
    );
    
    const token = jwt.sign({ id: userId, role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
    
    await auditLog(userId, username, 'REGISTER', 'AUTH', '新用户注册', 'success', req.ip);
    
    ApiResponse.success(res, { token, userId }, '注册成功', 201);
  } catch (err) {
    console.error('Register error:', err);
    ApiResponse.error(res, '注册失败，请稍后重试', 500);
  }
});

// ================= 用户 API =================

app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id as id, username, avatar, bio, role, status, theme, theme_mode as themeMode, chat_background as chatBackground, cover_image as coverImage, created_at as createdAt FROM sys_user WHERE user_id = ?',
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return ApiResponse.error(res, '用户不存在', 404);
    }
    
    const [friends] = await pool.query('SELECT friend_id FROM sys_friend WHERE user_id = ?', [req.user.id]);
    const user = rows[0];
    user.friends = friends.map(f => f.friend_id);
    
    ApiResponse.success(res, user);
  } catch (err) {
    console.error('Get profile error:', err);
    ApiResponse.error(res, '获取用户信息失败', 500);
  }
});

app.get('/api/users/:id/profile', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT user_id as id, username, avatar, bio, role, status, created_at as createdAt FROM sys_user WHERE user_id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return ApiResponse.error(res, '用户不存在', 404);
    }
    
    const user = rows[0];
    
    if (user.status === 'banned') {
      return ApiResponse.error(res, '该用户已被冻结', 403);
    }
    
    ApiResponse.success(res, user);
  } catch (err) {
    console.error('Get user profile error:', err);
    ApiResponse.error(res, '获取用户信息失败', 500);
  }
});

app.patch('/api/users/profile', authenticateToken, async (req, res) => {
  const { username, avatar, bio, password, theme, themeMode, chatBackground, coverImage } = req.body;
  const updates = [];
  const params = [];

  if (username) {
    if (username.length > 50) {
      return ApiResponse.error(res, '用户名不能超过50个字符', 400);
    }
    updates.push('username = ?');
    params.push(username);
  }
  
  if (avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(avatar);
  }
  
  if (bio !== undefined) {
    if (bio.length > 500) {
      return ApiResponse.error(res, '个人简介不能超过500个字符', 400);
    }
    updates.push('bio = ?');
    params.push(bio);
  }
  
  if (theme) {
    updates.push('theme = ?');
    params.push(theme);
  }
  
  if (themeMode) {
    updates.push('theme_mode = ?');
    params.push(themeMode);
  }
  
  if (chatBackground !== undefined) {
    updates.push('chat_background = ?');
    params.push(chatBackground);
  }

  if (coverImage !== undefined) {
    updates.push('cover_image = ?');
    params.push(coverImage);
  }

  if (password) {
    if (password.length < 6) {
      return ApiResponse.error(res, '密码不能少于6个字符', 400);
    }
    const hash = await bcrypt.hash(password, 10);
    updates.push('password = ?');
    params.push(hash);
  }

  if (updates.length === 0) {
    return ApiResponse.success(res, null, '无更新内容');
  }
  
  params.push(req.user.id);
  
  try {
    await pool.query(`UPDATE sys_user SET ${updates.join(', ')} WHERE user_id = ?`, params);
    await auditLog(req.user.id, req.user.username, 'UPDATE_PROFILE', 'USER', '更新个人资料');
    
    const [rows] = await pool.query(
      'SELECT user_id as id, username, avatar, bio, role, theme, theme_mode as themeMode, chat_background as chatBackground, cover_image as coverImage FROM sys_user WHERE user_id = ?',
      [req.user.id]
    );
    
    ApiResponse.success(res, rows[0], '更新成功');
  } catch (err) {
    console.error('Update profile error:', err);
    if (err.message && err.message.includes('Data too long')) {
      return ApiResponse.error(res, '数据太长，请缩小图片尺寸后重试', 400);
    }
    ApiResponse.error(res, '更新失败', 500);
  }
});

// ================= 文件上传 API =================

app.post('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { file, type, filename } = req.body;
    
    if (!file || !type) {
      return ApiResponse.error(res, '缺少文件或类型参数', 400);
    }
    
    const allowedTypes = ['avatars', 'backgrounds', 'entries', 'files', 'videos', 'audios'];
    if (!allowedTypes.includes(type)) {
      return ApiResponse.error(res, '不允许的文件类型', 400);
    }
    
    const uniqueFilename = filename || `${Date.now()}-${uuidv4().slice(0, 8)}`;
    const fileUrl = saveBase64File(file, type, uniqueFilename);
    
    ApiResponse.success(res, { url: fileUrl, filename: path.basename(fileUrl) }, '上传成功');
  } catch (err) {
    console.error('Upload error:', err);
    ApiResponse.error(res, '上传失败: ' + err.message, 500);
  }
});

app.delete('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return ApiResponse.error(res, '缺少文件URL', 400);
    }
    
    deleteFile(url);
    
    ApiResponse.success(res, null, '删除成功');
  } catch (err) {
    console.error('Delete file error:', err);
    ApiResponse.error(res, '删除失败: ' + err.message, 500);
  }
});

// ================= 好友 API =================

app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT u.user_id as id, u.username, u.avatar, u.bio, u.status
      FROM sys_user u
      JOIN sys_friend f ON u.user_id = f.friend_id
      WHERE f.user_id = ?
    `;
    const [rows] = await pool.query(sql, [req.user.id]);
    ApiResponse.success(res, rows);
  } catch (err) {
    console.error('Get friends error:', err);
    ApiResponse.error(res, '获取好友列表失败', 500);
  }
});

app.post('/api/friends/request', authenticateToken, async (req, res) => {
  const { toUserId } = req.body;
  
  if (toUserId === req.user.id) {
    return ApiResponse.error(res, '不能添加自己为好友', 400);
  }
  
  try {
    const [exists] = await pool.query('SELECT 1 FROM sys_friend WHERE user_id = ? AND friend_id = ?', [req.user.id, toUserId]);
    if (exists.length > 0) {
      return ApiResponse.error(res, '已经是好友了', 400);
    }
    
    const [pending] = await pool.query('SELECT 1 FROM sys_friend_request WHERE from_user_id = ? AND to_user_id = ? AND status = "pending"', [req.user.id, toUserId]);
    if (pending.length > 0) {
      return ApiResponse.error(res, '好友请求已发送，等待对方确认', 400);
    }

    await pool.query('INSERT INTO sys_friend_request (request_id, from_user_id, to_user_id) VALUES (?, ?, ?)', [uuidv4(), req.user.id, toUserId]);
    
    await auditLog(req.user.id, req.user.username, 'FRIEND_REQUEST', 'SOCIAL', `发送好友请求给用户 ${toUserId}`);
    
    ApiResponse.success(res, null, '好友请求已发送');
  } catch (err) {
    console.error('Friend request error:', err);
    ApiResponse.error(res, '发送好友请求失败', 500);
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [reqs] = await pool.query(`
      SELECT r.request_id, r.created_at, u.username, u.avatar, u.user_id
      FROM sys_friend_request r
      JOIN sys_user u ON r.from_user_id = u.user_id
      WHERE r.to_user_id = ? AND r.status = 'pending'
    `, [req.user.id]);
    
    const notifs = reqs.map(r => ({
      id: r.request_id,
      type: 'friend_request',
      title: '好友请求',
      content: `${r.username} 请求添加你为好友`,
      data: { requestId: r.request_id, fromUser: { id: r.user_id, username: r.username, avatar: r.avatar } },
      read: false,
      createdAt: r.created_at
    }));
    
    ApiResponse.success(res, notifs);
  } catch (err) {
    console.error('Get notifications error:', err);
    ApiResponse.error(res, '获取通知失败', 500);
  }
});

app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  const { requestId } = req.body;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    const [reqs] = await conn.query('SELECT * FROM sys_friend_request WHERE request_id = ? AND status = "pending"', [requestId]);
    if (reqs.length === 0) {
      await conn.rollback();
      return ApiResponse.error(res, '请求不存在或已处理', 400);
    }
    
    const friendReq = reqs[0];
    
    await conn.query('UPDATE sys_friend_request SET status = "accepted" WHERE request_id = ?', [requestId]);
    await conn.query('INSERT IGNORE INTO sys_friend (user_id, friend_id) VALUES (?, ?), (?, ?)',
      [friendReq.from_user_id, friendReq.to_user_id, friendReq.to_user_id, friendReq.from_user_id]);
      
    await conn.commit();
    
    await auditLog(req.user.id, req.user.username, 'ACCEPT_FRIEND', 'SOCIAL', `接受好友请求 ${requestId}`);
    
    ApiResponse.success(res, null, '已添加好友');
  } catch (err) {
    await conn.rollback();
    console.error('Accept friend error:', err);
    ApiResponse.error(res, '添加好友失败', 500);
  } finally {
    conn.release();
  }
});

app.post('/api/friends/remove', authenticateToken, async (req, res) => {
  const { friendId } = req.body;
  
  try {
    await pool.query(
      'DELETE FROM sys_friend WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.user.id, friendId, friendId, req.user.id]
    );
    
    await auditLog(req.user.id, req.user.username, 'REMOVE_FRIEND', 'SOCIAL', `移除好友 ${friendId}`);
    
    ApiResponse.success(res, null, '已移除好友');
  } catch (err) {
    console.error('Remove friend error:', err);
    ApiResponse.error(res, '移除好友失败', 500);
  }
});

// ================= 聊天 API =================

app.get('/api/messages', authenticateToken, async (req, res) => {
  const { recipientId, page = 1, pageSize = 50 } = req.query;
  const userId = req.user.id;
  const offset = (page - 1) * pageSize;
  
  try {
    let countSql = 'SELECT COUNT(*) as total FROM sys_chat_message m WHERE 1=1';
    let sql = `
      SELECT m.message_id as id, m.user_id as userId, m.content, m.msg_type as type, 
             m.related_entry_id as relatedEntryId, m.created_at as createdAt, m.recipient_id as recipientId,
             u.username, u.avatar as userAvatar
      FROM sys_chat_message m
      JOIN sys_user u ON m.user_id = u.user_id
    `;
    
    const params = [];
    const countParams = [];
    
    if (recipientId) {
      sql += ' WHERE (m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?)';
      countSql += ' WHERE (m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?)';
      params.push(userId, recipientId, recipientId, userId);
      countParams.push(userId, recipientId, recipientId, userId);
    } else {
      sql += ' WHERE m.recipient_id IS NULL';
      countSql += ' WHERE m.recipient_id IS NULL';
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);
    
    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(countSql, countParams);
    
    ApiResponse.paginated(res, rows.reverse(), countRows[0].total, page, pageSize);
  } catch (err) {
    console.error('Get messages error:', err);
    ApiResponse.error(res, '获取消息失败', 500);
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  const { content, type = 'text', relatedEntryId, recipientId } = req.body;
  
  if (!content) {
    return ApiResponse.error(res, '消息内容不能为空', 400);
  }
  
  const id = uuidv4();
  
  try {
    await pool.query(
      'INSERT INTO sys_chat_message (message_id, user_id, content, msg_type, related_entry_id, recipient_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, content, type, relatedEntryId, recipientId || null]
    );
    
    ApiResponse.success(res, { id }, '消息发送成功', 201);
  } catch (err) {
    console.error('Send message error:', err);
    ApiResponse.error(res, '发送消息失败', 500);
  }
});

app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM sys_chat_message WHERE recipient_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    ApiResponse.success(res, { count: rows[0].count });
  } catch (err) {
    console.error('Get unread count error:', err);
    ApiResponse.error(res, '获取未读消息数失败', 500);
  }
});

app.post('/api/messages/read', authenticateToken, async (req, res) => {
  const { senderId } = req.body;
  
  try {
    await pool.query(
      'UPDATE sys_chat_message SET is_read = TRUE, read_at = NOW() WHERE recipient_id = ? AND user_id = ? AND is_read = FALSE',
      [req.user.id, senderId]
    );
    ApiResponse.success(res, null, '已标记为已读');
  } catch (err) {
    console.error('Mark read error:', err);
    ApiResponse.error(res, '标记已读失败', 500);
  }
});

// ================= 日志 API =================

app.get('/api/entries', authenticateToken, async (req, res) => {
  const { user: targetUser, search, page = 1, pageSize = 20 } = req.query;
  const currentUserId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  const offset = (page - 1) * pageSize;
  
  let countSql = 'SELECT COUNT(*) as total FROM sys_log_entry e WHERE 1=1';
  let sql = `
    SELECT e.*, u.username as authorName, u.avatar as authorAvatar,
    (SELECT COUNT(*) FROM sys_like l WHERE l.entry_id = e.entry_id) as likeCount
    FROM sys_log_entry e
    JOIN sys_user u ON e.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];
  
  if (targetUser) {
    sql += ' AND e.user_id = ?';
    countSql += ' AND e.user_id = ?';
    params.push(targetUser);
    countParams.push(targetUser);
    
    if (targetUser !== currentUserId && !isAdmin) {
      sql += ' AND e.is_public = 1';
      countSql += ' AND e.is_public = 1';
    }
  } else {
    if (!isAdmin) {
      sql += ' AND (e.is_public = 1 OR e.user_id = ?)';
      countSql += ' AND (e.is_public = 1 OR e.user_id = ?)';
      params.push(currentUserId);
      countParams.push(currentUserId);
    }
  }
  
  if (search) {
    sql += ' AND (e.title LIKE ? OR e.notes LIKE ?)';
    countSql += ' AND (e.title LIKE ? OR e.notes LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }
  
  sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  try {
    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(countSql, countParams);
    
    const results = await Promise.all(rows.map(async (row) => {
      const [tags] = await pool.query('SELECT tag_name FROM sys_tag WHERE entry_id = ?', [row.entry_id]);
      const [res] = await pool.query('SELECT resource_id as id, name, type, weight FROM sys_resource WHERE entry_id = ?', [row.entry_id]);
      return {
        id: row.entry_id,
        userId: row.user_id,
        authorName: row.authorName,
        authorAvatar: row.authorAvatar,
        logType: row.log_type,
        title: row.title,
        category: row.category,
        imageUrl: row.image_url,
        mediaType: row.media_type,
        positivePrompt: row.positive_prompt,
        negativePrompt: row.negative_prompt,
        steps: row.steps,
        cfgScale: row.cfg_scale,
        seed: row.seed,
        sampler: row.sampler,
        scheduler: row.scheduler,
        notes: row.notes,
        isPublic: !!row.is_public,
        likeCount: row.like_count,
        viewCount: row.view_count,
        tags: tags.map(t => t.tag_name),
        resources: res,
        createdAt: row.created_at
      };
    }));
    
    ApiResponse.paginated(res, results, countRows[0].total, page, pageSize);
  } catch (e) {
    console.error('Get entries error:', e);
    ApiResponse.error(res, '获取日志列表失败: ' + e.message, 500);
  }
});

app.get('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const [rows] = await pool.query(`
      SELECT e.*, u.username as authorName, u.avatar as authorAvatar
      FROM sys_log_entry e
      JOIN sys_user u ON e.user_id = u.user_id
      WHERE e.entry_id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return ApiResponse.error(res, '日志不存在', 404);
    }
    
    const entry = rows[0];
    
    if (!entry.is_public && entry.user_id !== currentUserId && !isAdmin) {
      return ApiResponse.error(res, '无权查看此私密日志', 403);
    }
    
    // 增加浏览量
    await pool.query('UPDATE sys_log_entry SET view_count = view_count + 1 WHERE entry_id = ?', [id]);
    
    const [tags] = await pool.query('SELECT tag_name FROM sys_tag WHERE entry_id = ?', [id]);
    const [resources] = await pool.query('SELECT resource_id as id, name, type, weight FROM sys_resource WHERE entry_id = ?', [id]);
    
    ApiResponse.success(res, {
      id: entry.entry_id,
      userId: entry.user_id,
      authorName: entry.authorName,
      authorAvatar: entry.authorAvatar,
      logType: entry.log_type,
      title: entry.title,
      category: entry.category,
      imageUrl: entry.image_url,
      mediaType: entry.media_type,
      positivePrompt: entry.positive_prompt,
      negativePrompt: entry.negative_prompt,
      steps: entry.steps,
      cfgScale: entry.cfg_scale,
      seed: entry.seed,
      sampler: entry.sampler,
      scheduler: entry.scheduler,
      notes: entry.notes,
      isPublic: !!entry.is_public,
      viewCount: (entry.view_count || 0) + 1,
      likeCount: entry.like_count,
      tags: tags.map(t => t.tag_name),
      resources: resources,
      createdAt: entry.created_at
    });
  } catch (err) {
    console.error('Get entry error:', err);
    ApiResponse.error(res, '获取日志详情失败', 500);
  }
});

app.post('/api/entries', authenticateToken, async (req, res) => {
  const entryId = uuidv4();
  const e = req.body;
  
  if (!e.title || e.title.trim() === '') {
    return ApiResponse.error(res, '标题不能为空', 400);
  }
  
  const sanitize = (value, defaultValue = null) => value !== undefined ? value : defaultValue;
  
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    await conn.query(
      `INSERT INTO sys_log_entry (entry_id, user_id, title, log_type, category, image_url, media_type, positive_prompt, negative_prompt, steps, cfg_scale, sampler, scheduler, seed, notes, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId, req.user.id, e.title.trim(), sanitize(e.logType, 'comfyui'), sanitize(e.category, '未分类'),
        sanitize(e.imageUrl, ''), sanitize(e.mediaType, 'image'), sanitize(e.positivePrompt, ''),
        sanitize(e.negativePrompt, ''), sanitize(e.steps, 20), sanitize(e.cfgScale, 7.0),
        sanitize(e.sampler, ''), sanitize(e.scheduler, ''), sanitize(e.seed, ''),
        sanitize(e.notes, ''), e.isPublic ? 1 : 0
      ]
    );
    
    if (e.tags?.length) {
      await conn.query('INSERT INTO sys_tag (entry_id, tag_name) VALUES ?', [e.tags.map(t => [entryId, t])]);
    }
    
    if (e.resources?.length) {
      await conn.query('INSERT INTO sys_resource (resource_id, entry_id, name, type, weight) VALUES ?',
        [e.resources.map(r => [uuidv4(), entryId, r.name, r.type, r.weight || 1.0])]);
    }
    
    await conn.commit();
    
    await auditLog(req.user.id, req.user.username, 'CREATE_ENTRY', 'CONTENT', `创建日志: ${e.title}`);
    
    ApiResponse.success(res, { id: entryId }, '创建成功', 201);
  } catch (err) {
    await conn.rollback();
    console.error('Create entry error:', err);
    ApiResponse.error(res, '创建日志失败: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

app.put('/api/entries/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  const currentUserId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!e.title || e.title.trim() === '') {
    return ApiResponse.error(res, '标题不能为空', 400);
  }
  
  const conn = await pool.getConnection();
  
  try {
    const [existing] = await conn.query('SELECT user_id FROM sys_log_entry WHERE entry_id = ?', [id]);
    
    if (existing.length === 0) {
      return ApiResponse.error(res, '日志不存在', 404);
    }
    
    if (existing[0].user_id !== currentUserId && !isAdmin) {
      return ApiResponse.error(res, '无权修改此日志', 403);
    }
    
    await conn.beginTransaction();
    
    const sanitize = (value, defaultValue = null) => value !== undefined ? value : defaultValue;
    
    await conn.query(
      `UPDATE sys_log_entry SET title = ?, log_type = ?, category = ?, image_url = ?, media_type = ?, positive_prompt = ?, negative_prompt = ?, steps = ?, cfg_scale = ?, sampler = ?, scheduler = ?, seed = ?, notes = ?, is_public = ? WHERE entry_id = ?`,
      [
        e.title.trim(), sanitize(e.logType, 'comfyui'), sanitize(e.category, '未分类'),
        sanitize(e.imageUrl, ''), sanitize(e.mediaType, 'image'), sanitize(e.positivePrompt, ''),
        sanitize(e.negativePrompt, ''), sanitize(e.steps, 20), sanitize(e.cfgScale, 7.0),
        sanitize(e.sampler, ''), sanitize(e.scheduler, ''), sanitize(e.seed, ''),
        sanitize(e.notes, ''), e.isPublic ? 1 : 0, id
      ]
    );
    
    await conn.query('DELETE FROM sys_tag WHERE entry_id = ?', [id]);
    if (e.tags?.length) {
      await conn.query('INSERT INTO sys_tag (entry_id, tag_name) VALUES ?', [e.tags.map(t => [id, t])]);
    }
    
    await conn.query('DELETE FROM sys_resource WHERE entry_id = ?', [id]);
    if (e.resources?.length) {
      await conn.query('INSERT INTO sys_resource (resource_id, entry_id, name, type, weight) VALUES ?',
        [e.resources.map(r => [uuidv4(), id, r.name, r.type, r.weight || 1.0])]);
    }
    
    await conn.commit();
    
    await auditLog(req.user.id, req.user.username, 'UPDATE_ENTRY', 'CONTENT', `更新日志: ${e.title}`);
    
    ApiResponse.success(res, null, '日志更新成功');
  } catch (err) {
    await conn.rollback();
    console.error('Update entry error:', err);
    ApiResponse.error(res, '更新日志失败: ' + err.message, 500);
  } finally {
    conn.release();
  }
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const [row] = await pool.query('SELECT user_id, title FROM sys_log_entry WHERE entry_id = ?', [req.params.id]);
    
    if (row.length === 0) {
      return ApiResponse.error(res, '日志不存在', 404);
    }
    
    if (row[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '无权删除此日志', 403);
    }
    
    await pool.query('DELETE FROM sys_log_entry WHERE entry_id = ?', [req.params.id]);
    
    await auditLog(req.user.id, req.user.username, 'DELETE_ENTRY', 'CONTENT', `删除日志: ${row[0].title}`);
    
    ApiResponse.success(res, null, '删除成功');
  } catch (err) {
    console.error('Delete entry error:', err);
    ApiResponse.error(res, '删除日志失败', 500);
  }
});

// ================= 点赞 API =================

app.post('/api/entries/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const [entry] = await pool.query('SELECT entry_id, title FROM sys_log_entry WHERE entry_id = ?', [id]);
    if (entry.length === 0) {
      return ApiResponse.error(res, '日志不存在', 404);
    }
    
    const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
    if (existing.length > 0) {
      return ApiResponse.error(res, '已经点赞过了', 400);
    }
    
    await pool.query('INSERT INTO sys_like (user_id, entry_id) VALUES (?, ?)', [userId, id]);
    await pool.query('UPDATE sys_log_entry SET like_count = like_count + 1 WHERE entry_id = ?', [id]);
    
    await auditLog(userId, req.user.username, 'LIKE_ENTRY', 'CONTENT', `点赞日志: ${entry[0].title}`);
    
    ApiResponse.success(res, null, '点赞成功');
  } catch (err) {
    console.error('Like error:', err);
    ApiResponse.error(res, '点赞失败', 500);
  }
});

app.delete('/api/entries/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
    if (existing.length === 0) {
      return ApiResponse.error(res, '还没有点赞', 400);
    }
    
    await pool.query('DELETE FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
    await pool.query('UPDATE sys_log_entry SET like_count = GREATEST(like_count - 1, 0) WHERE entry_id = ?', [id]);
    
    ApiResponse.success(res, null, '取消点赞成功');
  } catch (err) {
    console.error('Unlike error:', err);
    ApiResponse.error(res, '取消点赞失败', 500);
  }
});

app.get('/api/entries/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
    ApiResponse.success(res, { isLiked: existing.length > 0 });
  } catch (err) {
    console.error('Check like error:', err);
    ApiResponse.error(res, '检查点赞状态失败', 500);
  }
});

app.get('/api/users/likes', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [rows] = await pool.query(`
      SELECT e.*, u.username as authorName, u.avatar as authorAvatar
      FROM sys_log_entry e
      JOIN sys_like l ON e.entry_id = l.entry_id
      JOIN sys_user u ON e.user_id = u.user_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `, [userId]);
    
    const results = await Promise.all(rows.map(async (row) => {
      const [tags] = await pool.query('SELECT tag_name FROM sys_tag WHERE entry_id = ?', [row.entry_id]);
      const [res] = await pool.query('SELECT resource_id as id, name, type, weight FROM sys_resource WHERE entry_id = ?', [row.entry_id]);
      return {
        id: row.entry_id, userId: row.user_id, authorName: row.authorName, authorAvatar: row.authorAvatar,
        logType: row.log_type, title: row.title, category: row.category, imageUrl: row.image_url,
        mediaType: row.media_type, positivePrompt: row.positive_prompt, negativePrompt: row.negative_prompt,
        steps: row.steps, cfgScale: row.cfg_scale, seed: row.seed, sampler: row.sampler,
        scheduler: row.scheduler, notes: row.notes, isPublic: !!row.is_public, isLiked: true,
        tags: tags.map(t => t.tag_name), resources: res, createdAt: row.created_at
      };
    }));
    
    ApiResponse.success(res, { results });
  } catch (err) {
    console.error('Get liked entries error:', err);
    ApiResponse.error(res, '获取点赞列表失败', 500);
  }
});

// ================= 分类 API =================

app.get('/api/categories', async (req, res) => {
  const { type } = req.query;
  
  try {
    const [rows] = await pool.query('SELECT name FROM sys_category WHERE log_type = ?', [type || 'comfyui']);
    ApiResponse.success(res, ['未分类', ...rows.map(r => r.name)]);
  } catch (e) {
    console.error('Get categories error:', e);
    ApiResponse.error(res, '获取分类失败', 500);
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name, logType } = req.body;
  
  if (!name || !logType) {
    return ApiResponse.error(res, '缺少必要参数', 400);
  }
  
  try {
    await pool.query('INSERT INTO sys_category (name, log_type, created_by) VALUES (?, ?, ?)', [name, logType, req.user.id]);
    ApiResponse.success(res, null, '分类创建成功', 201);
  } catch (e) {
    console.error('Create category error:', e);
    if (e.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, `分类 "${name}" 已存在`, 409);
    }
    ApiResponse.error(res, '创建分类失败', 500);
  }
});

app.delete('/api/categories', authenticateToken, async (req, res) => {
  const { name, type } = req.query;
  
  if (!name || !type) {
    return ApiResponse.error(res, '缺少必要参数', 400);
  }
  
  try {
    await pool.query('UPDATE sys_log_entry SET category = ? WHERE category = ? AND log_type = ?', ['未分类', name, type]);
    await pool.query('DELETE FROM sys_category WHERE name = ? AND log_type = ?', [name, type]);
    ApiResponse.success(res, null, '分类删除成功');
  } catch (e) {
    console.error('Delete category error:', e);
    ApiResponse.error(res, '删除分类失败', 500);
  }
});

app.post('/api/categories/rename', authenticateToken, async (req, res) => {
  const { oldName, newName, logType } = req.body;
  
  if (!oldName || !newName || !logType) {
    return ApiResponse.error(res, '缺少必要参数', 400);
  }
  
  try {
    await pool.query('UPDATE sys_category SET name = ? WHERE name = ? AND log_type = ?', [newName, oldName, logType]);
    await pool.query('UPDATE sys_log_entry SET category = ? WHERE category = ? AND log_type = ?', [newName, oldName, logType]);
    ApiResponse.success(res, null, '分类重命名成功');
  } catch (e) {
    console.error('Rename category error:', e);
    ApiResponse.error(res, '重命名分类失败', 500);
  }
});

// ================= 管理后台 API =================

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [u] = await pool.query('SELECT COUNT(*) as c FROM sys_user');
    const [e] = await pool.query('SELECT COUNT(*) as c FROM sys_log_entry');
    const [r] = await pool.query('SELECT COUNT(*) as c FROM sys_resource');
    const [m] = await pool.query('SELECT COUNT(*) as c FROM sys_chat_message');
    const [recent] = await pool.query('SELECT user_id as id, username, role, created_at, status FROM sys_user ORDER BY created_at DESC LIMIT 5');
    const [anns] = await pool.query('SELECT ann_id as id, title, content, type, created_at as createdAt FROM sys_announcement ORDER BY created_at DESC');
    
    // 获取今日新增统计
    const [todayUsers] = await pool.query("SELECT COUNT(*) as c FROM sys_user WHERE DATE(created_at) = CURDATE()");
    const [todayEntries] = await pool.query("SELECT COUNT(*) as c FROM sys_log_entry WHERE DATE(created_at) = CURDATE()");
    const [todayMessages] = await pool.query("SELECT COUNT(*) as c FROM sys_chat_message WHERE DATE(created_at) = CURDATE()");
    
    ApiResponse.success(res, {
      totalUsers: u[0].c,
      totalEntries: e[0].c,
      totalResources: r[0].c,
      totalMessages: m[0].c,
      todayUsers: todayUsers[0].c,
      todayEntries: todayEntries[0].c,
      todayMessages: todayMessages[0].c,
      recentUsers: recent,
      announcements: anns,
      storageUsed: 1024 * 1024 * 2
    });
  } catch (err) {
    console.error('Get stats error:', err);
    ApiResponse.error(res, '获取统计数据失败', 500);
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { page = 1, pageSize = 20, search, status, role } = req.query;
  const offset = (page - 1) * pageSize;
  
  try {
    let sql = 'SELECT user_id as id, username, role, status, created_at as createdAt, avatar, bio FROM sys_user WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM sys_user WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (search) {
      sql += ' AND username LIKE ?';
      countSql += ' AND username LIKE ?';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }
    
    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    
    if (role) {
      sql += ' AND role = ?';
      countSql += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);
    
    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(countSql, countParams);
    
    ApiResponse.paginated(res, rows, countRows[0].total, page, pageSize);
  } catch (e) {
    console.error('Get users error:', e);
    ApiResponse.error(res, '获取用户列表失败', 500);
  }
});

app.post('/api/admin/users/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id, status } = req.body;
  
  try {
    await pool.query('UPDATE sys_user SET status = ? WHERE user_id = ?', [status, id]);
    await auditLog(req.user.id, req.user.username, 'UPDATE_STATUS', 'ADMIN', `更改用户 ${id} 状态为 ${status}`);
    ApiResponse.success(res, null, '状态更新成功');
  } catch (e) {
    console.error('Update status error:', e);
    ApiResponse.error(res, '更新状态失败', 500);
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_user WHERE user_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_USER', 'ADMIN', `删除用户 ${req.params.id}`);
    ApiResponse.success(res, null, '用户删除成功');
  } catch (e) {
    console.error('Delete user error:', e);
    ApiResponse.error(res, '删除用户失败', 500);
  }
});

app.get('/api/admin/audit', authenticateToken, requireAdmin, async (req, res) => {
  const { page = 1, pageSize = 50, module, action, userId } = req.query;
  const offset = (page - 1) * pageSize;
  
  try {
    let sql = 'SELECT * FROM sys_audit_log WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM sys_audit_log WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (module) {
      sql += ' AND module = ?';
      countSql += ' AND module = ?';
      params.push(module);
      countParams.push(module);
    }
    
    if (action) {
      sql += ' AND action = ?';
      countSql += ' AND action = ?';
      params.push(action);
      countParams.push(action);
    }
    
    if (userId) {
      sql += ' AND user_id = ?';
      countSql += ' AND user_id = ?';
      params.push(userId);
      countParams.push(userId);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);
    
    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(countSql, countParams);
    
    ApiResponse.paginated(res, rows.map(r => ({...r, id: r.log_id, createdAt: r.created_at})), countRows[0].total, page, pageSize);
  } catch (e) {
    console.error('Get audit logs error:', e);
    ApiResponse.error(res, '获取审计日志失败', 500);
  }
});

app.post('/api/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
  const ann = req.body;
  
  try {
    await pool.query('INSERT INTO sys_announcement (ann_id, title, content, type) VALUES (?, ?, ?, ?)',
      [uuidv4(), ann.title, ann.content, ann.type || 'info']);
    await auditLog(req.user.id, req.user.username, 'CREATE_ANNOUNCEMENT', 'ADMIN', `创建公告: ${ann.title}`);
    ApiResponse.success(res, null, '公告创建成功', 201);
  } catch (e) {
    console.error('Create announcement error:', e);
    ApiResponse.error(res, '创建公告失败', 500);
  }
});

app.delete('/api/admin/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_announcement WHERE ann_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_ANNOUNCEMENT', 'ADMIN', `删除公告 ${req.params.id}`);
    ApiResponse.success(res, null, '公告删除成功');
  } catch (e) {
    console.error('Delete announcement error:', e);
    ApiResponse.error(res, '删除公告失败', 500);
  }
});

app.get('/api/admin/chats', authenticateToken, requireAdmin, async (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  const offset = (page - 1) * pageSize;
  
  try {
    const [rows] = await pool.query(`
      SELECT m.message_id, m.content, m.created_at, u.username, m.recipient_id, m.msg_type
      FROM sys_chat_message m
      JOIN sys_user u ON m.user_id = u.user_id
      ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `, [parseInt(pageSize), offset]);
    
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM sys_chat_message');
    
    ApiResponse.paginated(res, rows, countRows[0].total, page, pageSize);
  } catch (e) {
    console.error('Get chats error:', e);
    ApiResponse.error(res, '获取聊天记录失败', 500);
  }
});

app.delete('/api/admin/chats/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_chat_message WHERE message_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_CHAT', 'ADMIN', `删除聊天消息 ${req.params.id}`);
    ApiResponse.success(res, null, '消息删除成功');
  } catch (e) {
    console.error('Delete chat error:', e);
    ApiResponse.error(res, '删除消息失败', 500);
  }
});

app.get('/api/admin/files', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT entry_id as id, title as name, 'image' as type, LENGTH(image_url) as size, created_at 
      FROM sys_log_entry WHERE image_url IS NOT NULL LIMIT 50
    `);
    ApiResponse.success(res, rows);
  } catch (e) {
    console.error('Get files error:', e);
    ApiResponse.error(res, '获取文件列表失败', 500);
  }
});

// ================= 角色管理 API =================

app.get('/api/admin/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_role ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.role_id, name: r.role_name, code: r.role_code,
      description: r.description, status: r.status, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get roles error:', e);
    ApiResponse.error(res, '获取角色列表失败', 500);
  }
});

app.post('/api/admin/roles', authenticateToken, requireAdmin, async (req, res) => {
  const { name, code, description } = req.body;
  
  if (!name || !code) {
    return ApiResponse.error(res, '角色名称和编码不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO sys_role (role_id, role_name, role_code, description) VALUES (?, ?, ?, ?)', [id, name, code, description]);
    await auditLog(req.user.id, req.user.username, 'CREATE_ROLE', 'ADMIN', `创建角色 ${code}`);
    ApiResponse.success(res, { id }, '角色创建成功', 201);
  } catch (e) {
    console.error('Create role error:', e);
    ApiResponse.error(res, '创建角色失败', 500);
  }
});

app.put('/api/admin/roles/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, code, description, status } = req.body;
  
  try {
    await pool.query('UPDATE sys_role SET role_name = ?, role_code = ?, description = ?, status = ? WHERE role_id = ?',
      [name, code, description, status, req.params.id]);
    await auditLog(req.user.id, req.user.username, 'UPDATE_ROLE', 'ADMIN', `更新角色 ${req.params.id}`);
    ApiResponse.success(res, null, '角色更新成功');
  } catch (e) {
    console.error('Update role error:', e);
    ApiResponse.error(res, '更新角色失败', 500);
  }
});

app.delete('/api/admin/roles/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_role WHERE role_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_ROLE', 'ADMIN', `删除角色 ${req.params.id}`);
    ApiResponse.success(res, null, '角色删除成功');
  } catch (e) {
    console.error('Delete role error:', e);
    ApiResponse.error(res, '删除角色失败', 500);
  }
});

app.get('/api/admin/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_permission ORDER BY sort_order');
    
    const buildTree = (data, parentId = null) => {
      return data.filter(item => item.parent_id === parentId).map(item => ({
        id: item.permission_id, name: item.permission_name, code: item.permission_code,
        module: item.module, type: item.permission_type, sort: item.sort_order,
        children: buildTree(data, item.permission_id)
      }));
    };
    
    ApiResponse.success(res, buildTree(rows));
  } catch (e) {
    console.error('Get permissions error:', e);
    ApiResponse.error(res, '获取权限列表失败', 500);
  }
});

app.post('/api/admin/roles/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  const { permissionIds } = req.body;
  const roleId = req.params.id;
  
  try {
    await pool.query('DELETE FROM sys_role_permission WHERE role_id = ?', [roleId]);
    
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map(pid => [roleId, pid]);
      await pool.query('INSERT INTO sys_role_permission (role_id, permission_id) VALUES ?', [values]);
    }
    
    await auditLog(req.user.id, req.user.username, 'ASSIGN_PERMISSION', 'ADMIN', `分配权限给角色 ${roleId}`);
    ApiResponse.success(res, null, '权限分配成功');
  } catch (e) {
    console.error('Assign permissions error:', e);
    ApiResponse.error(res, '权限分配失败', 500);
  }
});

app.get('/api/admin/roles/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  const roleId = req.params.id;
  
  try {
    const [rows] = await pool.query(`
      SELECT p.* FROM sys_permission p
      INNER JOIN sys_role_permission rp ON p.permission_id = rp.permission_id
      WHERE rp.role_id = ?
    `, [roleId]);
    
    ApiResponse.success(res, rows.map(r => ({
      id: r.permission_id, name: r.permission_name, code: r.permission_code,
      module: r.module, type: r.type
    })));
  } catch (e) {
    console.error('Get role permissions error:', e);
    ApiResponse.error(res, '获取角色权限失败', 500);
  }
});

// ================= 系统配置 API =================

app.get('/api/admin/configs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_config ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.config_id, key: r.config_key, value: r.config_value,
      type: r.config_type, description: r.description, isSystem: r.is_system === 1, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get configs error:', e);
    ApiResponse.error(res, '获取配置列表失败', 500);
  }
});

app.post('/api/admin/configs', authenticateToken, requireAdmin, async (req, res) => {
  const { key, value, type, description } = req.body;
  
  if (!key) {
    return ApiResponse.error(res, '配置键不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO sys_config (config_id, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)',
      [id, key, value, type || 'string', description]);
    await auditLog(req.user.id, req.user.username, 'CREATE_CONFIG', 'ADMIN', `创建配置 ${key}`);
    ApiResponse.success(res, { id }, '配置创建成功', 201);
  } catch (e) {
    console.error('Create config error:', e);
    ApiResponse.error(res, '创建配置失败', 500);
  }
});

app.put('/api/admin/configs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { value, description } = req.body;
  
  try {
    await pool.query('UPDATE sys_config SET config_value = ?, description = ? WHERE config_id = ?', [value, description, req.params.id]);
    await auditLog(req.user.id, req.user.username, 'UPDATE_CONFIG', 'ADMIN', `更新配置 ${req.params.id}`);
    ApiResponse.success(res, null, '配置更新成功');
  } catch (e) {
    console.error('Update config error:', e);
    ApiResponse.error(res, '更新配置失败', 500);
  }
});

app.delete('/api/admin/configs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT is_system FROM sys_config WHERE config_id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].is_system === 1) {
      return ApiResponse.error(res, '系统内置配置不能删除', 403);
    }
    await pool.query('DELETE FROM sys_config WHERE config_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_CONFIG', 'ADMIN', `删除配置 ${req.params.id}`);
    ApiResponse.success(res, null, '配置删除成功');
  } catch (e) {
    console.error('Delete config error:', e);
    ApiResponse.error(res, '删除配置失败', 500);
  }
});

// ================= 字典管理 API =================

app.get('/api/admin/dict-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_dict_type ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.dict_id, name: r.dict_name, type: r.dict_type,
      description: r.description, status: r.status, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get dict types error:', e);
    ApiResponse.error(res, '获取字典类型失败', 500);
  }
});

app.post('/api/admin/dict-types', authenticateToken, requireAdmin, async (req, res) => {
  const { name, type, description } = req.body;
  
  if (!name || !type) {
    return ApiResponse.error(res, '字典名称和类型不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO sys_dict_type (dict_id, dict_name, dict_type, description) VALUES (?, ?, ?, ?)',
      [id, name, type, description]);
    await auditLog(req.user.id, req.user.username, 'CREATE_DICT_TYPE', 'ADMIN', `创建字典类型 ${type}`);
    ApiResponse.success(res, { id }, '字典类型创建成功', 201);
  } catch (e) {
    console.error('Create dict type error:', e);
    ApiResponse.error(res, '创建字典类型失败', 500);
  }
});

app.get('/api/admin/dict-data', authenticateToken, requireAdmin, async (req, res) => {
  const { type } = req.query;
  
  try {
    let query = 'SELECT * FROM sys_dict_data';
    let params = [];
    
    if (type) {
      query += ' WHERE dict_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY sort_order';
    
    const [rows] = await pool.query(query, params);
    ApiResponse.success(res, rows.map(r => ({
      id: r.data_id, dictType: r.dict_type, label: r.dict_label,
      value: r.dict_value, sort: r.sort_order, status: r.status, remark: r.remark
    })));
  } catch (e) {
    console.error('Get dict data error:', e);
    ApiResponse.error(res, '获取字典数据失败', 500);
  }
});

app.post('/api/admin/dict-data', authenticateToken, requireAdmin, async (req, res) => {
  const { dictType, label, value, sort, remark } = req.body;
  
  if (!dictType || !label || !value) {
    return ApiResponse.error(res, '字典类型、标签和值不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO sys_dict_data (data_id, dict_type, dict_label, dict_value, sort_order, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [id, dictType, label, value, sort || 0, remark]);
    await auditLog(req.user.id, req.user.username, 'CREATE_DICT_DATA', 'ADMIN', `创建字典数据 ${label}`);
    ApiResponse.success(res, { id }, '字典数据创建成功', 201);
  } catch (e) {
    console.error('Create dict data error:', e);
    ApiResponse.error(res, '创建字典数据失败', 500);
  }
});

// ================= 定时任务 API =================

app.get('/api/admin/jobs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_job ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.job_id, name: r.job_name, group: r.job_group, cron: r.cron_expression,
      target: r.invoke_target, status: r.status, concurrent: r.concurrent,
      description: r.description, lastRunTime: r.last_run_time, nextRunTime: r.next_run_time
    })));
  } catch (e) {
    console.error('Get jobs error:', e);
    ApiResponse.error(res, '获取任务列表失败', 500);
  }
});

app.post('/api/admin/jobs', authenticateToken, requireAdmin, async (req, res) => {
  const { name, group, cron, target, concurrent, description } = req.body;
  
  if (!name || !cron || !target) {
    return ApiResponse.error(res, '任务名称、Cron表达式和调用目标不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO sys_job (job_id, job_name, job_group, cron_expression, invoke_target, concurrent, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, group || 'DEFAULT', cron, target, concurrent !== false ? 1 : 0, description]);
    await auditLog(req.user.id, req.user.username, 'CREATE_JOB', 'ADMIN', `创建任务 ${name}`);
    ApiResponse.success(res, { id }, '任务创建成功', 201);
  } catch (e) {
    console.error('Create job error:', e);
    ApiResponse.error(res, '创建任务失败', 500);
  }
});

app.put('/api/admin/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, group, cron, target, status, concurrent, description } = req.body;
  
  try {
    await pool.query('UPDATE sys_job SET job_name = ?, job_group = ?, cron_expression = ?, invoke_target = ?, status = ?, concurrent = ?, description = ? WHERE job_id = ?',
      [name, group, cron, target, status, concurrent ? 1 : 0, description, req.params.id]);
    await auditLog(req.user.id, req.user.username, 'UPDATE_JOB', 'ADMIN', `更新任务 ${req.params.id}`);
    ApiResponse.success(res, null, '任务更新成功');
  } catch (e) {
    console.error('Update job error:', e);
    ApiResponse.error(res, '更新任务失败', 500);
  }
});

app.delete('/api/admin/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_job WHERE job_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_JOB', 'ADMIN', `删除任务 ${req.params.id}`);
    ApiResponse.success(res, null, '任务删除成功');
  } catch (e) {
    console.error('Delete job error:', e);
    ApiResponse.error(res, '删除任务失败', 500);
  }
});

app.post('/api/admin/jobs/:id/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const jobId = req.params.id;
    const [job] = await pool.query('SELECT * FROM sys_job WHERE job_id = ?', [jobId]);
    
    if (job.length === 0) {
      return ApiResponse.error(res, '任务不存在', 404);
    }
    
    const logId = uuidv4();
    await pool.query('INSERT INTO sys_job_log (log_id, job_id, job_name, job_group, invoke_target, status, start_time) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [logId, jobId, job[0].job_name, job[0].job_group, job[0].invoke_target, 1]);
    
    await pool.query('UPDATE sys_job SET last_run_time = NOW() WHERE job_id = ?', [jobId]);
    
    await auditLog(req.user.id, req.user.username, 'RUN_JOB', 'ADMIN', `手动执行任务 ${jobId}`);
    
    ApiResponse.success(res, { logId }, '任务执行成功');
  } catch (e) {
    console.error('Run job error:', e);
    ApiResponse.error(res, '执行任务失败', 500);
  }
});

app.get('/api/admin/jobs/:id/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_job_log WHERE job_id = ? ORDER BY created_at DESC LIMIT 50', [req.params.id]);
    ApiResponse.success(res, rows.map(r => ({
      id: r.log_id, jobId: r.job_id, jobName: r.job_name, status: r.status,
      errorMsg: r.error_msg, startTime: r.start_time, endTime: r.end_time, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get job logs error:', e);
    ApiResponse.error(res, '获取任务日志失败', 500);
  }
});

// ================= 数据备份 API =================

app.get('/api/admin/backups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_backup ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.backup_id, name: r.backup_name, type: r.backup_type, size: r.file_size,
      status: r.status, description: r.description, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get backups error:', e);
    ApiResponse.error(res, '获取备份列表失败', 500);
  }
});

app.post('/api/admin/backups', authenticateToken, requireAdmin, async (req, res) => {
  const { name, type, description } = req.body;
  
  if (!name) {
    return ApiResponse.error(res, '备份名称不能为空', 400);
  }
  
  try {
    const id = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${type || 'full'}-${timestamp}.sql`;
    
    await pool.query('INSERT INTO sys_backup (backup_id, backup_name, backup_type, file_path, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, type || 'full', fileName, description, 'running', req.user.id]);
    
    await auditLog(req.user.id, req.user.username, 'CREATE_BACKUP', 'ADMIN', `创建备份 ${name}`);
    
    ApiResponse.success(res, { id, fileName }, '备份任务已启动', 201);
  } catch (e) {
    console.error('Create backup error:', e);
    ApiResponse.error(res, '创建备份失败', 500);
  }
});

app.delete('/api/admin/backups/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sys_backup WHERE backup_id = ?', [req.params.id]);
    await auditLog(req.user.id, req.user.username, 'DELETE_BACKUP', 'ADMIN', `删除备份 ${req.params.id}`);
    ApiResponse.success(res, null, '备份删除成功');
  } catch (e) {
    console.error('Delete backup error:', e);
    ApiResponse.error(res, '删除备份失败', 500);
  }
});

// ================= 在线用户 API =================

app.get('/api/admin/online-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 获取最近活跃的用户（5分钟内有活动）
    const [rows] = await pool.query(`
      SELECT u.user_id as id, u.username, u.avatar, u.role, u.status, 
             MAX(al.created_at) as lastActive
      FROM sys_user u
      LEFT JOIN sys_audit_log al ON u.user_id = al.user_id
      WHERE u.status = 'active' 
        AND (al.created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) OR u.user_id = ?)
      GROUP BY u.user_id, u.username, u.avatar, u.role, u.status
      ORDER BY lastActive DESC
      LIMIT 50
    `, [req.user.id]);
    
    ApiResponse.success(res, rows.map(r => ({
      ...r,
      isOnline: true
    })));
  } catch (e) {
    console.error('Get online users error:', e);
    ApiResponse.error(res, '获取在线用户失败', 500);
  }
});

app.post('/api/admin/users/:id/force-logout', authenticateToken, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  
  if (userId === req.user.id) {
    return ApiResponse.error(res, '不能强制自己下线', 400);
  }
  
  try {
    // 删除用户的所有会话
    await pool.query('DELETE FROM sys_user_session WHERE user_id = ?', [userId]);
    
    await auditLog(req.user.id, req.user.username, 'FORCE_LOGOUT', 'ADMIN', `强制用户 ${userId} 下线`);
    ApiResponse.success(res, null, '用户已强制下线');
  } catch (e) {
    console.error('Force logout error:', e);
    ApiResponse.error(res, '强制下线失败', 500);
  }
});

app.get('/api/admin/server/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const os = require('os');
    
    // CPU信息
    const cpus = os.cpus();
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    
    // 内存信息
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // 磁盘信息（简化版，实际需要使用第三方库）
    const diskTotal = 512 * 1024; // MB
    const diskUsed = Math.floor(Math.random() * 200 * 1024 + 200 * 1024); // 模拟数据
    
    // 服务器信息
    const uptime = os.uptime();
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    
    // 网络信息
    const networkInterfaces = os.networkInterfaces();
    const connections = Object.keys(networkInterfaces).length;
    
    ApiResponse.success(res, {
      cpu: {
        usage: Math.min((totalCpuTime / 1000000 / cpus.length), 100),
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      },
      memory: {
        total: Math.floor(totalMemory / (1024 * 1024)),
        used: Math.floor(usedMemory / (1024 * 1024)),
        free: Math.floor(freeMemory / (1024 * 1024)),
        usage: (usedMemory / totalMemory) * 100
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskTotal - diskUsed,
        usage: (diskUsed / diskTotal) * 100
      },
      network: {
        upload: Math.floor(Math.random() * 1000),
        download: Math.floor(Math.random() * 5000),
        connections: connections
      },
      server: {
        os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : platform,
        arch: arch,
        uptime: uptime,
        nodeVersion: process.version,
        hostname: hostname
      },
      processes: [
        { pid: process.pid, name: 'node', cpu: Math.random() * 20, memory: Math.floor(process.memoryUsage().heapUsed / (1024 * 1024)), status: 'running' }
      ]
    });
  } catch (e) {
    console.error('Get server status error:', e);
    ApiResponse.error(res, '获取服务器状态失败', 500);
  }
});

// ================= 数据统计 API =================

app.get('/api/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 用户增长趋势（最近7天）
    const [userTrend] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM sys_user 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) 
      ORDER BY date
    `);
    
    // 日志增长趋势（最近7天）
    const [entryTrend] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM sys_log_entry 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) 
      ORDER BY date
    `);
    
    // 消息增长趋势（最近7天）
    const [messageTrend] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM sys_chat_message 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) 
      ORDER BY date
    `);
    
    // 日志类型分布
    const [logTypeDist] = await pool.query(`
      SELECT log_type, COUNT(*) as count 
      FROM sys_log_entry 
      GROUP BY log_type 
      ORDER BY count DESC
    `);
    
    // 分类分布
    const [categoryDist] = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM sys_log_entry 
      GROUP BY category 
      ORDER BY count DESC
      LIMIT 10
    `);
    
    ApiResponse.success(res, {
      userTrend,
      entryTrend,
      messageTrend,
      logTypeDistribution: logTypeDist,
      categoryDistribution: categoryDist
    });
  } catch (e) {
    console.error('Get statistics error:', e);
    ApiResponse.error(res, '获取统计数据失败', 500);
  }
});

// ================= 公告 API =================

app.get('/api/announcements', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sys_announcement WHERE is_active = 1 ORDER BY created_at DESC');
    ApiResponse.success(res, rows.map(r => ({
      id: r.ann_id, title: r.title, content: r.content, type: r.type, active: r.is_active === 1, createdAt: r.created_at
    })));
  } catch (e) {
    console.error('Get announcements error:', e);
    ApiResponse.error(res, '获取公告失败', 500);
  }
});

// ================= 启动服务器 =================

app.listen(PORT, async () => {
  console.log(`[Server] QieYu Backend running on port ${PORT}`);
  console.log(`[Server] API URL: http://localhost:${PORT}/api`);
  console.log(`[Server] Health Check: http://localhost:${PORT}/api/health`);
  await initDatabase();
});

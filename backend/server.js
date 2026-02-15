
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'qieyu-secret-key';

// 上传文件存储路径配置
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const UPLOAD_URL_PATH = '/uploads'; // 访问URL路径
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || `http://localhost:${PORT}`; // 完整的访问URL前缀

// 确保上传目录存在
const uploadDirs = ['avatars', 'backgrounds', 'entries', 'files', 'videos', 'audios', 'temp'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// CORS Configuration
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Payload Limit - 无限制
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// 静态文件服务 - 允许访问上传的文件
app.use(UPLOAD_URL_PATH, express.static(UPLOAD_DIR));

// Database Config
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'qieyu',
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true 
};

const pool = mysql.createPool(dbConfig);

// --- Logger Helper ---
const auditLog = async (userId, username, action, module, details, status = 'success') => {
  try {
    await pool.query(
      'INSERT INTO sys_audit_log (user_id, username, action, module, details, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, action, module, details, status]
    );
  } catch (e) {
    console.error("Audit Log Error:", e);
  }
};

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "未授权" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "令牌无效" });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "需要管理员权限" });
  }
};

// --- Init DB ---
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    const sqlPath = path.join(__dirname, 'qieyu.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      await connection.query(sqlContent);
      console.log('[DB] Schema synced.');
    }
    
    // 检查并修复缺失的字段
    await fixMissingColumns(connection);
    
    // Default Admin
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

// 修复缺失的数据库字段
const fixMissingColumns = async (connection) => {
  try {
    // 检查 sys_log_entry 表的字段
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'sys_log_entry'
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    // 需要检查的字段
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

// ================= ROUTES =================

// 文件上传工具函数
const saveBase64File = (base64Data, folder, filename) => {
  // 从 base64 数据中提取实际的文件内容
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 data');
  }
  
  const mimeType = matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');
  
  // 确定文件扩展名
  const extMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/webm': '.webm',
    'application/pdf': '.pdf',
    'text/plain': '.txt'
  };
  
  const ext = extMap[mimeType] || '';
  const finalFilename = filename + ext;
  const filePath = path.join(UPLOAD_DIR, folder, finalFilename);
  
  // 写入文件
  fs.writeFileSync(filePath, buffer);
  
  // 返回完整访问URL
  return `${UPLOAD_BASE_URL}${UPLOAD_URL_PATH}/${folder}/${finalFilename}`;
};

// 删除文件工具函数
const deleteFile = (fileUrl) => {
  if (!fileUrl) return;
  
  // 支持完整URL和相对路径
  let relativePath = fileUrl;
  if (fileUrl.startsWith(UPLOAD_BASE_URL)) {
    relativePath = fileUrl.replace(UPLOAD_BASE_URL, '');
  } else if (fileUrl.startsWith(UPLOAD_URL_PATH)) {
    relativePath = fileUrl;
  } else {
    return; // 不是本地上传的文件
  }
  
  const filePath = path.join(UPLOAD_DIR, relativePath.replace(UPLOAD_URL_PATH, ''));
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// 文件上传 API
app.post('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { file, type, filename } = req.body;
    
    if (!file || !type) {
      return res.status(400).json({ message: '缺少文件或类型参数' });
    }
    
    // 验证文件类型
    const allowedTypes = ['avatars', 'backgrounds', 'entries', 'files', 'videos', 'audios'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: '不允许的文件类型' });
    }
    
    // 生成文件名
    const uniqueFilename = filename || `${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    // 保存文件
    const fileUrl = saveBase64File(file, type, uniqueFilename);
    
    res.json({ 
      url: fileUrl, 
      message: '上传成功',
      filename: path.basename(fileUrl)
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: '上传失败: ' + err.message });
  }
});

// 文件删除 API
app.delete('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: '缺少文件URL' });
    }
    
    deleteFile(url);
    
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ message: '删除失败: ' + err.message });
  }
});

// 1. Auth
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM sys_user WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(400).json({ message: '用户不存在' });

    const user = rows[0];
    if (user.status === 'banned') return res.status(403).json({ message: '账户已被冻结' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: '密码错误' });

    const token = jwt.sign({ id: user.user_id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    auditLog(user.user_id, user.username, 'LOGIN', 'AUTH', 'User logged in');
    res.json({ access: token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const userId = uuidv4();
  try {
    const [exist] = await pool.query('SELECT 1 FROM sys_user WHERE username = ?', [username]);
    if (exist.length > 0) return res.status(400).json({ message: '用户名已存在' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO sys_user (user_id, username, password, role, avatar, theme) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, username, hash, 'user', `bg-${['blue','green','purple'][Math.floor(Math.random()*3)]}-500`, 'cupertino']
    );
    
    const token = jwt.sign({ id: userId, role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
    auditLog(userId, username, 'REGISTER', 'AUTH', 'New user registered');
    res.status(201).json({ access: token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. User & Profile

/**
 * 获取当前登录用户的资料
 */
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id as id, username, avatar, bio, role, status, theme, theme_mode as themeMode, chat_background as chatBackground, cover_image as coverImage, created_at as createdAt FROM sys_user WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) return res.sendStatus(404);
    
    // Get friends
    const [friends] = await pool.query('SELECT friend_id FROM sys_friend WHERE user_id = ?', [req.user.id]);
    const user = rows[0];
    user.friends = friends.map(f => f.friend_id);
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 获取指定用户的公开资料
 * 用于查看其他用户的个人主页
 */
app.get('/api/users/:id/profile', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT user_id as id, username, avatar, bio, role, status, created_at as createdAt FROM sys_user WHERE user_id = ?', 
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: '用户不存在' });
    
    const user = rows[0];
    
    // 如果被查看用户被冻结，返回错误
    if (user.status === 'banned') {
      return res.status(403).json({ message: '该用户已被冻结' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/users/profile', authenticateToken, async (req, res) => {
  const { username, avatar, bio, password, theme, themeMode, chatBackground, coverImage } = req.body;
  const updates = [];
  const params = [];

  if (username) { 
    if (username.length > 50) {
      return res.status(400).json({ message: '用户名不能超过50个字符' });
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
      return res.status(400).json({ message: '个人简介不能超过500个字符' });
    }
    updates.push('bio = ?'); 
    params.push(bio); 
  }
  
  if (theme) { updates.push('theme = ?'); params.push(theme); }
  if (themeMode) { updates.push('theme_mode = ?'); params.push(themeMode); }
  
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
      return res.status(400).json({ message: '密码不能少于6个字符' });
    }
    const hash = await bcrypt.hash(password, 10);
    updates.push('password = ?'); params.push(hash);
  }

  if (updates.length === 0) return res.json({});
  
  params.push(req.user.id);
  
  try {
    await pool.query(`UPDATE sys_user SET ${updates.join(', ')} WHERE user_id = ?`, params);
    auditLog(req.user.id, req.user.username, 'UPDATE_PROFILE', 'USER', 'Updated profile settings');
    
    // Return updated user
    const [rows] = await pool.query('SELECT user_id as id, username, avatar, bio, role, theme, theme_mode as themeMode, chat_background as chatBackground, cover_image as coverImage FROM sys_user WHERE user_id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    // 检查是否为数据太长错误
    if (err.message && err.message.includes('Data too long')) {
      return res.status(400).json({ message: '数据太长，请缩小图片尺寸后重试' });
    }
    res.status(500).json({ message: err.message });
  }
});

// 3. Friends & Requests
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT u.user_id as id, u.username, u.avatar, u.bio
      FROM sys_user u
      JOIN sys_friend f ON u.user_id = f.friend_id
      WHERE f.user_id = ?
    `;
    const [rows] = await pool.query(sql, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/friends/request', authenticateToken, async (req, res) => {
  const { toUserId } = req.body;
  if (toUserId === req.user.id) return res.status(400).json({ message: "Cannot add yourself" });
  
  try {
    // Check existing
    const [exists] = await pool.query('SELECT 1 FROM sys_friend WHERE user_id = ? AND friend_id = ?', [req.user.id, toUserId]);
    if (exists.length > 0) return res.status(400).json({ message: "Already friends" });
    
    const [pending] = await pool.query('SELECT 1 FROM sys_friend_request WHERE from_user_id = ? AND to_user_id = ? AND status = "pending"', [req.user.id, toUserId]);
    if (pending.length > 0) return res.status(400).json({ message: "Request already sent" });

    await pool.query('INSERT INTO sys_friend_request (request_id, from_user_id, to_user_id) VALUES (?, ?, ?)', [uuidv4(), req.user.id, toUserId]);
    res.json({ message: "Request sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Fetch pending friend requests as notifications
    const [reqs] = await pool.query(`
      SELECT r.request_id, r.created_at, u.username, u.avatar
      FROM sys_friend_request r
      JOIN sys_user u ON r.from_user_id = u.user_id
      WHERE r.to_user_id = ? AND r.status = 'pending'
    `, [req.user.id]);
    
    const notifs = reqs.map(r => ({
      id: r.request_id,
      type: 'friend_request',
      title: '好友请求',
      content: `${r.username} 请求添加你为好友`,
      data: { requestId: r.request_id, fromUser: { username: r.username, avatar: r.avatar } },
      read: false,
      createdAt: r.created_at
    }));
    
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  const { requestId } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [reqs] = await conn.query('SELECT * FROM sys_friend_request WHERE request_id = ? AND status = "pending"', [requestId]);
    if (reqs.length === 0) throw new Error("Request not found or handled");
    
    const friendReq = reqs[0];
    
    // Update request
    await conn.query('UPDATE sys_friend_request SET status = "accepted" WHERE request_id = ?', [requestId]);
    
    // Insert friendship (bidirectional)
    await conn.query('INSERT IGNORE INTO sys_friend (user_id, friend_id) VALUES (?, ?), (?, ?)', 
      [friendReq.from_user_id, friendReq.to_user_id, friendReq.to_user_id, friendReq.from_user_id]);
      
    await conn.commit();
    res.json({ message: "Friend added" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/friends/remove', authenticateToken, async (req, res) => {
  const { friendId } = req.body;
  try {
    await pool.query('DELETE FROM sys_friend WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [req.user.id, friendId, friendId, req.user.id]);
    res.json({ message: "Friend removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Chat
app.get('/api/messages', authenticateToken, async (req, res) => {
  const { recipientId } = req.query; // If null/undefined, get public
  const userId = req.user.id;
  
  try {
    let sql = `
      SELECT m.message_id as id, m.user_id as userId, m.content, m.msg_type as type, m.related_entry_id as relatedEntryId, m.created_at as createdAt, m.recipient_id as recipientId,
      u.username, u.avatar as userAvatar
      FROM sys_chat_message m
      JOIN sys_user u ON m.user_id = u.user_id
    `;
    
    const params = [];
    if (recipientId) {
      // Private chat: messages between me and them
      sql += ` WHERE (m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?)`;
      params.push(userId, recipientId, recipientId, userId);
    } else {
      // Public chat: recipient_id IS NULL
      sql += ` WHERE m.recipient_id IS NULL`;
    }
    
    sql += ` ORDER BY m.created_at DESC LIMIT 100`;
    
    const [rows] = await pool.query(sql, params);
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  const { content, type, relatedEntryId, recipientId } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO sys_chat_message (message_id, user_id, content, msg_type, related_entry_id, recipient_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, content, type, relatedEntryId, recipientId || null]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 获取未读消息数量
 */
app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM sys_chat_message 
       WHERE recipient_id = ? AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 标记消息为已读
 */
app.post('/api/messages/read', authenticateToken, async (req, res) => {
  const { senderId } = req.body;
  try {
    await pool.query(
      `UPDATE sys_chat_message 
       SET is_read = TRUE 
       WHERE recipient_id = ? AND user_id = ? AND is_read = FALSE`,
      [req.user.id, senderId]
    );
    res.json({ message: '已标记为已读' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * 获取未读消息列表（按发送者分组）
 */
app.get('/api/messages/unread', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        m.user_id as sender_id,
        u.username as sender_name,
        u.avatar as sender_avatar,
        m.content,
        m.created_at,
        COUNT(*) as unread_count
       FROM sys_chat_message m
       JOIN sys_user u ON m.user_id = u.user_id
       WHERE m.recipient_id = ? AND m.is_read = FALSE
       GROUP BY m.user_id, u.username, u.avatar, m.content, m.created_at
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Entries (Logs)

/**
 * 获取日志列表
 * 权限规则：
 * 1. 已登录用户可以看到：
 *    - 所有公开日志
 *    - 自己的所有日志（包括私密）
 * 2. 管理员可以看到所有日志
 */
app.get('/api/entries', authenticateToken, async (req, res) => {
  const { user: targetUser, search } = req.query;
  const currentUserId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  
  console.log('[DEBUG] /api/entries called:', { targetUser, currentUserId, isAdmin });
  
  let sql = `
    SELECT e.*, u.username as authorName, u.avatar as authorAvatar,
    (SELECT COUNT(*) FROM sys_like l WHERE l.entry_id = e.entry_id) as likeCount
    FROM sys_log_entry e
    JOIN sys_user u ON e.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  
  // 权限过滤逻辑
  if (targetUser) {
    // 如果指定了目标用户，只显示该用户的日志
    sql += ' AND e.user_id = ?';
    params.push(targetUser);
    // 如果不是查看自己的日志且不是管理员，只能看到公开的
    if (targetUser !== currentUserId && !isAdmin) {
      sql += ' AND e.is_public = 1';
    }
  } else {
    // 没有指定目标用户时，显示：
    // 1. 所有公开日志
    // 2. 自己的私密日志
    if (!isAdmin) {
      sql += ' AND (e.is_public = 1 OR e.user_id = ?)';
      params.push(currentUserId);
    }
  }
  
  if (search) {
      sql += ' AND (e.title LIKE ? OR e.notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
  }
  
  sql += ' ORDER BY e.created_at DESC';
  
  console.log('[DEBUG] SQL:', sql);
  console.log('[DEBUG] Params:', params);
  
  try {
    const [rows] = await pool.query(sql, params);
    console.log('[DEBUG] Found rows:', rows.length);
    // Fetch tags and resources for each entry
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
            tags: tags.map(t => t.tag_name),
            resources: res,
            createdAt: row.created_at
        };
    }));
    res.json({ results });
  } catch (e) {
    console.error('[DEBUG] Error:', e.message);
    res.status(500).json({message: e.message});
  }
});

app.post('/api/entries', authenticateToken, async (req, res) => {
    const entryId = uuidv4();
    const e = req.body;
    
    // 数据验证和清理
    if (!e.title || e.title.trim() === '') {
        return res.status(400).json({ message: '标题不能为空' });
    }
    
    // 处理 undefined 值，转换为 null 或默认值
    const sanitize = (value, defaultValue = null) => {
        return value !== undefined ? value : defaultValue;
    };
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(
            `INSERT INTO sys_log_entry (entry_id, user_id, title, log_type, category, image_url, media_type, positive_prompt, negative_prompt, steps, cfg_scale, sampler, scheduler, seed, notes, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                entryId, 
                req.user.id, 
                e.title.trim(), 
                sanitize(e.logType, 'comfyui'), 
                sanitize(e.category, '未分类'), 
                sanitize(e.imageUrl, ''), 
                sanitize(e.mediaType, 'image'), 
                sanitize(e.positivePrompt, ''), 
                sanitize(e.negativePrompt, ''), 
                sanitize(e.steps, 20), 
                sanitize(e.cfgScale, 7.0), 
                sanitize(e.sampler, ''), 
                sanitize(e.scheduler, ''), 
                sanitize(e.seed, ''), 
                sanitize(e.notes, ''), 
                e.isPublic ? 1 : 0
            ]
        );
        // Tags & Resources
        if(e.tags?.length) {
            await conn.query('INSERT INTO sys_tag (entry_id, tag_name) VALUES ?', [e.tags.map(t => [entryId, t])]);
        }
        if(e.resources?.length) {
            await conn.query('INSERT INTO sys_resource (resource_id, entry_id, name, type, weight) VALUES ?', [e.resources.map(r => [uuidv4(), entryId, r.name, r.type, r.weight || 1.0])]);
        }
        await conn.commit();
        auditLog(req.user.id, req.user.username, 'CREATE_ENTRY', 'CONTENT', `Created entry: ${e.title}`);
        res.json({ id: entryId, message: '创建成功' });
    } catch(err) {
        await conn.rollback();
        console.error('Create entry error:', err);
        res.status(500).json({message: err.message});
    } finally {
        conn.release();
    }
});

// 获取单条日志详情
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
            return res.status(404).json({ message: '日志不存在' });
        }
        
        const entry = rows[0];
        
        // 权限检查：私密日志只有创建者和管理员可以查看
        if (!entry.is_public && entry.user_id !== currentUserId && !isAdmin) {
            return res.status(403).json({ message: '无权查看此私密日志' });
        }
        
        // 获取标签和资源
        const [tags] = await pool.query('SELECT tag_name FROM sys_tag WHERE entry_id = ?', [id]);
        const [resources] = await pool.query('SELECT resource_id as id, name, type, weight FROM sys_resource WHERE entry_id = ?', [id]);
        
        res.json({
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
            tags: tags.map(t => t.tag_name),
            resources: resources,
            createdAt: entry.created_at
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 更新日志
app.put('/api/entries/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const e = req.body;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // 数据验证
    if (!e.title || e.title.trim() === '') {
        return res.status(400).json({ message: '标题不能为空' });
    }
    
    const conn = await pool.getConnection();
    try {
        // 检查权限
        const [existing] = await conn.query('SELECT user_id, is_public FROM sys_log_entry WHERE entry_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: '日志不存在' });
        }
        
        // 权限检查：只有创建者或管理员可以修改
        if (existing[0].user_id !== currentUserId && !isAdmin) {
            return res.status(403).json({ message: '无权修改此日志' });
        }
        
        await conn.beginTransaction();
        
        // 处理 undefined 值
        const sanitize = (value, defaultValue = null) => {
            return value !== undefined ? value : defaultValue;
        };
        
        // 更新日志主体
        await conn.query(
            `UPDATE sys_log_entry SET 
                title = ?, 
                log_type = ?, 
                category = ?, 
                image_url = ?, 
                media_type = ?, 
                positive_prompt = ?, 
                negative_prompt = ?, 
                steps = ?, 
                cfg_scale = ?, 
                sampler = ?, 
                scheduler = ?, 
                seed = ?, 
                notes = ?, 
                is_public = ? 
            WHERE entry_id = ?`,
            [
                e.title.trim(), 
                sanitize(e.logType, 'comfyui'), 
                sanitize(e.category, '未分类'), 
                sanitize(e.imageUrl, ''), 
                sanitize(e.mediaType, 'image'), 
                sanitize(e.positivePrompt, ''), 
                sanitize(e.negativePrompt, ''), 
                sanitize(e.steps, 20), 
                sanitize(e.cfgScale, 7.0), 
                sanitize(e.sampler, ''), 
                sanitize(e.scheduler, ''), 
                sanitize(e.seed, ''), 
                sanitize(e.notes, ''), 
                e.isPublic ? 1 : 0, 
                id
            ]
        );
        
        // 更新标签：删除旧标签，添加新标签
        await conn.query('DELETE FROM sys_tag WHERE entry_id = ?', [id]);
        if(e.tags?.length) {
            await conn.query('INSERT INTO sys_tag (entry_id, tag_name) VALUES ?', [e.tags.map(t => [id, t])]);
        }
        
        // 更新资源：删除旧资源，添加新资源
        await conn.query('DELETE FROM sys_resource WHERE entry_id = ?', [id]);
        if(e.resources?.length) {
            await conn.query('INSERT INTO sys_resource (resource_id, entry_id, name, type, weight) VALUES ?', 
                [e.resources.map(r => [uuidv4(), id, r.name, r.type, r.weight || 1.0])]);
        }
        
        await conn.commit();
        auditLog(req.user.id, req.user.username, 'UPDATE_ENTRY', 'CONTENT', `Updated entry: ${e.title}`);
        res.json({ message: '日志更新成功' });
    } catch(err) {
        await conn.rollback();
        console.error('Update entry error:', err);
        res.status(500).json({message: err.message});
    } finally {
        conn.release();
    }
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
    try {
        const [row] = await pool.query('SELECT user_id, title FROM sys_log_entry WHERE entry_id = ?', [req.params.id]);
        if(row.length === 0) return res.sendStatus(404);
        
        // 权限检查：只有创建者或管理员可以删除
        if(row[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权删除此日志' });
        }
        
        await pool.query('DELETE FROM sys_log_entry WHERE entry_id = ?', [req.params.id]);
        auditLog(req.user.id, req.user.username, 'DELETE_ENTRY', 'CONTENT', `Deleted entry ${req.params.id}: ${row[0].title}`);
        res.sendStatus(204);
    } catch(err) {
        res.status(500).json({message: err.message});
    }
});

// 6. Likes

/**
 * 点赞日志
 */
app.post('/api/entries/:id/like', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        // 检查日志是否存在
        const [entry] = await pool.query('SELECT entry_id, is_public FROM sys_log_entry WHERE entry_id = ?', [id]);
        if (entry.length === 0) {
            return res.status(404).json({ message: '日志不存在' });
        }
        
        // 检查是否已经点赞
        const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: '已经点赞过了' });
        }
        
        // 添加点赞
        await pool.query('INSERT INTO sys_like (user_id, entry_id) VALUES (?, ?)', [userId, id]);
        
        // 更新点赞数
        await pool.query('UPDATE sys_log_entry SET like_count = like_count + 1 WHERE entry_id = ?', [id]);
        
        auditLog(userId, req.user.username, 'LIKE_ENTRY', 'CONTENT', `Liked entry ${id}`);
        res.json({ message: '点赞成功' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * 取消点赞
 */
app.delete('/api/entries/:id/like', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        // 检查是否已经点赞
        const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
        if (existing.length === 0) {
            return res.status(400).json({ message: '还没有点赞' });
        }
        
        // 删除点赞
        await pool.query('DELETE FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
        
        // 更新点赞数
        await pool.query('UPDATE sys_log_entry SET like_count = GREATEST(like_count - 1, 0) WHERE entry_id = ?', [id]);
        
        auditLog(userId, req.user.username, 'UNLIKE_ENTRY', 'CONTENT', `Unliked entry ${id}`);
        res.json({ message: '取消点赞成功' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * 检查是否已点赞
 */
app.get('/api/entries/:id/like', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const [existing] = await pool.query('SELECT 1 FROM sys_like WHERE user_id = ? AND entry_id = ?', [userId, id]);
        res.json({ isLiked: existing.length > 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * 获取用户点赞的日志列表
 */
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
        
        // 获取标签和资源
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
                isLiked: true,
                tags: tags.map(t => t.tag_name),
                resources: res,
                createdAt: row.created_at
            };
        }));
        
        res.json({ results });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. Categories
app.get('/api/categories', async (req, res) => {
    const { type } = req.query;
    try {
        const [rows] = await pool.query('SELECT name FROM sys_category WHERE log_type = ?', [type]);
        res.json(rows.map(r => r.name));
    } catch(e) { res.status(500).send(e.message); }
});
app.post('/api/categories', authenticateToken, async(req, res) => {
    try {
        await pool.query('INSERT INTO sys_category (name, log_type) VALUES (?, ?)', [req.body.name, req.body.logType]);
        res.sendStatus(201);
    } catch(e) { res.status(500).send(e.message); }
});
app.delete('/api/categories/:name', authenticateToken, async(req, res) => {
    try {
        await pool.query('DELETE FROM sys_category WHERE name = ?', [req.params.name]);
        res.sendStatus(204);
    } catch(e) { res.status(500).send(e.message); }
});

// ================= ADMIN API =================

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [u] = await pool.query('SELECT COUNT(*) as c FROM sys_user');
        const [e] = await pool.query('SELECT COUNT(*) as c FROM sys_log_entry');
        const [r] = await pool.query('SELECT COUNT(*) as c FROM sys_resource');
        const [recent] = await pool.query('SELECT user_id as id, username, role, created_at, status FROM sys_user ORDER BY created_at DESC LIMIT 5');
        const [anns] = await pool.query('SELECT ann_id as id, title, content, type, created_at as createdAt FROM sys_announcement ORDER BY created_at DESC');
        
        res.json({
            totalUsers: u[0].c,
            totalEntries: e[0].c,
            totalResources: r[0].c,
            recentUsers: recent,
            storageUsed: 1024 * 1024 * 2, // Mock storage for now
            announcements: anns
        });
    } catch(err) { res.status(500).send(err.message); }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT user_id as id, username, role, status, created_at as createdAt, avatar FROM sys_user');
        res.json(rows);
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/admin/users/status', authenticateToken, requireAdmin, async (req, res) => {
    const { id, status } = req.body;
    try {
        await pool.query('UPDATE sys_user SET status = ? WHERE user_id = ?', [status, id]);
        auditLog(req.user.id, req.user.username, 'UPDATE_STATUS', 'ADMIN', `Changed user ${id} to ${status}`);
        res.sendStatus(200);
    } catch(e) { res.status(500).send(e.message); }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM sys_user WHERE user_id = ?', [req.params.id]);
        auditLog(req.user.id, req.user.username, 'DELETE_USER', 'ADMIN', `Deleted user ${req.params.id}`);
        res.sendStatus(204);
    } catch(e) { res.status(500).send(e.message); }
});

app.get('/api/admin/audit', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sys_audit_log ORDER BY created_at DESC LIMIT 200');
        // Map log_id to id and created_at to createdAt for frontend consistency
        res.json(rows.map(r => ({...r, id: r.log_id, createdAt: r.created_at})));
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
    const ann = req.body;
    try {
        await pool.query('INSERT INTO sys_announcement (ann_id, title, content, type) VALUES (?, ?, ?, ?)', [uuidv4(), ann.title, ann.content, ann.type]);
        res.sendStatus(201);
    } catch(e) { res.status(500).send(e.message); }
});

app.delete('/api/admin/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM sys_announcement WHERE ann_id = ?', [req.params.id]);
        res.sendStatus(204);
    } catch(e) { res.status(500).send(e.message); }
});

// Admin Chat Management
app.get('/api/admin/chats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.message_id, m.content, m.created_at, u.username, m.recipient_id
            FROM sys_chat_message m
            JOIN sys_user u ON m.user_id = u.user_id
            ORDER BY m.created_at DESC LIMIT 100
        `);
        res.json(rows);
    } catch(e) { res.status(500).send(e.message); }
});

app.delete('/api/admin/chats/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM sys_chat_message WHERE message_id = ?', [req.params.id]);
        auditLog(req.user.id, req.user.username, 'DELETE_CHAT', 'ADMIN', `Deleted chat msg ${req.params.id}`);
        res.sendStatus(204);
    } catch(e) { res.status(500).send(e.message); }
});

// Admin Files Management (Mocked data since files are base64 in logs for now, but we return resource entries)
app.get('/api/admin/files', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Return log entries that have images as "files"
        const [rows] = await pool.query(`
            SELECT entry_id as id, title as name, 'image' as type, LENGTH(image_url) as size, created_at 
            FROM sys_log_entry WHERE image_url IS NOT NULL LIMIT 50
        `);
        res.json(rows);
    } catch(e) { res.status(500).send(e.message); }
});

// Start
app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  await initDatabase();
});

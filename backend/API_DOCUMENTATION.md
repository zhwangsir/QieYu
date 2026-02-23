# QieYu API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

## 统一响应格式

### 成功响应
```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1700000000000,
  "requestId": "uuid"
}
```

### 错误响应
```json
{
  "code": 400,
  "success": false,
  "message": "错误信息",
  "errors": ["详细错误列表"],
  "timestamp": 1700000000000,
  "requestId": "uuid"
}
```

### 分页响应
```json
{
  "code": 200,
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [ ... ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  },
  "timestamp": 1700000000000
}
```

---

## 认证接口

### 用户登录
- **POST** `/auth/login`
- **无需认证**

**请求参数**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "admin",
      "avatar": "bg-red-500"
    }
  }
}
```

### 用户注册
- **POST** `/auth/register`
- **无需认证**

**请求参数**:
```json
{
  "username": "newuser",
  "password": "password123",
  "confirmPassword": "password123"
}
```

---

## 用户接口

### 获取当前用户信息
- **GET** `/users/profile`
- **需要认证**

### 获取指定用户公开信息
- **GET** `/users/:id/profile`
- **需要认证**

### 更新用户信息
- **PATCH** `/users/profile`
- **需要认证**

**请求参数**:
```json
{
  "username": "新用户名",
  "avatar": "头像URL或颜色类",
  "bio": "个人简介",
  "theme": "cupertino",
  "themeMode": "dark",
  "chatBackground": "背景图URL",
  "coverImage": "封面图URL",
  "password": "新密码（可选）"
}
```

---

## 文件上传接口

### 上传文件
- **POST** `/upload`
- **需要认证**

**请求参数**:
```json
{
  "file": "data:image/png;base64,iVBORw0KGgo...",
  "type": "avatars",  // avatars | backgrounds | entries | files | videos | audios
  "filename": "自定义文件名（可选）"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "url": "http://localhost:8000/uploads/avatars/filename.png",
    "filename": "filename.png"
  }
}
```

### 删除文件
- **DELETE** `/upload`
- **需要认证**

---

## 好友接口

### 获取好友列表
- **GET** `/friends`
- **需要认证**

### 发送好友请求
- **POST** `/friends/request`
- **需要认证**

**请求参数**:
```json
{
  "toUserId": "目标用户ID"
}
```

### 接受好友请求
- **POST** `/friends/accept`
- **需要认证**

**请求参数**:
```json
{
  "requestId": "请求ID"
}
```

### 移除好友
- **POST** `/friends/remove`
- **需要认证**

**请求参数**:
```json
{
  "friendId": "好友ID"
}
```

---

## 聊天接口

### 获取消息列表
- **GET** `/messages`
- **需要认证**

**查询参数**:
- `recipientId`: 接收者ID（私聊时使用）
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认50）

### 发送消息
- **POST** `/messages`
- **需要认证**

**请求参数**:
```json
{
  "content": "消息内容",
  "type": "text",  // text | image | video | audio | entry_share
  "recipientId": "接收者ID（私聊时使用）",
  "relatedEntryId": "关联日志ID（分享日志时使用）"
}
```

### 获取未读消息数量
- **GET** `/messages/unread/count`
- **需要认证**

### 标记消息已读
- **POST** `/messages/read`
- **需要认证**

**请求参数**:
```json
{
  "senderId": "发送者ID"
}
```

---

## 日志接口

### 获取日志列表
- **GET** `/entries`
- **需要认证**

**查询参数**:
- `user`: 用户ID（筛选指定用户的日志）
- `search`: 搜索关键词
- `page`: 页码
- `pageSize`: 每页数量

### 获取日志详情
- **GET** `/entries/:id`
- **需要认证**

### 创建日志
- **POST** `/entries`
- **需要认证**

**请求参数**:
```json
{
  "title": "日志标题",
  "logType": "comfyui",
  "category": "分类名称",
  "imageUrl": "图片URL",
  "mediaType": "image",
  "positivePrompt": "正向提示词",
  "negativePrompt": "负向提示词",
  "steps": 20,
  "cfgScale": 7.0,
  "sampler": "Euler a",
  "scheduler": "normal",
  "seed": "123456789",
  "notes": "备注内容",
  "isPublic": true,
  "tags": ["标签1", "标签2"],
  "resources": [
    { "name": "资源名", "type": "lora", "weight": 1.0 }
  ]
}
```

### 更新日志
- **PUT** `/entries/:id`
- **需要认证**

### 删除日志
- **DELETE** `/entries/:id`
- **需要认证**

### 点赞日志
- **POST** `/entries/:id/like`
- **需要认证**

### 取消点赞
- **DELETE** `/entries/:id/like`
- **需要认证**

### 检查点赞状态
- **GET** `/entries/:id/like`
- **需要认证**

### 获取用户点赞列表
- **GET** `/users/likes`
- **需要认证**

---

## 分类接口

### 获取分类列表
- **GET** `/categories`
- **查询参数**: `type` (日志类型)

### 创建分类
- **POST** `/categories`
- **需要认证**

**请求参数**:
```json
{
  "name": "分类名称",
  "logType": "comfyui"
}
```

### 重命名分类
- **POST** `/categories/rename`
- **需要认证**

**请求参数**:
```json
{
  "oldName": "旧名称",
  "newName": "新名称",
  "logType": "comfyui"
}
```

### 删除分类
- **DELETE** `/categories?name=分类名&type=comfyui`
- **需要认证**

---

## 管理后台接口

> 以下接口均需要管理员权限

### 获取系统统计
- **GET** `/admin/stats`

### 获取用户列表
- **GET** `/admin/users`

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `search`: 搜索用户名
- `status`: 状态筛选
- `role`: 角色筛选

### 更新用户状态
- **POST** `/admin/users/status`

**请求参数**:
```json
{
  "id": "用户ID",
  "status": "active"  // active | banned | inactive
}
```

### 删除用户
- **DELETE** `/admin/users/:id`

### 获取审计日志
- **GET** `/admin/audit`

**查询参数**:
- `page`, `pageSize`
- `module`: 模块筛选
- `action`: 操作筛选
- `userId`: 用户筛选

### 获取聊天记录
- **GET** `/admin/chats`

### 删除聊天消息
- **DELETE** `/admin/chats/:id`

### 获取文件列表
- **GET** `/admin/files`

---

## 角色管理接口

### 获取角色列表
- **GET** `/admin/roles`

### 创建角色
- **POST** `/admin/roles`

**请求参数**:
```json
{
  "name": "角色名称",
  "code": "role_code",
  "description": "角色描述"
}
```

### 更新角色
- **PUT** `/admin/roles/:id`

### 删除角色
- **DELETE** `/admin/roles/:id`

### 获取权限列表
- **GET** `/admin/permissions`

### 分配角色权限
- **POST** `/admin/roles/:id/permissions`

**请求参数**:
```json
{
  "permissionIds": ["perm-1", "perm-2"]
}
```

---

## 系统配置接口

### 获取配置列表
- **GET** `/admin/configs`

### 创建配置
- **POST** `/admin/configs`

**请求参数**:
```json
{
  "key": "config.key",
  "value": "配置值",
  "type": "string",  // string | number | boolean | json
  "description": "配置描述"
}
```

### 更新配置
- **PUT** `/admin/configs/:id`

### 删除配置
- **DELETE** `/admin/configs/:id`

---

## 字典管理接口

### 获取字典类型列表
- **GET** `/admin/dict-types`

### 创建字典类型
- **POST** `/admin/dict-types`

**请求参数**:
```json
{
  "name": "字典名称",
  "type": "dict_type",
  "description": "字典描述"
}
```

### 获取字典数据
- **GET** `/admin/dict-data?type=字典类型`

### 创建字典数据
- **POST** `/admin/dict-data`

**请求参数**:
```json
{
  "dictType": "字典类型",
  "label": "显示标签",
  "value": "实际值",
  "sort": 1,
  "remark": "备注"
}
```

---

## 定时任务接口

### 获取任务列表
- **GET** `/admin/jobs`

### 创建任务
- **POST** `/admin/jobs`

**请求参数**:
```json
{
  "name": "任务名称",
  "group": "DEFAULT",
  "cron": "0 0 3 * * ?",
  "target": "cleanExpiredLogs",
  "concurrent": true,
  "description": "任务描述"
}
```

### 更新任务
- **PUT** `/admin/jobs/:id`

### 删除任务
- **DELETE** `/admin/jobs/:id`

### 手动执行任务
- **POST** `/admin/jobs/:id/run`

### 获取任务执行日志
- **GET** `/admin/jobs/:id/logs`

---

## 数据备份接口

### 获取备份列表
- **GET** `/admin/backups`

### 创建备份
- **POST** `/admin/backups`

**请求参数**:
```json
{
  "name": "备份名称",
  "type": "full",  // full | partial | data
  "description": "备份描述"
}
```

### 删除备份
- **DELETE** `/admin/backups/:id`

---

## 在线用户接口

### 获取在线用户
- **GET** `/admin/online-users`

---

## 数据统计接口

### 获取统计数据
- **GET** `/admin/statistics`

**响应**:
```json
{
  "code": 200,
  "data": {
    "userTrend": [...],
    "entryTrend": [...],
    "messageTrend": [...],
    "logTypeDistribution": [...],
    "categoryDistribution": [...]
  }
}
```

---

## 公告接口

### 获取公告列表
- **GET** `/announcements`
- **需要认证**

### 创建公告（管理员）
- **POST** `/admin/announcements`

**请求参数**:
```json
{
  "title": "公告标题",
  "content": "公告内容",
  "type": "info"  // info | warning | success | error
}
```

### 删除公告（管理员）
- **DELETE** `/admin/announcements/:id`

---

## 通知接口

### 获取通知列表
- **GET** `/notifications`
- **需要认证**

### 标记通知已读
- **POST** `/notifications/:id/read`
- **需要认证**

### 全部标记已读
- **POST** `/notifications/read-all?userId=用户ID`
- **需要认证**

### 删除通知
- **DELETE** `/notifications/:id`
- **需要认证**

---

## 错误码说明

| 错误码 | 说明 |
|-------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容（删除成功） |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或Token过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复创建） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 请求限流

- 每个IP在15分钟内最多1000次请求
- 超过限制将返回 429 错误

---

## 最佳实践

1. **Token管理**: 将Token存储在localStorage，每次请求携带在Authorization头
2. **错误处理**: 统一处理401错误，跳转登录页
3. **分页加载**: 使用分页接口，避免一次性加载过多数据
4. **文件上传**: 大文件建议分片上传，注意base64数据大小限制
5. **缓存策略**: 合理使用前端缓存，减少重复请求

# QieYu 日志库系统 - API 文档

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: JWT Token (Bearer)
- **请求头**: `Authorization: Bearer <token>`

## 接口清单

### 1. 认证模块 (Auth)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录 | 否 |
| POST | `/auth/register` | 用户注册 | 否 |

### 2. 用户模块 (User)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/users/profile` | 获取当前用户资料 | 是 |
| GET | `/users/:id/profile` | 获取指定用户资料 | 是 |
| PATCH | `/users/profile` | 更新用户资料 | 是 |
| GET | `/users/likes` | 获取用户点赞的日志 | 是 |

### 3. 好友模块 (Friends)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/friends` | 获取好友列表 | 是 |
| POST | `/friends/request` | 发送好友请求 | 是 |
| POST | `/friends/accept` | 接受好友请求 | 是 |
| POST | `/friends/remove` | 删除好友 | 是 |

### 4. 通知模块 (Notifications)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/notifications` | 获取通知列表 | 是 |

### 5. 聊天模块 (Chat)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/messages` | 获取消息列表 | 是 |
| POST | `/messages` | 发送消息 | 是 |

### 6. 日志模块 (Entries)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/entries` | 获取日志列表 | 是 |
| POST | `/entries` | 创建日志 | 是 |
| GET | `/entries/:id` | 获取日志详情 | 是 |
| PUT | `/entries/:id` | 更新日志 | 是 |
| DELETE | `/entries/:id` | 删除日志 | 是 |

### 7. 点赞模块 (Likes)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/entries/:id/like` | 点赞日志 | 是 |
| DELETE | `/entries/:id/like` | 取消点赞 | 是 |
| GET | `/entries/:id/like` | 检查点赞状态 | 是 |

### 8. 分类模块 (Categories)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/categories` | 获取分类列表 | 否 |
| POST | `/categories` | 创建分类 | 是 |
| DELETE | `/categories/:name` | 删除分类 | 是 |

### 9. 文件模块 (Upload)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/upload` | 上传文件 | 是 |
| DELETE | `/upload` | 删除文件 | 是 |

### 10. 管理模块 (Admin)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/admin/stats` | 获取统计数据 | 是(管理员) |
| GET | `/admin/users` | 获取用户列表 | 是(管理员) |
| POST | `/admin/users/status` | 修改用户状态 | 是(管理员) |
| DELETE | `/admin/users/:id` | 删除用户 | 是(管理员) |
| GET | `/admin/audit` | 获取审计日志 | 是(管理员) |
| POST | `/admin/announcements` | 创建公告 | 是(管理员) |
| DELETE | `/admin/announcements/:id` | 删除公告 | 是(管理员) |
| GET | `/admin/chats` | 获取聊天列表 | 是(管理员) |
| DELETE | `/admin/chats/:id` | 删除聊天消息 | 是(管理员) |
| GET | `/admin/files` | 获取文件列表 | 是(管理员) |

## 请求/响应示例

### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "access": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 创建日志
```http
POST /api/entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "我的日志",
  "logType": "comfyui",
  "category": "文生图",
  "isPublic": true,
  "positivePrompt": "beautiful landscape",
  "tags": ["风景", "AI"]
}

Response:
{
  "id": "uuid",
  "message": "创建成功"
}
```

### 获取日志列表
```http
GET /api/entries
Authorization: Bearer <token>

Response:
{
  "results": [
    {
      "id": "uuid",
      "title": "...",
      "isPublic": true,
      ...
    }
  ]
}
```

## 错误码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容(删除成功) |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 权限说明

### 日志权限
- **公开日志**: 所有人可查看，仅创建者可编辑/删除
- **私密日志**: 仅创建者和管理员可查看/编辑/删除

### 用户角色
- **user**: 普通用户
- **admin**: 管理员，拥有所有权限

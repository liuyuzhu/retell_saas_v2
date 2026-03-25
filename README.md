# Retell AI SaaS 管理后台

基于 Retell AI 语音平台的综合管理后台，提供完整的 API 集成、用户权限管理和现代化管理界面。

## 项目概览

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI 库 | React 19 + shadcn/ui |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript 5 |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | JWT + bcryptjs |
| 邮件服务 | Nodemailer + Resend |
| 语音 API | Retell AI SDK |
| 国际化 | next-intl (11 种语言) |
| 包管理 | pnpm |

---

## 系统架构

### 1. 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # 国际化路由
│   │   ├── page.tsx              # 首页/仪表盘
│   │   ├── login/                # 登录页
│   │   ├── register/             # 注册页
│   │   ├── forgot-password/      # 忘记密码
│   │   ├── reset-password/       # 重置密码
│   │   ├── agents/               # Agent 管理
│   │   ├── calls/                # 通话记录
│   │   │   └── web/[callId]/     # Web 通话页
│   │   ├── conversations/        # 对话记录
│   │   ├── phone-numbers/       # 电话号码管理
│   │   ├── voices/               # 语音管理
│   │   ├── settings/             # 设置页
│   │   └── admin/                # 管理后台
│   │       ├── users/            # 用户管理
│   │       └── settings/         # 系统配置
│   └── api/                      # API 路由
│       ├── auth/                 # 认证相关
│       ├── agents/               # Agent 操作
│       ├── calls/                # 通话操作
│       ├── conversations/        # 对话记录
│       ├── phone-numbers/        # 电话号码
│       ├── voices/               # 语音
│       ├── webhook/retell/       # Retell Webhook
│       └── admin/                # 管理接口
├── components/                    # React 组件
│   ├── ui/                      # shadcn/ui 组件
│   ├── dashboard-layout.tsx      # 仪表盘布局
│   ├── app-sidebar.tsx           # 侧边栏
│   └── mobile-nav.tsx           # 移动端导航
├── lib/                          # 工具库
│   ├── auth.ts                  # 服务端认证
│   ├── auth-client.ts           # 客户端认证
│   ├── api-helpers.ts           # API 辅助函数
│   ├── api-fetch.ts             # 全局 API 请求
│   ├── retell-client.ts         # Retell AI 客户端
│   ├── email.ts                 # 邮件服务
│   └── validation.ts            # 数据验证
└── storage/
    └── database/                # 数据库层
        ├── supabase-client.ts   # Supabase 客户端
        └── shared/
            ├── schema.ts         # 数据库 Schema
            └── relations.ts      # 表关系定义
```

### 2. 核心架构模式

#### 前后端分离 + JWT 认证

```
┌─────────────┐    Bearer Token    ┌─────────────┐
│   前端      │ ←───────────────→ │   后端 API  │
│  (Next.js)  │                    │  (API Routes) │
└─────────────┘                    └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │   Supabase  │
                                   │  (PostgreSQL)│
                                   └─────────────┘
                                          ↑
                                   ┌──────▼──────┐
                                   │  Retell AI  │
                                   │   (Webhook) │
                                   └─────────────┘
```

#### 数据隔离架构

```
┌─────────────────────────────────────────────────┐
│                 Admin (管理员)                    │
│  - 创建/管理用户                                   │
│  - 配置 Agent 和电话号码                           │
│  - 查看所有数据                                   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              User (普通用户)                      │
│  - 使用分配的 Agent                               │
│  - 使用分配的电话号码                              │
│  - 仅查看自己的通话记录                            │
└─────────────────────────────────────────────────┘
```

---

## 功能模块

### 1. 用户认证系统

#### 注册与登录
- **邮箱注册**：用户通过邮箱注册账户
- **邮箱验证**：注册后发送验证邮件（可选）
- **密码重置**：通过邮件链接重置密码
- **JWT 认证**：使用 Bearer Token 进行身份验证

#### 角色权限
| 角色 | 权限 |
|------|------|
| Admin | 创建用户、配置 Agent、管理系统设置 |
| User | 使用分配的 Agent、电话号码、通话 |

#### 核心文件
- `src/lib/auth.ts` - 服务端认证逻辑
- `src/lib/auth-client.ts` - 客户端认证工具
- `src/app/api/auth/` - 认证 API 路由

### 2. Agent 管理

#### 功能特性
- 列出所有 Agent（管理员）
- 创建新 Agent（仅管理员）
- 更新 Agent 配置
- 分配 Agent 给用户
- 删除 Agent

#### 数据结构
```typescript
interface Agent {
  agent_id: string;
  agent_name: string;
  model: string;
  voice_id: string;
  language?: string;
  // ... 其他配置
}
```

#### 核心文件
- `src/app/api/agents/route.ts` - Agent CRUD API
- `src/app/[locale]/agents/page.tsx` - Agent 管理页面
- `src/lib/retell-client.ts` - Retell AI 客户端

### 3. 通话系统

#### 通话类型
1. **Web 通话 (Web Call)**
   - 基于浏览器的实时语音通话
   - 支持多语言选择
   - 实时转录显示
   - 静音/取消静音控制

2. **电话通话 (Phone Call)**
   - 呼出电话到指定号码
   - 使用分配的电话号码

#### 通话流程
```
创建通话 → 获取 access_token → 加载 SDK → 开始通话
    ↓                                        ↓
记录到数据库 ←── Webhook 回调 ──── 通话结束 → 更新数据库
```

#### 核心文件
- `src/app/api/calls/route.ts` - 通话 API
- `src/app/[locale]/calls/web/[callId]/page.tsx` - Web 通话页面
- `src/app/api/webhook/retell/route.ts` - Webhook 处理

### 4. 对话记录

#### 功能特性
- 查看所有已结束通话
- 显示通话详情（时长、类型、Agent）
- 播放录音（如果有）
- 显示通话转录（如果有）
- 删除对话记录

#### 数据来源
对话记录从 `user_calls` 表获取，该表通过 Webhook 接收 Retell AI 的通话事件来更新。

#### 核心文件
- `src/app/api/conversations/route.ts` - 对话记录 API
- `src/app/[locale]/conversations/page.tsx` - 对话记录页面

### 5. 电话号码管理

#### 功能特性
- 列出所有电话号码（管理员）
- 分配电话号码给用户
- 查看电话号码详情
- 号码状态监控

#### 核心文件
- `src/app/api/phone-numbers/route.ts` - 电话号码 API
- `src/app/[locale]/phone-numbers/page.tsx` - 电话号码页面

### 6. 语音管理

#### 功能特性
- 列出可用语音
- 语音预览
- 按语言/性别筛选
- Agent 语音配置

#### 核心文件
- `src/app/api/voices/route.ts` - 语音 API
- `src/app/[locale]/voices/page.tsx` - 语音管理页面

### 7. 管理后台

#### 用户管理
- 创建/编辑/删除用户
- 分配 Agent 和电话号码
- 查看用户通话统计
- 用户状态管理

#### 系统配置
- Retell API Key 配置
- 邮件服务配置
- 系统参数设置

#### 核心文件
- `src/app/api/admin/users/` - 用户管理 API
- `src/app/api/admin/config/` - 系统配置 API
- `src/app/[locale]/admin/` - 管理页面

---

## 数据库设计

### 表结构

#### users - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR | 邮箱（唯一） |
| password_hash | TEXT | 密码哈希 |
| name | VARCHAR | 名称 |
| role | VARCHAR | 角色 (admin/user) |
| phone | VARCHAR | 手机号 |
| is_active | BOOLEAN | 账户状态 |
| created_at | TIMESTAMP | 创建时间 |

#### user_agents - 用户-Agent 关联表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| agent_id | VARCHAR | Retell Agent ID |
| assigned_at | TIMESTAMP | 分配时间 |

#### user_phone_numbers - 用户-电话关联表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| phone_number | VARCHAR | 电话号码 |
| assigned_at | TIMESTAMP | 分配时间 |

#### user_calls - 通话记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| call_id | VARCHAR | Retell 通话 ID |
| call_type | VARCHAR | 通话类型 |
| agent_id | VARCHAR | Agent ID |
| call_status | VARCHAR | 状态 |
| start_timestamp | BIGINT | 开始时间 |
| end_timestamp | BIGINT | 结束时间 |
| duration | INTEGER | 时长（毫秒） |
| recording_url | TEXT | 录音 URL |
| transcript | TEXT | 转录文本 |

#### system_configs - 系统配置表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| config_key | VARCHAR | 配置键 |
| config_value | TEXT | 配置值 |
| category | VARCHAR | 分类 |
| description | TEXT | 描述 |

---

## API 设计

### 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户登出 |
| GET | /api/auth/me | 获取当前用户 |
| POST | /api/auth/forgot-password | 忘记密码 |
| POST | /api/auth/reset-password | 重置密码 |

### Agent API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 列出 Agent |
| POST | /api/agents | 创建 Agent |
| GET | /api/agents/[id] | 获取 Agent 详情 |
| PATCH | /api/agents/[id] | 更新 Agent |
| DELETE | /api/agents/[id] | 删除 Agent |

### 通话 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/calls | 列出通话记录 |
| POST | /api/calls | 创建通话 |
| GET | /api/calls/[id] | 获取通话详情 |
| DELETE | /api/calls/[id] | 删除通话 |

### 管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/users | 列出所有用户 |
| POST | /api/admin/users | 创建用户 |
| PATCH | /api/admin/users/[id] | 更新用户 |
| DELETE | /api/admin/users/[id] | 删除用户 |
| GET | /api/admin/config | 获取配置 |
| POST | /api/admin/config | 创建配置 |
| PATCH | /api/admin/config | 更新配置 |

---

## 国际化

### 支持语言
- 中文 (zh)
- 英语 (en)
- 日语 (ja)
- 韩语 (ko)
- 西班牙语 (es)
- 法语 (fr)
- 德语 (de)
- 葡萄牙语 (pt)
- 俄语 (ru)
- 阿拉伯语 (ar)
- 印地语 (hi)

### 翻译文件
- `messages/zh.json` - 中文翻译
- `messages/en.json` - 英文翻译
- 其他语言...

---

## Webhook 集成

### Retell AI Webhook

#### 端点
`POST /api/webhook/retell`

#### 支持事件
| 事件 | 说明 |
|------|------|
| call_started | 通话开始 |
| call_ended | 通话结束 |
| transcript | 转录更新 |
| call.updated | 通话状态更新 |

#### 数据处理
```typescript
// 示例：处理通话结束事件
case 'call_ended':
  await client.from('user_calls').update({
    call_status: 'ended',
    end_timestamp: Date.now(),
    duration: duration,
    recording_url: recording_url,
    transcript: transcript,
  }).eq('call_id', call_id);
  break;
```

---

## 安全性

### 认证机制
- JWT Token 认证（7 天有效期）
- Bearer Token 传递方式
- 密码 bcrypt 加密（12 轮盐）

### 数据隔离
- 基于用户 ID 的数据隔离
- Admin 可访问所有数据
- 普通用户只能访问自己的数据

### 访问控制
- 角色权限检查（Admin/User）
- 资源所有权验证
- Agent 和电话号码使用权限检查

---

## 环境变量

### 必需变量
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT
JWT_SECRET=

# Retell AI
RETELL_API_KEY=

# 邮件服务
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# 主账户
PRIMARY_ACCOUNT_EMAIL=liuyuzhu19882@gmail.com
```

---

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 填入实际值
```

### 3. 初始化数据库
访问 `/api/admin/db/init` 初始化数据库表。

### 4. 启动开发服务器
```bash
pnpm dev
```

### 5. 访问系统
- 地址：http://localhost:5000
- 默认语言：中文
- 管理员账户：`liuyuzhu19882@gmail.com`

---

## 部署

### 构建
```bash
pnpm build
```

### 生产环境启动
```bash
pnpm start
```

### Docker 部署（可选）
```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 5000
CMD ["pnpm", "start"]
```

---

## 未来扩展

### 计划功能
1. **实时监控仪表盘** - 实时显示通话状态
2. **数据分析** - 通话统计、用户行为分析
3. **团队管理** - 多级团队组织架构
4. **API 限流** - 基于套餐的 API 调用限制
5. **WebSocket 支持** - 实时消息推送

---

## 许可证

Private - All Rights Reserved

# 邮件服务配置说明

## 当前状态

邮件服务已集成，支持两种模式：
1. **SMTP 模式** (阿里云企业邮箱) - 当前配置，但认证失败
2. **Resend API 模式** (推荐) - 更稳定可靠

## SMTP 模式问题

当前使用的阿里云企业邮箱 SMTP 认证失败 (错误码 526)。

### 原因分析

阿里云邮箱的 SMTP 需要使用**专用授权码**，而不是登录密码。

授权码获取步骤：
1. 登录阿里云邮箱网页版：https://mail.aliyun.com
2. 点击右上角「设置」→「POP3/SMTP/IMAP」
3. 勾选「POP3/SMTP服务」和「IMAP/SMTP服务」
4. 点击「生成授权码」
5. 保存授权码（注意：授权码只显示一次）

### 可能的解决方案

1. **检查授权码是否正确**
   - 确保使用的是生成的授权码，而不是登录密码
   - 授权码通常是一串 16-32 位的随机字符串

2. **检查账户状态**
   - 确保邮箱账户已激活
   - 确保没有超过发送限制

3. **检查 IP 限制**
   - 阿里云邮箱可能对 IP 有访问限制
   - 尝试使用 Resend API 模式

## Resend API 模式 (推荐)

Resend 是一个现代化的邮件 API 服务，比传统 SMTP 更稳定可靠。

### 配置步骤

1. 访问 https://resend.com 注册账号
2. 在 Dashboard 中创建 API Key
3. 添加域名或使用默认域名
4. 在 `.env.local` 中添加配置：

```bash
# Resend API (推荐)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=info@migeaiservice.cn
```

5. 重启服务使配置生效

### 优点

- 无需配置 SMTP 服务器
- 更稳定的送达率
- 支持批量发送
- 详细的发送统计
- 免费额度：100 封/天

## 测试邮件发送

服务启动后，可以访问以下 API 测试邮件发送：

```bash
# 检查配置状态
curl http://localhost:5000/api/test-email

# 发送欢迎邮件
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"welcome","locale":"zh"}' \
  http://localhost:5000/api/test-email

# 发送密码重置邮件
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"reset","locale":"zh"}' \
  http://localhost:5000/api/test-email
```

## 邮件模板

邮件服务包含以下模板：

### 欢迎邮件 (Welcome Email)
- 发送给新注册用户
- 包含平台功能介绍
- 提供开始使用按钮

### 密码重置邮件 (Password Reset Email)
- 发送给忘记密码的用户
- 包含密码重置链接
- 链接有效期 1 小时
- 支持多语言

所有邮件模板都使用美观的 HTML 样式，兼容主流邮件客户端。

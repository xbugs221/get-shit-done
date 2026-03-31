# 外部集成模板

用于 `.planning/codebase/INTEGRATIONS.md` 的模板 - 记录外部服务依赖。

**目的：** 记录此代码库与哪些外部系统通信。聚焦于"我们的代码之外依赖什么"。

---

## 文件模板

```markdown
# 外部集成

**分析日期：** [YYYY-MM-DD]

## API 和外部服务

**支付处理：**
- [服务] - [用途：例如 "订阅计费、一次性支付"]
  - SDK/客户端：[例如 "stripe npm 包 v14.x"]
  - 认证：[例如 "API 密钥在 STRIPE_SECRET_KEY 环境变量中"]
  - 使用的端点：[例如 "结账会话、webhooks"]

**邮件/短信：**
- [服务] - [用途：例如 "事务性邮件"]
  - SDK/客户端：[例如 "sendgrid/mail v8.x"]
  - 认证：[例如 "API 密钥在 SENDGRID_API_KEY 环境变量中"]
  - 模板：[例如 "在 SendGrid 仪表板中管理"]

**外部 API：**
- [服务] - [用途]
  - 集成方式：[例如 "通过 fetch 的 REST API"、"GraphQL 客户端"]
  - 认证：[例如 "OAuth2 令牌在 AUTH_TOKEN 环境变量中"]
  - 速率限制：[如适用]

## 数据存储

**数据库：**
- [类型/提供商] - [例如 "Supabase 上的 PostgreSQL"]
  - 连接：[例如 "通过 DATABASE_URL 环境变量"]
  - 客户端：[例如 "Prisma ORM v5.x"]
  - 迁移：[例如 "migrations/ 中的 prisma migrate"]

**文件存储：**
- [服务] - [例如 "AWS S3 用于用户上传"]
  - SDK/客户端：[例如 "@aws-sdk/client-s3"]
  - 认证：[例如 "IAM 凭证在 AWS_* 环境变量中"]
  - 存储桶：[例如 "prod-uploads、dev-uploads"]

**缓存：**
- [服务] - [例如 "Redis 用于会话存储"]
  - 连接：[例如 "REDIS_URL 环境变量"]
  - 客户端：[例如 "ioredis v5.x"]

## 认证与身份

**认证提供商：**
- [服务] - [例如 "Supabase Auth"、"Auth0"、"自定义 JWT"]
  - 实现：[例如 "Supabase 客户端 SDK"]
  - 令牌存储：[例如 "httpOnly cookies"、"localStorage"]
  - 会话管理：[例如 "JWT 刷新令牌"]

**OAuth 集成：**
- [提供商] - [例如 "Google OAuth 用于登录"]
  - 凭证：[例如 "GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET"]
  - 作用域：[例如 "email、profile"]

## 监控与可观测性

**错误跟踪：**
- [服务] - [例如 "Sentry"]
  - DSN：[例如 "SENTRY_DSN 环境变量"]
  - 版本跟踪：[例如 "通过 SENTRY_RELEASE"]

**分析：**
- [服务] - [例如 "Mixpanel 用于产品分析"]
  - 令牌：[例如 "MIXPANEL_TOKEN 环境变量"]
  - 跟踪的事件：[例如 "用户操作、页面浏览"]

**日志：**
- [服务] - [例如 "CloudWatch"、"Datadog"、"无（仅 stdout）"]
  - 集成：[例如 "AWS Lambda 内置"]

## CI/CD 与部署

**托管：**
- [平台] - [例如 "Vercel"、"AWS Lambda"、"ECS 上的 Docker 容器"]
  - 部署：[例如 "推送到 main 分支时自动部署"]
  - 环境变量：[例如 "在 Vercel 仪表板中配置"]

**CI 流水线：**
- [服务] - [例如 "GitHub Actions"]
  - 工作流：[例如 "test.yml、deploy.yml"]
  - 密钥：[例如 "存储在 GitHub 仓库密钥中"]

## 环境配置

**开发环境：**
- 必需的环境变量：[列出关键变量]
- 密钥位置：[例如 ".env.local（已 gitignore）"、"1Password 保管库"]
- Mock/桩服务：[例如 "Stripe 测试模式"、"本地 PostgreSQL"]

**预发布环境：**
- 特定于环境的差异：[例如 "使用预发布 Stripe 账户"]
- 数据：[例如 "独立的预发布数据库"]

**生产环境：**
- 密钥管理：[例如 "Vercel 环境变量"]
- 故障转移/冗余：[例如 "多区域数据库复制"]

## Webhook 与回调

**入站：**
- [服务] - [端点：例如 "/api/webhooks/stripe"]
  - 验证：[例如 "通过 stripe.webhooks.constructEvent 进行签名验证"]
  - 事件：[例如 "payment_intent.succeeded、customer.subscription.updated"]

**出站：**
- [服务] - [触发条件]
  - 端点：[例如 "用户注册时的外部 CRM webhook"]
  - 重试逻辑：[如适用]

---

*集成审计：[日期]*
*在添加/移除外部服务时更新*
```

<good_examples>
```markdown
# 外部集成

**分析日期：** 2025-01-20

## API 和外部服务

**支付处理：**
- Stripe - 订阅计费和一次性课程支付
  - SDK/客户端：stripe npm 包 v14.8
  - 认证：API 密钥在 STRIPE_SECRET_KEY 环境变量中
  - 使用的端点：结账会话、客户门户、webhooks

**邮件/短信：**
- SendGrid - 事务性邮件（收据、密码重置）
  - SDK/客户端：@sendgrid/mail v8.1
  - 认证：API 密钥在 SENDGRID_API_KEY 环境变量中
  - 模板：在 SendGrid 仪表板中管理（模板 ID 在代码中）

**外部 API：**
- OpenAI API - 课程内容生成
  - 集成方式：通过 openai npm 包 v4.x 的 REST API
  - 认证：Bearer 令牌在 OPENAI_API_KEY 环境变量中
  - 速率限制：3500 请求/分钟（第 3 层级）

## 数据存储

**数据库：**
- Supabase 上的 PostgreSQL - 主数据存储
  - 连接：通过 DATABASE_URL 环境变量
  - 客户端：Prisma ORM v5.8
  - 迁移：prisma/migrations/ 中的 prisma migrate

**文件存储：**
- Supabase Storage - 用户上传（头像、课程材料）
  - SDK/客户端：@supabase/supabase-js v2.x
  - 认证：Service role 密钥在 SUPABASE_SERVICE_ROLE_KEY 中
  - 存储桶：avatars（公开）、course-materials（私有）

**缓存：**
- 目前无缓存（全部数据库查询，无 Redis）

## 认证与身份

**认证提供商：**
- Supabase Auth - 邮箱/密码 + OAuth
  - 实现：Supabase 客户端 SDK 配合服务端会话管理
  - 令牌存储：通过 @supabase/ssr 的 httpOnly cookies
  - 会话管理：由 Supabase 处理的 JWT 刷新令牌

**OAuth 集成：**
- Google OAuth - 社交登录
  - 凭证：GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET（Supabase 仪表板）
  - 作用域：email、profile

## 监控与可观测性

**错误跟踪：**
- Sentry - 服务端和客户端错误
  - DSN：SENTRY_DSN 环境变量
  - 版本跟踪：通过 SENTRY_RELEASE 使用 Git commit SHA

**分析：**
- 无（计划使用 Mixpanel）

**日志：**
- Vercel 日志 - 仅 stdout/stderr
  - 保留期：Pro 计划 7 天

## CI/CD 与部署

**托管：**
- Vercel - Next.js 应用托管
  - 部署：推送到 main 分支时自动部署
  - 环境变量：在 Vercel 仪表板中配置（同步到 .env.example）

**CI 流水线：**
- GitHub Actions - 测试和类型检查
  - 工作流：.github/workflows/ci.yml
  - 密钥：不需要（仅公开仓库测试）

## 环境配置

**开发环境：**
- 必需的环境变量：DATABASE_URL、NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY
- 密钥位置：.env.local（已 gitignore），团队通过 1Password 保管库共享
- Mock/桩服务：Stripe 测试模式、Supabase 本地开发项目

**预发布环境：**
- 使用独立的 Supabase 预发布项目
- Stripe 测试模式
- 相同 Vercel 账户，不同环境

**生产环境：**
- 密钥管理：Vercel 环境变量
- 数据库：Supabase 生产项目，每日备份

## Webhook 与回调

**入站：**
- Stripe - /api/webhooks/stripe
  - 验证：通过 stripe.webhooks.constructEvent 进行签名验证
  - 事件：payment_intent.succeeded、customer.subscription.updated、customer.subscription.deleted

**出站：**
- 无

---

*集成审计：2025-01-20*
*在添加/移除外部服务时更新*
```
</good_examples>

<guidelines>
**INTEGRATIONS.md 中应包含的内容：**
- 代码通信的外部服务
- 认证模式（密钥存放位置，而非密钥本身）
- 使用的 SDK 和客户端库
- 环境变量名称（不是值）
- Webhook 端点和验证方式
- 数据库连接模式
- 文件存储位置
- 监控和日志服务

**不应包含在此处的内容：**
- 实际的 API 密钥或密钥（永远不要写入这些）
- 内部架构（那是 ARCHITECTURE.md 的内容）
- 代码模式（那是 PATTERNS.md 的内容）
- 技术选型（那是 STACK.md 的内容）
- 性能问题（那是 CONCERNS.md 的内容）

**填写此模板时：**
- 检查 .env.example 或 .env.template 了解必需的环境变量
- 查找 SDK 导入（stripe、@sendgrid/mail 等）
- 检查路由/端点中的 webhook 处理器
- 记录密钥的管理位置（而非密钥本身）
- 记录特定于环境的差异（开发/预发布/生产）
- 包含每个服务的认证模式

**在以下情况下对阶段规划有用：**
- 添加新的外部服务集成
- 调试认证问题
- 了解应用外部的数据流
- 搭建新环境
- 审计第三方依赖
- 规划服务中断或迁移

**安全注意事项：**
记录密钥存放在哪里（环境变量、Vercel 仪表板、1Password），永远不要记录密钥是什么。
</guidelines>

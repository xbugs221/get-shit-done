# 用户配置模板

`.planning/phases/XX-name/{phase}-USER-SETUP.md` 的模板 - Claude 无法自动完成的、需要人工操作的配置。

**目的：** 记录确实需要人工操作的配置任务 - 创建账户、配置仪表盘、获取密钥。Claude 会自动化一切可能的操作；此文件仅记录剩余的人工任务。

---

## 文件模板

```markdown
# 阶段 {X}：需要用户配置

**生成日期：** [YYYY-MM-DD]
**阶段：** {phase-name}
**状态：** 未完成

请完成以下事项以使集成正常工作。Claude 已自动化了所有可能的操作；以下事项需要人工访问外部仪表盘/账户。

## 环境变量

| 状态 | 变量 | 来源 | 添加到 |
|------|------|------|--------|
| [ ] | `ENV_VAR_NAME` | [服务仪表盘 → 路径 → 到 → 值] | `.env.local` |
| [ ] | `ANOTHER_VAR` | [服务仪表盘 → 路径 → 到 → 值] | `.env.local` |

## 账户创建

[仅在需要创建新账户时填写]

- [ ] **创建 [服务] 账户**
  - URL：[注册链接]
  - 跳过条件：已有账户

## 仪表盘配置

[仅在需要仪表盘配置时填写]

- [ ] **[配置任务]**
  - 位置：[服务仪表盘 → 路径 → 到 → 设置]
  - 设置为：[所需值或配置]
  - 备注：[重要细节]

## 验证

完成配置后，使用以下命令验证：

```bash
# [验证命令]
```

预期结果：
- [成功的表现是什么]

---

**所有事项完成后：** 在文件顶部将状态标记为"已完成"。
```

---

## 何时生成

当计划前置元数据包含 `user_setup` 字段时生成 `{phase}-USER-SETUP.md`。

**触发条件：** PLAN.md 前置元数据中存在 `user_setup` 且有内容。

**位置：** 与 PLAN.md 和 SUMMARY.md 在同一目录。

**时机：** 在 execute-plan.md 执行期间，任务完成后、创建 SUMMARY.md 之前生成。

---

## 前置元数据模式

在 PLAN.md 中，`user_setup` 声明需要人工操作的配置：

```yaml
user_setup:
  - service: stripe
    why: "支付处理需要 API 密钥"
    env_vars:
      - name: STRIPE_SECRET_KEY
        source: "Stripe Dashboard → Developers → API keys → Secret key"
      - name: STRIPE_WEBHOOK_SECRET
        source: "Stripe Dashboard → Developers → Webhooks → Signing secret"
    dashboard_config:
      - task: "创建 webhook 端点"
        location: "Stripe Dashboard → Developers → Webhooks → Add endpoint"
        details: "URL: https://[your-domain]/api/webhooks/stripe, Events: checkout.session.completed, customer.subscription.*"
    local_dev:
      - "运行：stripe listen --forward-to localhost:3000/api/webhooks/stripe"
      - "使用 CLI 输出的 webhook secret 用于本地测试"
```

---

## 自动化优先原则

**USER-SETUP.md 仅包含 Claude 确实无法完成的事项。**

| Claude 能做的（不在 USER-SETUP 中） | Claude 不能做的（→ USER-SETUP） |
|-------------------------------------|--------------------------------|
| `npm install stripe` | 创建 Stripe 账户 |
| 编写 webhook 处理器代码 | 从仪表盘获取 API 密钥 |
| 创建 `.env.local` 文件结构 | 复制实际的密钥值 |
| 运行 `stripe listen` | 认证 Stripe CLI（浏览器 OAuth） |
| 配置 package.json | 访问外部服务仪表盘 |
| 编写任何代码 | 从第三方系统获取密钥 |

**判断标准：** "这是否需要人类在浏览器中操作，访问 Claude 没有凭证的账户？"
- 是 → USER-SETUP.md
- 否 → Claude 自动完成

---

## 特定服务示例

<stripe_example>
```markdown
# 阶段 10：需要用户配置

**生成日期：** 2025-01-14
**阶段：** 10-monetization
**状态：** 未完成

请完成以下事项以使 Stripe 集成正常工作。

## 环境变量

| 状态 | 变量 | 来源 | 添加到 |
|------|------|------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key | `.env.local` |
| [ ] | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key | `.env.local` |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → [endpoint] → Signing secret | `.env.local` |

## 账户创建

- [ ] **创建 Stripe 账户**（如需要）
  - URL：https://dashboard.stripe.com/register
  - 跳过条件：已有 Stripe 账户

## 仪表盘配置

- [ ] **创建 webhook 端点**
  - 位置：Stripe Dashboard → Developers → Webhooks → Add endpoint
  - 端点 URL：`https://[your-domain]/api/webhooks/stripe`
  - 要发送的事件：
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`

- [ ] **创建产品和价格**（如使用订阅层级）
  - 位置：Stripe Dashboard → Products → Add product
  - 创建每个订阅层级
  - 将价格 ID 复制到：
    - `STRIPE_STARTER_PRICE_ID`
    - `STRIPE_PRO_PRICE_ID`

## 本地开发

用于本地 webhook 测试：
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
使用 CLI 输出的 webhook 签名密钥（以 `whsec_` 开头）。

## 验证

完成配置后：

```bash
# 检查环境变量是否已设置
grep STRIPE .env.local

# 验证构建通过
npm run build

# 测试 webhook 端点（应返回 400 签名错误，而非 500 崩溃）
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
```

预期结果：构建通过，webhook 返回 400（签名验证正常工作）。

---

**所有事项完成后：** 在文件顶部将状态标记为"已完成"。
```
</stripe_example>

<supabase_example>
```markdown
# 阶段 2：需要用户配置

**生成日期：** 2025-01-14
**阶段：** 02-authentication
**状态：** 未完成

请完成以下事项以使 Supabase Auth 正常工作。

## 环境变量

| 状态 | 变量 | 来源 | 添加到 |
|------|------|------|--------|
| [ ] | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | `.env.local` |
| [ ] | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public | `.env.local` |
| [ ] | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role | `.env.local` |

## 账户创建

- [ ] **创建 Supabase 项目**
  - URL：https://supabase.com/dashboard/new
  - 跳过条件：已有此应用的项目

## 仪表盘配置

- [ ] **启用邮箱认证**
  - 位置：Supabase Dashboard → Authentication → Providers
  - 启用：Email provider
  - 配置：确认邮件（根据偏好开启/关闭）

- [ ] **配置 OAuth 提供商**（如使用社交登录）
  - 位置：Supabase Dashboard → Authentication → Providers
  - Google：从 Google Cloud Console 添加 Client ID 和 Secret
  - GitHub：从 GitHub OAuth Apps 添加 Client ID 和 Secret

## 验证

完成配置后：

```bash
# 检查环境变量
grep SUPABASE .env.local

# 验证连接（在项目目录中运行）
npx supabase status
```

---

**所有事项完成后：** 在文件顶部将状态标记为"已完成"。
```
</supabase_example>

<sendgrid_example>
```markdown
# 阶段 5：需要用户配置

**生成日期：** 2025-01-14
**阶段：** 05-notifications
**状态：** 未完成

请完成以下事项以使 SendGrid 邮件服务正常工作。

## 环境变量

| 状态 | 变量 | 来源 | 添加到 |
|------|------|------|--------|
| [ ] | `SENDGRID_API_KEY` | SendGrid Dashboard → Settings → API Keys → Create API Key | `.env.local` |
| [ ] | `SENDGRID_FROM_EMAIL` | 你已验证的发件人邮箱地址 | `.env.local` |

## 账户创建

- [ ] **创建 SendGrid 账户**
  - URL：https://signup.sendgrid.com/
  - 跳过条件：已有账户

## 仪表盘配置

- [ ] **验证发件人身份**
  - 位置：SendGrid Dashboard → Settings → Sender Authentication
  - 方式 1：单发件人验证（快速，适用于开发）
  - 方式 2：域名认证（适用于生产）

- [ ] **创建 API Key**
  - 位置：SendGrid Dashboard → Settings → API Keys → Create API Key
  - 权限：Restricted Access → Mail Send（Full Access）
  - 立即复制密钥（仅显示一次）

## 验证

完成配置后：

```bash
# 检查环境变量
grep SENDGRID .env.local

# 测试邮件发送（替换为你的测试邮箱）
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your@email.com"}'
```

---

**所有事项完成后：** 在文件顶部将状态标记为"已完成"。
```
</sendgrid_example>

---

## 指南

**永远不要包含：** 实际的密钥值。Claude 可以自动化的步骤（包安装、代码修改）。

**命名规则：** `{phase}-USER-SETUP.md` 匹配阶段编号模式。
**状态跟踪：** 用户勾选复选框并在完成后更新状态行。
**可搜索性：** `grep -r "USER-SETUP" .planning/` 可找到所有需要用户操作的阶段。

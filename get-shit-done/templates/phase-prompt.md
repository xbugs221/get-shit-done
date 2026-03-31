# 阶段提示模板

> **注意：** 规划方法论在 `agents/gsd-planner.md` 中。
> 此模板定义了 agent 生成的 PLAN.md 输出格式。

用于 `.planning/phases/XX-name/{phase}-{plan}-PLAN.md` 的模板 - 为并行执行优化的可执行阶段计划。

**命名规则：** 使用 `{phase}-{plan}-PLAN.md` 格式（例如 `01-02-PLAN.md` 表示阶段 1，计划 2）

---

## 文件模板

```markdown
---
phase: XX-name
plan: NN
type: execute
wave: N                     # 执行波次（1、2、3...）。在规划时预计算。
depends_on: []              # 此计划依赖的计划 ID（例如 ["01-01"]）。
files_modified: []          # 此计划修改的文件。
autonomous: true            # 如果计划有需要用户交互的检查点则为 false
requirements: []            # 必填 — 此计划对应的 ROADMAP 中的需求 ID。不能为空。
user_setup: []              # Claude 无法自动化的人工设置项（见下文）

# 目标回溯验证（在规划时推导，在执行后验证）
must_haves:
  truths: []                # 目标达成必须为真的可观察行为
  artifacts: []             # 必须存在的带有实际实现的文件
  key_links: []             # 产物之间的关键连接
---

<objective>
[此计划完成什么]

Purpose: [为什么这对项目重要]
Output: [将创建什么产物]
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
[如果计划包含检查点任务（type="checkpoint:*"），添加：]
@~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# 仅在确实需要时引用之前计划的 SUMMARY：
# - 此计划使用了之前计划的类型/导出
# - 之前的计划做出了影响此计划的决策
# 不要条件反射式地串联：计划 02 引用 01，计划 03 引用 02...

[相关源文件：]
@src/path/to/relevant.ts
</context>

<tasks>

<task type="auto">
  <name>任务 1：[面向操作的名称]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <read_first>path/to/reference.ext, path/to/source-of-truth.ext</read_first>
  <action>[具体实现 - 做什么、怎么做、避免什么以及为什么。包含具体值：确切的标识符、参数、预期输出、文件路径、命令参数。永远不要说"将 X 与 Y 对齐"而不指定确切的目标状态。]</action>
  <verify>[证明其工作正常的命令或检查]</verify>
  <acceptance_criteria>
    - [可用 grep 验证的条件："file.ext 包含 'exact string'"]
    - [可测量的条件："output.ext 使用 'expected-value'，而不是 'wrong-value'"]
  </acceptance_criteria>
  <done>[可测量的验收标准]</done>
</task>

<task type="auto">
  <name>任务 2：[面向操作的名称]</name>
  <files>path/to/file.ext</files>
  <read_first>path/to/reference.ext</read_first>
  <action>[带有具体值的具体实现]</action>
  <verify>[命令或检查]</verify>
  <acceptance_criteria>
    - [可用 grep 验证的条件]
  </acceptance_criteria>
  <done>[验收标准]</done>
</task>

<!-- 检查点任务的示例和模式，请参阅 @~/.claude/get-shit-done/references/checkpoints.md -->

<task type="checkpoint:decision" gate="blocking">
  <decision>[需要决定什么]</decision>
  <context>[为什么这个决定重要]</context>
  <options>
    <option id="option-a"><name>[名称]</name><pros>[优势]</pros><cons>[权衡]</cons></option>
    <option id="option-b"><name>[名称]</name><pros>[优势]</pros><cons>[权衡]</cons></option>
  </options>
  <resume-signal>选择：option-a 或 option-b</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[Claude 构建了什么] - 服务运行在 [URL]</what-built>
  <how-to-verify>访问 [URL] 并验证：[仅视觉检查，不要 CLI 命令]</how-to-verify>
  <resume-signal>输入 "approved" 或描述问题</resume-signal>
</task>

</tasks>

<verification>
在声明计划完成之前：
- [ ] [具体的测试命令]
- [ ] [构建/类型检查通过]
- [ ] [行为验证]
</verification>

<success_criteria>

- 所有任务已完成
- 所有验证检查通过
- 没有引入错误或警告
- [计划特定的标准]
  </success_criteria>

<output>
完成后，创建 `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md`
</output>
```

---

## 前置元数据字段

| 字段 | 必填 | 用途 |
|-------|----------|---------|
| `phase` | 是 | 阶段标识符（例如 `01-foundation`） |
| `plan` | 是 | 阶段内的计划编号（例如 `01`、`02`） |
| `type` | 是 | 标准计划始终为 `execute`，TDD 计划为 `tdd` |
| `wave` | 是 | 执行波次编号（1、2、3...）。在规划时预计算。 |
| `depends_on` | 是 | 此计划依赖的计划 ID 数组。 |
| `files_modified` | 是 | 此计划涉及的文件。 |
| `autonomous` | 是 | 无检查点时为 `true`，有检查点时为 `false` |
| `requirements` | 是 | **必须**列出 ROADMAP 中的需求 ID。每个路线图需求必须至少出现在一个计划中。 |
| `user_setup` | 否 | 人工设置项数组（外部服务） |
| `must_haves` | 是 | 目标回溯验证标准（见下文） |

**波次是预计算的：** 波次编号在 `/gsd:plan-phase` 期间分配。Execute-phase 直接从前置元数据读取 `wave` 并按波次编号分组计划。不需要运行时依赖分析。

**必须项启用验证：** `must_haves` 字段将目标回溯需求从规划传递到执行。在所有计划完成后，execute-phase 生成一个验证子 agent，根据实际代码库检查这些标准。

---

## 并行与顺序执行

<parallel_examples>

**波次 1 候选项（并行）：**

```yaml
# 计划 01 - 用户功能
wave: 1
depends_on: []
files_modified: [src/models/user.ts, src/api/users.ts]
autonomous: true

# 计划 02 - 产品功能（与计划 01 无重叠）
wave: 1
depends_on: []
files_modified: [src/models/product.ts, src/api/products.ts]
autonomous: true

# 计划 03 - 订单功能（无重叠）
wave: 1
depends_on: []
files_modified: [src/models/order.ts, src/api/orders.ts]
autonomous: true
```

三个计划全部并行运行（波次 1）- 无依赖，无文件冲突。

**顺序执行（真正的依赖）：**

```yaml
# 计划 01 - 认证基础
wave: 1
depends_on: []
files_modified: [src/lib/auth.ts, src/middleware/auth.ts]
autonomous: true

# 计划 02 - 受保护功能（需要认证）
wave: 2
depends_on: ["01"]
files_modified: [src/features/dashboard.ts]
autonomous: true
```

计划 02 在波次 2 等待波次 1 的计划 01 完成 - 对认证类型/中间件有真正的依赖。

**检查点计划：**

```yaml
# 计划 03 - 带验证的 UI
wave: 3
depends_on: ["01", "02"]
files_modified: [src/components/Dashboard.tsx]
autonomous: false  # 包含 checkpoint:human-verify
```

波次 3 在波次 1 和 2 之后运行。在检查点暂停，编排器将其呈现给用户，批准后恢复。

</parallel_examples>

---

## 上下文部分

**并行感知的上下文：**

```markdown
<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# 仅在确实需要时包含 SUMMARY 引用：
# - 此计划导入了之前计划的类型
# - 之前的计划做出了影响此计划的决策
# - 之前计划的输出是此计划的输入
#
# 独立的计划不需要之前的 SUMMARY 引用。
# 不要条件反射式地串联：02 引用 01，03 引用 02...

@src/relevant/source.ts
</context>
```

**错误模式（创建虚假依赖）：**
```markdown
<context>
@.planning/phases/03-features/03-01-SUMMARY.md  # 仅仅因为它在前面
@.planning/phases/03-features/03-02-SUMMARY.md  # 条件反射式串联
</context>
```

---

## 范围指南

**计划大小：**

- 每个计划 2-3 个任务
- 最多约 50% 上下文使用量
- 复杂阶段：多个聚焦的计划，而不是一个大计划

**何时拆分：**

- 不同的子系统（认证 vs API vs UI）
- 超过 3 个任务
- 有上下文溢出风险
- TDD 候选项 - 单独的计划

**优先垂直切片：**

```
推荐：计划 01 = 用户（模型 + API + UI）
      计划 02 = 产品（模型 + API + UI）

避免：计划 01 = 所有模型
      计划 02 = 所有 API
      计划 03 = 所有 UI
```

---

## TDD 计划

TDD 功能使用 `type: tdd` 的专用计划。

**启发规则：** 你能在编写 `fn` 之前写出 `expect(fn(input)).toBe(output)` 吗？
→ 能：创建 TDD 计划
→ 不能：标准计划中的标准任务

参见 `~/.claude/get-shit-done/references/tdd.md` 了解 TDD 计划结构。

---

## 任务类型

| 类型 | 用途 | 自主性 |
|------|---------|----------|
| `auto` | Claude 能独立完成的所有事情 | 完全自主 |
| `checkpoint:human-verify` | 视觉/功能验证 | 暂停，返回编排器 |
| `checkpoint:decision` | 实现选择 | 暂停，返回编排器 |
| `checkpoint:human-action` | 真正不可避免的手动步骤（少见） | 暂停，返回编排器 |

**并行执行中的检查点行为：**
- 计划运行到检查点
- Agent 返回检查点详情 + agent_id
- 编排器呈现给用户
- 用户回应
- 编排器使用 `resume: agent_id` 恢复 agent

---

## 示例

**自主并行计划：**

```markdown
---
phase: 03-features
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/features/user/model.ts, src/features/user/api.ts, src/features/user/UserList.tsx]
autonomous: true
---

<objective>
将完整的用户功能实现为垂直切片。

Purpose: 可与其他功能并行运行的独立用户管理。
Output: 用户模型、API 端点和 UI 组件。
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>
<task type="auto">
  <name>任务 1：创建用户模型</name>
  <files>src/features/user/model.ts</files>
  <action>定义包含 id、email、name、createdAt 的 User 类型。导出 TypeScript 接口。</action>
  <verify>tsc --noEmit 通过</verify>
  <done>User 类型已导出且可用</done>
</task>

<task type="auto">
  <name>任务 2：创建用户 API 端点</name>
  <files>src/features/user/api.ts</files>
  <action>GET /users（列表）、GET /users/:id（单个）、POST /users（创建）。使用模型中的 User 类型。</action>
  <verify>所有端点的 fetch 测试通过</verify>
  <done>所有 CRUD 操作可用</done>
</task>
</tasks>

<verification>
- [ ] npm run build 成功
- [ ] API 端点正确响应
</verification>

<success_criteria>
- 所有任务已完成
- 用户功能端到端可用
</success_criteria>

<output>
完成后，创建 `.planning/phases/03-features/03-01-SUMMARY.md`
</output>
```

**带检查点的计划（非自主）：**

```markdown
---
phase: 03-features
plan: 03
type: execute
wave: 2
depends_on: ["03-01", "03-02"]
files_modified: [src/components/Dashboard.tsx]
autonomous: false
---

<objective>
构建仪表板并进行视觉验证。

Purpose: 将用户和产品功能集成到统一视图中。
Output: 可用的仪表板组件。
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
@~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-features/03-01-SUMMARY.md
@.planning/phases/03-features/03-02-SUMMARY.md
</context>

<tasks>
<task type="auto">
  <name>任务 1：构建仪表板布局</name>
  <files>src/components/Dashboard.tsx</files>
  <action>创建包含 UserList 和 ProductList 组件的响应式网格。使用 Tailwind 进行样式设计。</action>
  <verify>npm run build 成功</verify>
  <done>仪表板渲染无错误</done>
</task>

<!-- 检查点模式：Claude 启动服务器，用户访问 URL。完整模式请参阅 checkpoints.md。 -->
<task type="auto">
  <name>启动开发服务器</name>
  <action>在后台运行 `npm run dev`，等待就绪</action>
  <verify>fetch http://localhost:3000 返回 200</verify>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>仪表板 - 服务运行在 http://localhost:3000</what-built>
  <how-to-verify>访问 localhost:3000/dashboard。检查：桌面端网格布局、移动端堆叠布局、无滚动问题。</how-to-verify>
  <resume-signal>输入 "approved" 或描述问题</resume-signal>
</task>
</tasks>

<verification>
- [ ] npm run build 成功
- [ ] 视觉验证通过
</verification>

<success_criteria>
- 所有任务已完成
- 用户批准了视觉布局
</success_criteria>

<output>
完成后，创建 `.planning/phases/03-features/03-03-SUMMARY.md`
</output>
```

---

## 反模式

**错误：条件反射式依赖串联**
```yaml
depends_on: ["03-01"]  # 仅仅因为 01 在 02 之前
```

**错误：水平层分组**
```
计划 01：所有模型
计划 02：所有 API（依赖 01）
计划 03：所有 UI（依赖 02）
```

**错误：缺少自主性标志**
```yaml
# 有检查点但没有 autonomous: false
depends_on: []
files_modified: [...]
# autonomous: ???  <- 缺失！
```

**错误：模糊的任务**
```xml
<task type="auto">
  <name>设置认证</name>
  <action>给应用添加认证</action>
</task>
```

**错误：缺少 read_first（执行器修改未读取的文件）**
```xml
<task type="auto">
  <name>更新数据库配置</name>
  <files>src/config/database.ts</files>
  <!-- 没有 read_first！执行器不知道当前状态或约定 -->
  <action>更新数据库配置以匹配生产环境设置</action>
</task>
```

**错误：模糊的验收标准（不可验证）**
```xml
<acceptance_criteria>
  - 配置已正确设置
  - 数据库连接正常工作
</acceptance_criteria>
```

**正确：具体的 read_first + 可验证的标准**
```xml
<task type="auto">
  <name>更新数据库配置以支持连接池</name>
  <files>src/config/database.ts</files>
  <read_first>src/config/database.ts, .env.example, docker-compose.yml</read_first>
  <action>添加连接池配置：min=2, max=20, idleTimeoutMs=30000。添加 SSL 配置：NODE_ENV=production 时 rejectUnauthorized=true。在 .env.example 中添加条目：DATABASE_POOL_MAX=20。</action>
  <acceptance_criteria>
    - database.ts 包含 "max: 20" 和 "idleTimeoutMillis: 30000"
    - database.ts 包含基于 NODE_ENV 的 SSL 条件判断
    - .env.example 包含 DATABASE_POOL_MAX
  </acceptance_criteria>
</task>
```

---

## 指南

- 始终使用 XML 结构以便 Claude 解析
- 每个计划都包含 `wave`、`depends_on`、`files_modified`、`autonomous`
- 优先垂直切片而非水平分层
- 仅在确实需要时引用之前的 SUMMARY
- 将检查点与相关的自动任务放在同一计划中
- 每个计划 2-3 个任务，最多约 50% 上下文

---

## 用户设置（外部服务）

当计划引入需要人工配置的外部服务时，在前置元数据中声明：

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
        details: "URL: https://[your-domain]/api/webhooks/stripe"
    local_dev:
      - "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
```

**自动化优先规则：** `user_setup` 仅包含 Claude 确实无法完成的事项：
- 账号创建（需要人工注册）
- 密钥获取（需要访问仪表板）
- 仪表板配置（需要人工在浏览器中操作）

**不包含：** 包安装、代码更改、文件创建、Claude 可以运行的 CLI 命令。

**结果：** Execute-plan 生成 `{phase}-USER-SETUP.md`，包含给用户的检查清单。

参见 `~/.claude/get-shit-done/templates/user-setup.md` 了解完整的模式和示例

---

## 必须项（目标回溯验证）

`must_haves` 字段定义了阶段目标达成必须为 TRUE 的条件。在规划时推导，在执行后验证。

**结构：**

```yaml
must_haves:
  truths:
    - "用户可以看到现有消息"
    - "用户可以发送消息"
    - "消息在刷新后持久化"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "消息列表渲染"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "消息 CRUD 操作"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "消息模型"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "useEffect 中的 fetch"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "数据库查询"
      pattern: "prisma\\.message\\.(find|create)"
```

**字段描述：**

| 字段 | 用途 |
|-------|---------|
| `truths` | 从用户角度可观察的行为。每个都必须可测试。 |
| `artifacts` | 必须存在的带有实际实现的文件。 |
| `artifacts[].path` | 相对于项目根目录的文件路径。 |
| `artifacts[].provides` | 此产物提供什么。 |
| `artifacts[].min_lines` | 可选。被视为实质性内容的最少行数。 |
| `artifacts[].exports` | 可选。要验证的预期导出。 |
| `artifacts[].contains` | 可选。文件中必须存在的模式。 |
| `key_links` | 产物之间的关键连接。 |
| `key_links[].from` | 源产物。 |
| `key_links[].to` | 目标产物或端点。 |
| `key_links[].via` | 如何连接（描述）。 |
| `key_links[].pattern` | 可选。用于验证连接存在的正则表达式。 |

**为什么这很重要：**

任务完成 ≠ 目标达成。一个"创建聊天组件"的任务可以通过创建一个占位符来完成。`must_haves` 字段捕获了实际上必须工作的内容，使验证能够在差距累积之前发现它们。

**验证流程：**

1. Plan-phase 从阶段目标推导 must_haves（目标回溯）
2. Must_haves 写入 PLAN.md 前置元数据
3. Execute-phase 运行所有计划
4. 验证子 agent 根据代码库检查 must_haves
5. 发现差距 → 创建修复计划 → 执行 → 重新验证
6. 所有 must_haves 通过 → 阶段完成

参见 `~/.claude/get-shit-done/workflows/verify-phase.md` 了解验证逻辑。

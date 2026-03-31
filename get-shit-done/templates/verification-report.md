# 验证报告模板

`.planning/phases/XX-name/{phase_num}-VERIFICATION.md` 的模板——阶段目标验证结果。

---

## 文件模板

```markdown
---
phase: XX-name
verified: YYYY-MM-DDTHH:MM:SSZ
status: passed | gaps_found | human_needed
score: N/M must-haves verified
---

# 阶段 {X}：{名称} 验证报告

**阶段目标：** {ROADMAP.md 中的目标}
**验证时间：** {时间戳}
**状态：** {passed | gaps_found | human_needed}

## 目标达成情况

### 可观察事实

| # | 事实 | 状态 | 证据 |
|---|------|------|------|
| 1 | {来自 must_haves 的事实} | ✓ 已验证 | {确认内容} |
| 2 | {来自 must_haves 的事实} | ✗ 失败 | {问题所在} |
| 3 | {来自 must_haves 的事实} | ? 不确定 | {为何无法验证} |

**得分：** {N}/{M} 项事实已验证

### 必需产物

| 产物 | 预期 | 状态 | 详情 |
|------|------|------|------|
| `src/components/Chat.tsx` | 消息列表组件 | ✓ 存在 + 实质内容 | 导出 ChatList，渲染 Message[]，无桩代码 |
| `src/app/api/chat/route.ts` | 消息 CRUD | ✗ 桩代码 | 文件存在但 POST 返回占位符 |
| `prisma/schema.prisma` | Message 模型 | ✓ 存在 + 实质内容 | 模型已定义所有字段 |

**产物：** {N}/{M} 已验证

### 关键链路验证

| 从 | 到 | 通过 | 状态 | 详情 |
|----|-----|------|------|------|
| Chat.tsx | /api/chat | useEffect 中的 fetch | ✓ 已连接 | 第 23 行：`fetch('/api/chat')` 带响应处理 |
| ChatInput | /api/chat POST | onSubmit 处理器 | ✗ 未连接 | onSubmit 仅调用 console.log |
| /api/chat POST | 数据库 | prisma.message.create | ✗ 未连接 | 返回硬编码响应，无数据库调用 |

**连接：** {N}/{M} 条连接已验证

## 需求覆盖

| 需求 | 状态 | 阻塞问题 |
|------|------|----------|
| {REQ-01}：{描述} | ✓ 已满足 | - |
| {REQ-02}：{描述} | ✗ 被阻塞 | API 路由是桩代码 |
| {REQ-03}：{描述} | ? 需人工 | 无法以编程方式验证 WebSocket |

**覆盖率：** {N}/{M} 项需求已满足

## 发现的反模式

| 文件 | 行号 | 模式 | 严重程度 | 影响 |
|------|------|------|----------|------|
| src/app/api/chat/route.ts | 12 | `// TODO: implement` | ⚠️ 警告 | 表示未完成 |
| src/components/Chat.tsx | 45 | `return <div>Placeholder</div>` | 🛑 阻塞 | 不渲染内容 |
| src/hooks/useChat.ts | - | 文件缺失 | 🛑 阻塞 | 预期的 hook 不存在 |

**反模式：** 发现 {N} 个（{blockers} 个阻塞，{warnings} 个警告）

## 需要人工验证

{如果不需要人工验证：}
无——所有可验证项目已通过编程方式检查。

{如果需要人工验证：}

### 1. {测试名称}
**测试：** {要做什么}
**预期：** {应该发生什么}
**为何需人工：** {为何无法以编程方式验证}

### 2. {测试名称}
**测试：** {要做什么}
**预期：** {应该发生什么}
**为何需人工：** {为何无法以编程方式验证}

## 差距摘要

{如果没有差距：}
**未发现差距。** 阶段目标已达成。可以继续。

{如果发现差距：}

### 关键差距（阻塞进展）

1. **{差距名称}**
   - 缺失：{缺少什么}
   - 影响：{为何阻塞目标}
   - 修复：{需要做什么}

2. **{差距名称}**
   - 缺失：{缺少什么}
   - 影响：{为何阻塞目标}
   - 修复：{需要做什么}

### 非关键差距（可延后）

1. **{差距名称}**
   - 问题：{问题所在}
   - 影响：{影响有限，因为...}
   - 建议：{现在修复还是延后}

## 建议修复计划

{如果发现差距，生成修复计划建议：}

### {phase}-{next}-PLAN.md：{修复名称}

**目标：** {修复什么}

**任务：**
1. {修复差距 1 的任务}
2. {修复差距 2 的任务}
3. {验证任务}

**预估范围：** {小 / 中}

---

### {phase}-{next+1}-PLAN.md：{修复名称}

**目标：** {修复什么}

**任务：**
1. {任务}
2. {任务}

**预估范围：** {小 / 中}

---

## 验证元数据

**验证方法：** 目标反推（从阶段目标推导）
**Must-haves 来源：** {PLAN.md frontmatter | 从 ROADMAP.md 目标推导}
**自动化检查：** {N} 通过，{M} 失败
**需要人工检查：** {N}
**总验证时间：** {duration}

---
*验证时间：{timestamp}*
*验证者：Claude（子 agent）*
```

---

## 指南

**状态值：**
- `passed` — 所有 must-haves 已验证，无阻塞
- `gaps_found` — 发现一个或多个关键差距
- `human_needed` — 自动化检查通过但需要人工验证

**证据类型：**
- 对于 EXISTS："文件位于路径，导出 X"
- 对于 SUBSTANTIVE："N 行，包含模式 X、Y、Z"
- 对于 WIRED："第 N 行：连接 A 到 B 的代码"
- 对于 FAILED："缺失因为 X" 或 "桩代码因为 Y"

**严重程度级别：**
- 🛑 阻塞：阻止目标达成，必须修复
- ⚠️ 警告：表示未完成但不阻塞
- ℹ️ 信息：值得注意但不构成问题

**修复计划生成：**
- 仅在 gaps_found 时生成
- 将相关修复合并到单个计划中
- 每个计划保持 2-3 个任务
- 每个计划中包含验证任务

---

## 示例

```markdown
---
phase: 03-chat
verified: 2025-01-15T14:30:00Z
status: gaps_found
score: 2/5 must-haves verified
---

# 阶段 3：聊天界面验证报告

**阶段目标：** 可工作的聊天界面，用户可以发送和接收消息
**验证时间：** 2025-01-15T14:30:00Z
**状态：** gaps_found

## 目标达成情况

### 可观察事实

| # | 事实 | 状态 | 证据 |
|---|------|------|------|
| 1 | 用户可以看到已有消息 | ✗ 失败 | 组件渲染占位符而非消息数据 |
| 2 | 用户可以输入消息 | ✓ 已验证 | 输入框存在且有 onChange 处理器 |
| 3 | 用户可以发送消息 | ✗ 失败 | onSubmit 处理器仅为 console.log |
| 4 | 发送的消息出现在列表中 | ✗ 失败 | 发送后无状态更新 |
| 5 | 消息在刷新后保留 | ? 不确定 | 无法验证——发送功能不工作 |

**得分：** 1/5 项事实已验证

### 必需产物

| 产物 | 预期 | 状态 | 详情 |
|------|------|------|------|
| `src/components/Chat.tsx` | 消息列表组件 | ✗ 桩代码 | 返回 `<div>Chat will be here</div>` |
| `src/components/ChatInput.tsx` | 消息输入 | ✓ 存在 + 实质内容 | 表单含输入框、提交按钮、处理器 |
| `src/app/api/chat/route.ts` | 消息 CRUD | ✗ 桩代码 | GET 返回 []，POST 返回 { ok: true } |
| `prisma/schema.prisma` | Message 模型 | ✓ 存在 + 实质内容 | Message 模型含 id、content、userId、createdAt |

**产物：** 2/4 已验证

### 关键链路验证

| 从 | 到 | 通过 | 状态 | 详情 |
|----|-----|------|------|------|
| Chat.tsx | /api/chat GET | fetch | ✗ 未连接 | 组件中无 fetch 调用 |
| ChatInput | /api/chat POST | onSubmit | ✗ 未连接 | 处理器仅记录日志，不发请求 |
| /api/chat GET | 数据库 | prisma.message.findMany | ✗ 未连接 | 返回硬编码的 [] |
| /api/chat POST | 数据库 | prisma.message.create | ✗ 未连接 | 返回 { ok: true }，无数据库调用 |

**连接：** 0/4 条连接已验证

## 需求覆盖

| 需求 | 状态 | 阻塞问题 |
|------|------|----------|
| CHAT-01：用户可以发送消息 | ✗ 被阻塞 | API POST 是桩代码 |
| CHAT-02：用户可以查看消息 | ✗ 被阻塞 | 组件是占位符 |
| CHAT-03：消息持久化 | ✗ 被阻塞 | 无数据库集成 |

**覆盖率：** 0/3 项需求已满足

## 发现的反模式

| 文件 | 行号 | 模式 | 严重程度 | 影响 |
|------|------|------|----------|------|
| src/components/Chat.tsx | 8 | `<div>Chat will be here</div>` | 🛑 阻塞 | 无实际内容 |
| src/app/api/chat/route.ts | 5 | `return Response.json([])` | 🛑 阻塞 | 硬编码为空 |
| src/app/api/chat/route.ts | 12 | `// TODO: save to database` | ⚠️ 警告 | 未完成 |

**反模式：** 发现 3 个（2 个阻塞，1 个警告）

## 需要人工验证

无——在自动化差距修复之前不需要。

## 差距摘要

### 关键差距（阻塞进展）

1. **聊天组件是占位符**
   - 缺失：实际的消息列表渲染
   - 影响：用户看到"Chat will be here"而非消息
   - 修复：实现 Chat.tsx 以获取并渲染消息

2. **API 路由是桩代码**
   - 缺失：GET 和 POST 中的数据库集成
   - 影响：无数据持久化，无真实功能
   - 修复：在路由处理器中接入 prisma 调用

3. **前后端之间无连接**
   - 缺失：组件中的 fetch 调用
   - 影响：即使 API 工作，UI 也不会调用它
   - 修复：在 Chat 中添加 useEffect fetch，在 ChatInput 中添加 onSubmit fetch

## 建议修复计划

### 03-04-PLAN.md：实现聊天 API

**目标：** 将 API 路由连接到数据库

**任务：**
1. 使用 prisma.message.findMany 实现 GET /api/chat
2. 使用 prisma.message.create 实现 POST /api/chat
3. 验证：API 返回真实数据，POST 创建记录

**预估范围：** 小

---

### 03-05-PLAN.md：实现聊天 UI

**目标：** 将聊天组件连接到 API

**任务：**
1. 实现 Chat.tsx，使用 useEffect fetch 和消息渲染
2. 将 ChatInput 的 onSubmit 连接到 POST /api/chat
3. 验证：消息显示，新消息在发送后出现

**预估范围：** 小

---

## 验证元数据

**验证方法：** 目标反推（从阶段目标推导）
**Must-haves 来源：** 03-01-PLAN.md frontmatter
**自动化检查：** 2 通过，8 失败
**需要人工检查：** 0（被自动化失败阻塞）
**总验证时间：** 2 分钟

---
*验证时间：2025-01-15T14:30:00Z*
*验证者：Claude（子 agent）*
```

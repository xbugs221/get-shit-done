# 总结模板

用于 `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md` 的模板 - 阶段完成文档。

---

## 文件模板

```markdown
---
phase: XX-name
plan: YY
subsystem: [主要类别：auth、payments、ui、api、database、infra、testing 等]
tags: [可搜索的技术：jwt、stripe、react、postgres、prisma]

# 依赖图
requires:
  - phase: [本阶段依赖的前置阶段]
    provides: [该阶段构建的、本阶段使用的内容]
provides:
  - [本阶段构建/交付的内容列表]
affects: [需要此上下文的阶段名称或关键词列表]

# 技术追踪
tech-stack:
  added: [本阶段添加的库/工具]
  patterns: [建立的架构/代码模式]

key-files:
  created: [创建的重要文件]
  modified: [修改的重要文件]

key-decisions:
  - "决策 1"
  - "决策 2"

patterns-established:
  - "模式 1：描述"
  - "模式 2：描述"

requirements-completed: []  # 必填 — 复制此计划 `requirements` 前置元数据字段中的所有需求 ID。

# 指标
duration: Xmin
completed: YYYY-MM-DD
---

# 阶段 [X]：[名称] 总结

**[描述成果的实质性一句话 - 不要写"阶段完成"或"实施完毕"]**

## 性能

- **持续时间：** [时间]（例如 23 分钟、1 小时 15 分钟）
- **开始时间：** [ISO 时间戳]
- **完成时间：** [ISO 时间戳]
- **任务数：** [已完成数量]
- **修改的文件数：** [数量]

## 成果
- [最重要的成果]
- [第二个关键成果]
- [第三个（如适用）]

## 任务提交

每个任务都是原子性提交的：

1. **Task 1：[任务名称]** - `abc123f`（feat/fix/test/refactor）
2. **Task 2：[任务名称]** - `def456g`（feat/fix/test/refactor）
3. **Task 3：[任务名称]** - `hij789k`（feat/fix/test/refactor）

**计划元数据：** `lmn012o`（docs: complete plan）

_注意：TDD 任务可能有多个提交（test → feat → refactor）_

## 创建/修改的文件
- `path/to/file.ts` - 它做什么
- `path/to/another.ts` - 它做什么

## 做出的决策
[关键决策及简要理由，或"无 - 按计划指定执行"]

## 与计划的偏差

[如果没有偏差："无 - 计划完全按照编写的方式执行"]

[如果发生了偏差：]

### 自动修复的问题

**1. [规则 X - 类别] 简要描述**
- **发现于：** Task [N]（[任务名称]）
- **问题：** [出了什么问题]
- **修复：** [做了什么]
- **修改的文件：** [文件路径]
- **验证：** [如何验证的]
- **提交于：** [哈希值]（作为任务提交的一部分）

[... 对每个自动修复重复 ...]

---

**总偏差数：** [N] 个自动修复（[按规则分类]）
**对计划的影响：** [简要评估 - 例如"所有自动修复对正确性/安全性都是必要的。无范围蔓延。"]

## 遇到的问题
[问题及如何解决的，或"无"]

[注意："与计划的偏差"记录通过偏差规则自动处理的计划外工作。"遇到的问题"记录计划内工作中需要解决的问题。]

## 用户配置要求

[如果生成了 USER-SETUP.md：]
**外部服务需要手动配置。** 请参阅 [{phase}-USER-SETUP.md](./{phase}-USER-SETUP.md) 了解：
- 需要添加的环境变量
- 仪表板配置步骤
- 验证命令

[如果没有 USER-SETUP.md：]
无 - 不需要外部服务配置。

## 下一阶段准备情况
[为下一阶段准备好了什么]
[任何阻碍或顾虑]

---
*阶段：XX-name*
*完成日期：[date]*
```

<frontmatter_guidance>
**用途：** 通过依赖图实现自动上下文组装。前置元数据使总结的元数据可被机器读取，这样计划阶段可以快速扫描所有总结，并根据依赖关系选择相关的总结。

**快速扫描：** 前置元数据位于前 ~25 行，可以在不读取完整内容的情况下低成本地扫描所有总结。

**依赖图：** `requires`/`provides`/`affects` 在阶段之间创建显式链接，实现传递闭包的上下文选择。

**子系统：** 主要分类（auth、payments、ui、api、database、infra、testing），用于检测相关阶段。

**标签：** 可搜索的技术关键词（库、框架、工具），用于技术栈感知。

**关键文件：** PLAN.md 中 @context 引用的重要文件。

**模式：** 未来阶段应保持的已建立约定。

**填充：** 前置元数据在 execute-plan.md 中创建总结时填充。参见 `<step name="create_summary">` 了解逐字段指导。
</frontmatter_guidance>

<one_liner_rules>
一句话描述必须是实质性的：

**好的：**
- "使用 jose 库的 JWT 认证及刷新令牌轮换"
- "包含 User、Session 和 Product 模型的 Prisma schema"
- "通过 Server-Sent Events 实现实时指标的仪表板"

**差的：**
- "阶段完成"
- "认证已实现"
- "基础完成"
- "所有任务完成"

一句话描述应该告诉人们实际发布了什么。
</one_liner_rules>

<example>
```markdown
# 阶段 1：基础 总结

**使用 jose 库的 JWT 认证及刷新令牌轮换、Prisma User 模型和受保护的 API 中间件**

## 性能

- **持续时间：** 28 分钟
- **开始时间：** 2025-01-15T14:22:10Z
- **完成时间：** 2025-01-15T14:50:33Z
- **任务数：** 5
- **修改的文件数：** 8

## 成果
- 包含邮箱/密码认证的用户模型
- 使用 httpOnly JWT cookie 的登录/登出端点
- 检查令牌有效性的受保护路由中间件
- 每次请求时的刷新令牌轮换

## 创建/修改的文件
- `prisma/schema.prisma` - User 和 Session 模型
- `src/app/api/auth/login/route.ts` - 登录端点
- `src/app/api/auth/logout/route.ts` - 登出端点
- `src/middleware.ts` - 受保护路由检查
- `src/lib/auth.ts` - 使用 jose 的 JWT 辅助函数

## 做出的决策
- 使用 jose 而非 jsonwebtoken（ESM 原生、Edge 兼容）
- 15 分钟访问令牌配合 7 天刷新令牌
- 在数据库中存储刷新令牌以支持撤销功能

## 与计划的偏差

### 自动修复的问题

**1. [规则 2 - 缺少关键项] 添加了 bcrypt 密码哈希**
- **发现于：** Task 2（登录端点实现）
- **问题：** 计划未指定密码哈希 - 存储明文密码将是严重的安全缺陷
- **修复：** 在注册时添加 bcrypt 哈希，在登录时进行比较，salt rounds 为 10
- **修改的文件：** src/app/api/auth/login/route.ts、src/lib/auth.ts
- **验证：** 密码哈希测试通过，明文密码从未存储
- **提交于：** abc123f（Task 2 提交）

**2. [规则 3 - 阻断性] 安装了缺失的 jose 依赖**
- **发现于：** Task 4（JWT 令牌生成）
- **问题：** jose 包不在 package.json 中，导入失败
- **修复：** 运行了 `npm install jose`
- **修改的文件：** package.json、package-lock.json
- **验证：** 导入成功，构建通过
- **提交于：** def456g（Task 4 提交）

---

**总偏差数：** 2 个自动修复（1 个缺少关键项、1 个阻断性）
**对计划的影响：** 两个自动修复对安全性和功能性都是必要的。无范围蔓延。

## 遇到的问题
- jsonwebtoken 的 CommonJS 导入在 Edge 运行时失败 - 切换到 jose（计划中的库变更，按预期工作）

## 下一阶段准备情况
- 认证基础已完成，可以开始功能开发
- 公开发布前需要用户注册端点

---
*阶段：01-foundation*
*完成日期：2025-01-15*
```
</example>

<guidelines>
**前置元数据：** 必填 - 完成所有字段。为未来规划启用自动上下文组装。

**一句话描述：** 必须是实质性的。"使用 jose 库的 JWT 认证及刷新令牌轮换"而不是"认证已实现"。

**决策部分：**
- 执行期间做出的关键决策及理由
- 提取到 STATE.md 的累积上下文中
- 如无偏差则使用"无 - 按计划指定执行"

**创建后：** STATE.md 会更新位置、决策、问题。
</guidelines>
</output>

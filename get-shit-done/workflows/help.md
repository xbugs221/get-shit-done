<purpose>
显示完整的 GSD 命令参考。仅输出参考内容。不要添加项目特定的分析、git 状态、后续步骤建议或参考内容之外的任何评论。
</purpose>

<reference>
# GSD 命令参考

**GSD**（Get Shit Done）创建层级化的项目计划，专为使用 Claude Code 的个人智能体开发而优化。

## 快速开始

1. `/gsd:new-project` - 初始化项目（包含研究、需求、路线图）
2. `/gsd:plan-phase 1` - 为第一个阶段创建详细计划
3. `/gsd:execute-phase 1` - 执行阶段

## 保持更新

GSD 迭代很快。定期更新：

```bash
npx get-shit-done-cc@latest
```

## 核心工作流

```
/gsd:new-project → /gsd:plan-phase → /gsd:execute-phase → 重复
```

### 项目初始化

**`/gsd:new-project`**
通过统一流程初始化新项目。

一个命令带你从想法到准备规划：
- 深度提问以理解你要构建什么
- 可选的领域研究（生成 4 个并行研究代理）
- 带 v1/v2/超范围划分的需求定义
- 带阶段分解和成功标准的路线图创建

创建所有 `.planning/` 产物：
- `PROJECT.md` — 愿景和需求
- `config.json` — 工作流模式（interactive/yolo）
- `research/` — 领域研究（如选择）
- `REQUIREMENTS.md` — 带 REQ-ID 的范围化需求
- `ROADMAP.md` — 映射到需求的阶段
- `STATE.md` — 项目记忆

用法：`/gsd:new-project`

**`/gsd:map-codebase`**
为棕地项目映射现有代码库。

- 使用并行探索代理分析代码库
- 创建 `.planning/codebase/` 包含 7 个聚焦文档
- 覆盖技术栈、架构、结构、约定、测试、集成、关注点
- 在对现有代码库运行 `/gsd:new-project` 之前使用

用法：`/gsd:map-codebase`

### 阶段规划

**`/gsd:discuss-phase <number>`**
在规划之前帮助阐述你对某个阶段的愿景。

- 捕获你想象中这个阶段如何运作
- 创建包含你的愿景、核心要素和边界的 CONTEXT.md
- 当你对某些东西应该如何呈现/感受有想法时使用
- 可选 `--batch` 一次询问 2-5 个相关问题而不是逐个询问

用法：`/gsd:discuss-phase 2`
用法：`/gsd:discuss-phase 2 --batch`
用法：`/gsd:discuss-phase 2 --batch=3`

**`/gsd:research-phase <number>`**
针对小众/复杂领域的全面生态系统研究。

- 发现标准技术栈、架构模式、陷阱
- 创建包含"专家如何构建这个"知识的 RESEARCH.md
- 用于 3D、游戏、音频、着色器、机器学习和其他专业领域
- 超越"用哪个库"到生态系统知识

用法：`/gsd:research-phase 3`

**`/gsd:list-phase-assumptions <number>`**
在 Claude 开始之前查看其计划。

- 展示 Claude 对某个阶段的预期方法
- 让你在 Claude 误解你的愿景时进行纠正
- 不创建文件 - 仅对话输出

用法：`/gsd:list-phase-assumptions 3`

**`/gsd:plan-phase <number>`**
为特定阶段创建详细执行计划。

- 生成 `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- 将阶段分解为具体、可操作的任务
- 包含验证标准和成功度量
- 支持每个阶段多个计划（XX-01、XX-02 等）

用法：`/gsd:plan-phase 1`
结果：创建 `.planning/phases/01-foundation/01-01-PLAN.md`

**PRD 快速通道：** 传递 `--prd path/to/requirements.md` 可完全跳过 discuss-phase。你的 PRD 成为 CONTEXT.md 中的锁定决策。当你已有明确的验收标准时很有用。

### 执行

**`/gsd:execute-phase <phase-number>`**
执行阶段中的所有计划，或运行特定波次。

- 按波次（来自前置元数据）分组计划，顺序执行波次
- 每个波次内的计划通过 Task 工具并行运行
- 可选 `--wave N` 标志仅执行波次 `N` 并停止，除非阶段已完全完成
- 所有计划完成后验证阶段目标
- 更新 REQUIREMENTS.md、ROADMAP.md、STATE.md

用法：`/gsd:execute-phase 5`
用法：`/gsd:execute-phase 5 --wave 2`

### 智能路由器

**`/gsd:do <description>`**
自动将自由文本路由到正确的 GSD 命令。

- 分析自然语言输入以找到最匹配的 GSD 命令
- 作为调度器 — 自身从不执行工作
- 通过让你在最佳匹配之间选择来解决歧义
- 当你知道想做什么但不知道该运行哪个 `/gsd:*` 命令时使用

用法：`/gsd:do fix the login button`
用法：`/gsd:do refactor the auth system`
用法：`/gsd:do I want to start a new milestone`

### 快速模式

**`/gsd:quick [--full] [--discuss] [--research]`**
以 GSD 保证执行小型临时任务，但跳过可选代理。

快速模式使用相同系统但路径更短：
- 生成规划器 + 执行器（默认跳过研究器、检查器、验证器）
- 快速任务存放在 `.planning/quick/` 中，与计划阶段分开
- 更新 STATE.md 跟踪（不更新 ROADMAP.md）

标志启用额外质量步骤：
- `--discuss` — 轻量级讨论以在规划前暴露灰色地带
- `--research` — 聚焦研究代理在规划前调查方案
- `--full` — 添加计划检查（最多 2 次迭代）和执行后验证

标志可组合：`--discuss --research --full` 为单个任务提供完整的质量流水线。

用法：`/gsd:quick`
用法：`/gsd:quick --research --full`
结果：创建 `.planning/quick/NNN-slug/PLAN.md`、`.planning/quick/NNN-slug/SUMMARY.md`

---

**`/gsd:fast [description]`**
内联执行琐碎任务 — 无子代理、无规划文件、无开销。

用于太小不值得规划的任务：修复错别字、更改配置、遗漏的提交、简单添加。在当前上下文中运行，做出更改，提交，并记录到 STATE.md。

- 不创建 PLAN.md 或 SUMMARY.md
- 不生成子代理（内联运行）
- 最多 3 个文件编辑 — 如果任务不够琐碎则重定向到 `/gsd:quick`
- 使用约定式消息的原子提交

用法：`/gsd:fast "fix the typo in README"`
用法：`/gsd:fast "add .env to gitignore"`

### 路线图管理

**`/gsd:add-phase <description>`**
在当前里程碑末尾添加新阶段。

- 追加到 ROADMAP.md
- 使用下一个顺序编号
- 更新阶段目录结构

用法：`/gsd:add-phase "Add admin dashboard"`

**`/gsd:insert-phase <after> <description>`**
在现有阶段之间插入小数阶段作为紧急工作。

- 创建中间阶段（例如 7 和 8 之间的 7.1）
- 用于在里程碑中期发现的必须完成的工作
- 维护阶段顺序

用法：`/gsd:insert-phase 7 "Fix critical auth bug"`
结果：创建阶段 7.1

**`/gsd:remove-phase <number>`**
移除未来阶段并重新编号后续阶段。

- 删除阶段目录和所有引用
- 重新编号所有后续阶段以填补空隙
- 仅适用于未来（未开始的）阶段
- Git 提交保留历史记录

用法：`/gsd:remove-phase 17`
结果：阶段 17 已删除，阶段 18-20 变为 17-19

### 里程碑管理

**`/gsd:new-milestone <name>`**
通过统一流程启动新里程碑。

- 深度提问以理解你接下来要构建什么
- 可选的领域研究（生成 4 个并行研究代理）
- 带范围划分的需求定义
- 带阶段分解的路线图创建
- 可选 `--reset-phase-numbers` 标志从阶段 1 重新开始编号，并先归档旧阶段目录以确保安全

为棕地项目（已有 PROJECT.md）镜像 `/gsd:new-project` 流程。

用法：`/gsd:new-milestone "v2.0 Features"`
用法：`/gsd:new-milestone --reset-phase-numbers "v2.0 Features"`

**`/gsd:complete-milestone <version>`**
归档已完成的里程碑并准备下一个版本。

- 创建包含统计信息的 MILESTONES.md 条目
- 将完整详情归档到 milestones/ 目录
- 为发布创建 git 标签
- 为下一版本准备工作区

用法：`/gsd:complete-milestone 1.0.0`

### 进度追踪

**`/gsd:progress`**
检查项目状态并智能路由到下一个操作。

- 显示可视化进度条和完成百分比
- 从 SUMMARY 文件中汇总近期工作
- 显示当前位置和下一步
- 列出关键决策和未解决问题
- 提供执行下一个计划或在缺失时创建计划
- 检测 100% 里程碑完成

用法：`/gsd:progress`

### 会话管理

**`/gsd:resume-work`**
从上一个会话恢复工作并完整恢复上下文。

- 读取 STATE.md 获取项目上下文
- 显示当前位置和近期进展
- 根据项目状态提供后续操作

用法：`/gsd:resume-work`

**`/gsd:pause-work`**
在阶段中途暂停工作时创建上下文交接。

- 创建包含当前状态的 .continue-here 文件
- 更新 STATE.md 会话连续性部分
- 捕获进行中的工作上下文

用法：`/gsd:pause-work`

### 调试

**`/gsd:debug [issue description]`**
系统性调试，跨上下文重置保持持久状态。

- 通过自适应提问收集症状
- 创建 `.planning/debug/[slug].md` 来跟踪调查
- 使用科学方法调查（证据 → 假设 → 测试）
- 在 `/clear` 后仍可继续 — 不带参数运行 `/gsd:debug` 即可恢复
- 将已解决的问题归档到 `.planning/debug/resolved/`

用法：`/gsd:debug "login button doesn't work"`
用法：`/gsd:debug`（恢复活跃会话）

### 快速笔记

**`/gsd:note <text>`**
零摩擦想法捕获 — 一个命令、即时保存、无需提问。

- 保存带时间戳的笔记到 `.planning/notes/`（或全局 `~/.claude/notes/`）
- 三个子命令：append（默认）、list、promote
- promote 将笔记转换为结构化待办事项
- 无需项目即可工作（回退到全局范围）

用法：`/gsd:note refactor the hook system`
用法：`/gsd:note list`
用法：`/gsd:note promote 3`
用法：`/gsd:note --global cross-project idea`

### 待办事项管理

**`/gsd:add-todo [description]`**
从当前对话中捕获想法或任务作为待办事项。

- 从对话中提取上下文（或使用提供的描述）
- 在 `.planning/todos/pending/` 中创建结构化待办文件
- 从文件路径推断领域以进行分组
- 创建前检查重复项
- 更新 STATE.md 待办计数

用法：`/gsd:add-todo`（从对话推断）
用法：`/gsd:add-todo Add auth token refresh`

**`/gsd:check-todos [area]`**
列出待处理的待办事项并选择一个进行处理。

- 列出所有待处理待办事项的标题、领域、年龄
- 可选领域过滤（例如 `/gsd:check-todos api`）
- 为选中的待办事项加载完整上下文
- 路由到适当的操作（立即处理、添加到阶段、头脑风暴）
- 工作开始时将待办事项移到 done/

用法：`/gsd:check-todos`
用法：`/gsd:check-todos api`

### 用户验收测试

**`/gsd:verify-work [phase]`**
通过对话式 UAT 验证已构建的功能。

- 从 SUMMARY.md 文件中提取可测试的交付物
- 逐个展示测试（yes/no 回答）
- 自动诊断失败并创建修复计划
- 如发现问题则准备好重新执行

用法：`/gsd:verify-work 3`

### 发布工作

**`/gsd:ship [phase]`**
从已完成的阶段工作创建 PR，带有自动生成的正文。

- 将分支推送到远程
- 使用 SUMMARY.md、VERIFICATION.md、REQUIREMENTS.md 的摘要创建 PR
- 可选请求代码审查
- 使用发布状态更新 STATE.md

前提条件：阶段已验证，`gh` CLI 已安装并认证。

用法：`/gsd:ship 4` 或 `/gsd:ship 4 --draft`

---

**`/gsd:review --phase N [--gemini] [--claude] [--codex] [--all]`**
跨 AI 同行评审 — 调用外部 AI CLI 独立审查阶段计划。

- 检测可用的 CLI（gemini、claude、codex）
- 每个 CLI 使用相同的结构化提示独立审查计划
- 生成包含每个审查者反馈和共识摘要的 REVIEWS.md
- 将审查反馈回馈到规划中：`/gsd:plan-phase N --reviews`

用法：`/gsd:review --phase 3 --all`

---

**`/gsd:pr-branch [target]`**
通过过滤掉 .planning/ 提交来创建干净的 PR 分支。

- 分类提交：仅代码（包含）、仅规划（排除）、混合（包含但去除 .planning/）
- 将代码提交 cherry-pick 到干净分支
- 审查者只看到代码更改，没有 GSD 产物

用法：`/gsd:pr-branch` 或 `/gsd:pr-branch main`

---

**`/gsd:plant-seed [idea]`**
捕获面向未来的想法，并设置触发条件以便自动浮现。

- 种子保留原因、何时浮现，以及相关代码的线索
- 在 `/gsd:new-milestone` 期间当触发条件匹配时自动浮现
- 比延期项更好 — 触发条件会被检查，不会被遗忘

用法：`/gsd:plant-seed "add real-time notifications when we build the events system"`

---

**`/gsd:audit-uat`**
跨阶段审计所有未完成的 UAT 和验证项。
- 扫描每个阶段中的 pending、skipped、blocked 和 human_needed 项
- 与代码库交叉引用以检测过时文档
- 按可测试性分组生成优先级排序的人工测试计划
- 在开始新里程碑之前使用以清除验证债务

用法：`/gsd:audit-uat`

### 里程碑审计

**`/gsd:audit-milestone [version]`**
根据原始意图审计里程碑完成情况。

- 读取所有阶段 VERIFICATION.md 文件
- 检查需求覆盖率
- 生成集成检查器进行跨阶段连接检查
- 创建包含差距和技术债务的 MILESTONE-AUDIT.md

用法：`/gsd:audit-milestone`

**`/gsd:plan-milestone-gaps`**
创建阶段以关闭审计发现的差距。

- 读取 MILESTONE-AUDIT.md 并将差距分组到阶段中
- 按需求优先级排序（must/should/nice）
- 将差距关闭阶段添加到 ROADMAP.md
- 准备好对新阶段运行 `/gsd:plan-phase`

用法：`/gsd:plan-milestone-gaps`

### 配置

**`/gsd:settings`**
交互式配置工作流开关和模型配置。

- 切换研究器、计划检查器、验证器代理
- 选择模型配置（quality/balanced/budget/inherit）
- 更新 `.planning/config.json`

用法：`/gsd:settings`

**`/gsd:set-profile <profile>`**
快速切换 GSD 代理的模型配置。

- `quality` — 除验证外全部使用 Opus
- `balanced` — 规划用 Opus，执行用 Sonnet（默认）
- `budget` — 编写用 Sonnet，研究/验证用 Haiku
- `inherit` — 所有代理使用当前会话模型（OpenCode `/model`）

用法：`/gsd:set-profile budget`

### 实用命令

**`/gsd:cleanup`**
归档已完成里程碑中累积的阶段目录。

- 识别 `.planning/phases/` 中仍存在的已完成里程碑阶段
- 移动前显示预运行摘要
- 将阶段目录移至 `.planning/milestones/v{X.Y}-phases/`
- 在多个里程碑后使用以减少 `.planning/phases/` 的杂乱

用法：`/gsd:cleanup`

**`/gsd:help`**
显示此命令参考。

**`/gsd:update`**
使用变更日志预览更新 GSD 到最新版本。

- 显示已安装版本与最新版本的对比
- 显示你错过的版本的变更日志条目
- 高亮破坏性变更
- 安装前确认
- 比直接运行 `npx get-shit-done-cc` 更好

用法：`/gsd:update`

**`/gsd:join-discord`**
加入 GSD Discord 社区。

- 获取帮助、分享你正在构建的内容、保持更新
- 与其他 GSD 用户建立联系

用法：`/gsd:join-discord`

## 文件与结构

```
.planning/
├── PROJECT.md            # 项目愿景
├── ROADMAP.md            # 当前阶段分解
├── STATE.md              # 项目记忆与上下文
├── RETROSPECTIVE.md      # 持续回顾（每个里程碑更新）
├── config.json           # 工作流模式与关卡
├── todos/                # 捕获的想法和任务
│   ├── pending/          # 等待处理的待办事项
│   └── done/             # 已完成的待办事项
├── debug/                # 活跃的调试会话
│   └── resolved/         # 已归档的已解决问题
├── milestones/
│   ├── v1.0-ROADMAP.md       # 已归档的路线图快照
│   ├── v1.0-REQUIREMENTS.md  # 已归档的需求
│   └── v1.0-phases/          # 已归档的阶段目录（通过 /gsd:cleanup 或 --archive-phases）
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # 代码库映射（棕地项目）
│   ├── STACK.md          # 语言、框架、依赖
│   ├── ARCHITECTURE.md   # 模式、层次、数据流
│   ├── STRUCTURE.md      # 目录布局、关键文件
│   ├── CONVENTIONS.md    # 编码标准、命名
│   ├── TESTING.md        # 测试设置、模式
│   ├── INTEGRATIONS.md   # 外部服务、API
│   └── CONCERNS.md       # 技术债务、已知问题
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## 工作流模式

在 `/gsd:new-project` 期间设置：

**交互模式**

- 确认每个重要决策
- 在检查点暂停以获得批准
- 全程提供更多指导

**YOLO 模式**

- 自动批准大部分决策
- 无需确认即执行计划
- 仅在关键检查点停止

随时通过编辑 `.planning/config.json` 更改

## 规划配置

在 `.planning/config.json` 中配置规划产物的管理方式：

**`planning.commit_docs`**（默认：`true`）
- `true`：规划产物提交到 git（标准工作流）
- `false`：规划产物仅保留在本地，不提交

当 `commit_docs: false` 时：
- 将 `.planning/` 添加到你的 `.gitignore`
- 适用于开源贡献、客户项目或保持规划私密性
- 所有规划文件仍正常工作，只是不在 git 中跟踪

**`planning.search_gitignored`**（默认：`false`）
- `true`：在广泛的 ripgrep 搜索中添加 `--no-ignore`
- 仅在 `.planning/` 被 gitignore 且你希望项目范围搜索包含它时需要

示例配置：
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## 常见工作流

**启动新项目：**

```
/gsd:new-project        # 统一流程：提问 → 研究 → 需求 → 路线图
/clear
/gsd:plan-phase 1       # 为第一个阶段创建计划
/clear
/gsd:execute-phase 1    # 执行阶段中的所有计划
```

**休息后恢复工作：**

```
/gsd:progress  # 查看上次停在哪里并继续
```

**添加里程碑中期紧急工作：**

```
/gsd:insert-phase 5 "Critical security fix"
/gsd:plan-phase 5.1
/gsd:execute-phase 5.1
```

**完成里程碑：**

```
/gsd:complete-milestone 1.0.0
/clear
/gsd:new-milestone  # 启动下一个里程碑（提问 → 研究 → 需求 → 路线图）
```

**工作期间捕获想法：**

```
/gsd:add-todo                    # 从对话上下文中捕获
/gsd:add-todo Fix modal z-index  # 使用明确描述捕获
/gsd:check-todos                 # 审查并处理待办事项
/gsd:check-todos api             # 按领域过滤
```

**调试问题：**

```
/gsd:debug "form submission fails silently"  # 启动调试会话
# ... 调查进行中，上下文填满 ...
/clear
/gsd:debug                                    # 从上次离开的地方恢复
```

## 获取帮助

- 阅读 `.planning/PROJECT.md` 了解项目愿景
- 阅读 `.planning/STATE.md` 了解当前上下文
- 查看 `.planning/ROADMAP.md` 了解阶段状态
- 运行 `/gsd:progress` 检查当前进度
</reference>
</output>

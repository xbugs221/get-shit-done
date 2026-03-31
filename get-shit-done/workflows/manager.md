<purpose>

用于从单个终端管理里程碑的交互式命令中心。显示所有阶段的仪表盘及可视化状态，在内联模式下派发 discuss，在后台代理模式下派发 plan/execute，每次操作后返回仪表盘。支持从单个终端并行处理多个阶段。

</purpose>

<required_reading>

在开始之前，阅读调用提示的 execution_context 中引用的所有文件。

</required_reading>

<process>

<step name="initialize" priority="first">

## 1. 初始化

通过 manager init 进行引导：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init manager)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

从 JSON 中解析以下字段：`milestone_version`、`milestone_name`、`phase_count`、`completed_count`、`in_progress_count`、`phases`、`recommended_actions`、`all_complete`、`waiting_signal`。

**如果出错：**显示错误信息并退出。

显示启动横幅：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MANAGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 {milestone_version} — {milestone_name}
 {phase_count} 个阶段 · {completed_count} 个已完成

 ✓ Discuss → 内联    ◆ Plan/Execute → 后台
 后台工作进行时，仪表盘自动刷新。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

进入仪表盘步骤。

</step>

<step name="dashboard">

## 2. 仪表盘（刷新点）

**每次到达此步骤时**，从磁盘重新读取状态以获取后台代理的更改：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init manager)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

解析完整 JSON。构建仪表盘显示。

根据 JSON 构建仪表盘。符号说明：`✓` 完成、`◆` 活跃、`○` 待处理、`·` 排队中。进度条：20 字符 `█░`。

**状态映射**（disk_status → D P E 状态）：

- `complete` → `✓ ✓ ✓` `✓ 已完成`
- `partial` → `✓ ✓ ◆` `◆ 执行中...`
- `planned` → `✓ ✓ ○` `○ 待执行`
- `discussed` → `✓ ○ ·` `○ 待规划`
- `researched` → `◆ · ·` `○ 待规划`
- `empty`/`no_directory` + `is_next_to_discuss` → `○ · ·` `○ 待讨论`
- `empty`/`no_directory` 其他情况 → `· · ·` `· 即将开始`
- 如果 `is_active`，用 `◆` 替换状态图标并追加 `(active)`

如果有任何 `is_active` 的阶段，在网格上方显示：`◆ 后台运行中：{action} 阶段 {N}, ...`

Phase 列使用 `display_name`（而非 `name`）——已预截断为 20 字符，超出部分用 `…` 表示。所有阶段名称填充至相同宽度以对齐。

Deps 列使用 init JSON 中的 `deps_display`——显示该阶段依赖的其他阶段（如 `1,3`），无依赖时显示 `—`。

示例输出：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 仪表盘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ████████████░░░░░░░░ 60%  (3/5 阶段)
 ◆ 后台运行中：正在规划阶段 4
 | # | 阶段                 | 依赖 | D | P | E | 状态                |
 |---|----------------------|------|---|---|---|---------------------|
 | 1 | Foundation           | —    | ✓ | ✓ | ✓ | ✓ 已完成            |
 | 2 | API Layer            | 1    | ✓ | ✓ | ◆ | ◆ 执行中 (active)   |
 | 3 | Auth System          | 1    | ✓ | ✓ | ○ | ○ 待执行            |
 | 4 | Dashboard UI & Set…  | 1,2  | ✓ | ◆ | · | ◆ 规划中 (active)   |
 | 5 | Notifications        | —    | ○ | · | · | ○ 待讨论            |
 | 6 | Polish & Final Mail… | 1-5  | · | · | · | · 即将开始          |
```

**推荐操作区域：**

如果 `all_complete` 为 true：

```
╔══════════════════════════════════════════════════════════════╗
║  里程碑已完成                                                  ║
╚══════════════════════════════════════════════════════════════╝

所有 {phase_count} 个阶段已完成。可进行最终步骤：
  → /gsd:verify-work — 运行验收测试
  → /gsd:complete-milestone — 归档并收尾
```

通过 AskUserQuestion 询问用户：
- **question：**"所有阶段已完成。接下来做什么？"
- **options：**"验证工作" / "完成里程碑" / "退出管理器"

处理响应：
- "验证工作"：`Skill(skill="gsd:verify-work")` 然后回到仪表盘。
- "完成里程碑"：`Skill(skill="gsd:complete-milestone")` 然后退出。
- "退出管理器"：进入退出步骤。

**如果未全部完成**，从 `recommended_actions` 构建复合选项：

**复合选项逻辑：**将后台操作（plan/execute）组合在一起，并在存在内联操作（discuss）时将其配对。目标是呈现尽可能少的选项——一个选项可以同时派发多个后台代理和一个内联操作。

**构建选项：**

1. 收集所有后台操作（execute 和 plan 推荐）——每种可能有多个。
2. 收集内联操作（discuss 推荐，如果有——最多一个，因为 discuss 是顺序执行的）。
3. 构建复合选项：

   **如果有任何推荐操作（后台、内联或两者）：**
   创建一个主要的"继续"选项，一次性派发所有操作：
   - 标签：`"继续"` — 始终使用这个确切词语
   - 在标签下方列出每个将要执行的操作。枚举所有推荐操作——不要截断或限制数量：
     ```
     继续：
       → 执行阶段 32（后台）
       → 规划阶段 34（后台）
       → 讨论阶段 35（内联）
     ```
   - 这将先派发所有后台代理，然后运行内联的 discuss（如果有）。
   - 如果没有内联的 discuss，在启动后台代理后刷新仪表盘。

   **重要：**"继续"选项必须包含 `recommended_actions` 中的每一个操作——不仅仅是 2 个。如果有 3 个操作，就列出 3 个。如果有 5 个，就列出 5 个。

4. 始终添加：
   - `"刷新仪表盘"`
   - `"退出管理器"`

紧凑显示推荐操作：

```
───────────────────────────────────────────────────────────────
▶ 下一步
───────────────────────────────────────────────────────────────

继续：
  → 执行阶段 32（后台）
  → 规划阶段 34（后台）
  → 讨论阶段 35（内联）
```

**自动刷新：**如果后台代理正在运行（任何阶段的 `is_active` 为 true），设置 60 秒自动刷新周期。在呈现操作菜单后，如果 60 秒内未收到用户输入，自动刷新仪表盘。此间隔可通过 GSD 配置中的 `manager_refresh_interval` 设置（默认：60 秒，设为 0 禁用）。

通过 AskUserQuestion 呈现：
- **question：**"你想做什么？"
- **options：**（如上构建的复合选项 + 刷新 + 退出，AskUserQuestion 自动添加"其他"）

**选择"其他"（自由文本）时：**解析意图——如果提到了阶段编号和操作，则相应派发。如果不清楚，显示可用操作并回到 action_menu。

进入 handle_action 步骤处理选定的操作。

</step>

<step name="handle_action">

## 4. 处理操作

### 刷新仪表盘

回到仪表盘步骤。

### 退出管理器

进入退出步骤。

### 复合操作（后台 + 内联）

当用户选择复合选项时：

1. **先启动所有后台代理**（plan/execute）——使用下面的"规划阶段 N"/"执行阶段 N"处理器并行派发。
2. **然后运行内联的 discuss：**

```
Skill(skill="gsd:discuss-phase", args="{PHASE_NUM}")
```

discuss 完成后，回到仪表盘步骤（后台代理继续运行）。

### 讨论阶段 N

讨论是交互式的——需要用户输入。在内联模式下运行：

```
Skill(skill="gsd:discuss-phase", args="{PHASE_NUM}")
```

discuss 完成后，回到仪表盘步骤。

### 规划阶段 N

规划自主运行。启动后台代理：

```
Task(
  description="规划阶段 {N}：{phase_name}",
  run_in_background=true,
  prompt="你正在为项目的阶段 {N} 运行 GSD plan-phase 工作流。

工作目录：{cwd}
阶段：{N} — {phase_name}
目标：{goal}

步骤：
1. 阅读 plan-phase 工作流：cat ~/.claude/get-shit-done/workflows/plan-phase.md
2. 运行：node \"$HOME/.claude/get-shit-done/bin/gsd-tools.cjs\" init plan-phase {N}
3. 按照工作流步骤为此阶段生成 PLAN.md 文件。
4. 如果配置中启用了研究，先运行研究步骤。
5. 通过 Task() 启动 gsd-planner 子代理来创建计划。
6. 如果启用了 plan-checker，启动 gsd-plan-checker 子代理进行验证。
7. 完成后提交计划文件。

重要：你正在后台运行。不要使用 AskUserQuestion——根据项目上下文做出自主决策。如果遇到阻塞，将其写入 STATE.md 作为 blocker 并停止。不要悄悄绕过权限或文件访问错误——让它们失败，以便管理器能呈现并提供解决提示。"
)
```

显示：

```
◆ 正在为阶段 {N} 启动规划器：{phase_name}...
```

回到仪表盘步骤。

### 执行阶段 N

执行自主运行。启动后台代理：

```
Task(
  description="执行阶段 {N}：{phase_name}",
  run_in_background=true,
  prompt="你正在为项目的阶段 {N} 运行 GSD execute-phase 工作流。

工作目录：{cwd}
阶段：{N} — {phase_name}
目标：{goal}

步骤：
1. 阅读 execute-phase 工作流：cat ~/.claude/get-shit-done/workflows/execute-phase.md
2. 运行：node \"$HOME/.claude/get-shit-done/bin/gsd-tools.cjs\" init execute-phase {N}
3. 按照工作流步骤：发现计划、分析依赖、分组为执行波次。
4. 对每个波次，通过 Task() 启动 gsd-executor 子代理并行执行计划。
5. 所有波次完成后，如果启用了 verifier，启动 gsd-verifier 子代理。
6. 更新 ROADMAP.md 和 STATE.md 的进度。
7. 提交所有更改。

重要：你正在后台运行。不要使用 AskUserQuestion——做出自主决策。git 提交时使用 --no-verify。如果遇到权限错误、文件锁或任何访问问题，不要绕过——让它失败并将错误写入 STATE.md 作为 blocker，以便管理器能呈现并提供解决指导。"
)
```

显示：

```
◆ 正在为阶段 {N} 启动执行器：{phase_name}...
```

回到仪表盘步骤。

</step>

<step name="background_completion">

## 5. 后台代理完成

当收到后台代理完成的通知时：

1. 读取代理返回的结果消息。
2. 显示简短通知：

```
✓ {description}
  {代理结果的简要摘要}
```

3. 回到仪表盘步骤。

**如果代理报告了错误或阻塞：**

分类错误：

**权限/工具访问错误**（如工具不允许、权限被拒绝、沙箱限制）：
- 解析错误以识别被阻止的工具或命令。
- 清晰显示错误，然后提供修复选项：
  - **question：**"阶段 {N} 失败——`{tool_or_command}` 的权限被拒绝。要我将其添加到 settings.local.json 以允许访问吗？"
  - **options：**"添加权限并重试" / "改为内联运行此阶段" / "跳过并继续"
  - "添加权限并重试"：使用 `Skill(skill="update-config")` 将权限添加到 `settings.local.json`，然后重新启动后台代理。回到仪表盘。
  - "改为内联运行此阶段"：通过 `Skill()` 以内联方式（而非后台 Task）派发相同操作（plan/execute）。完成后回到仪表盘。
  - "跳过并继续"：回到仪表盘（阶段保持当前状态）。

**其他错误**（git 锁、文件冲突、逻辑错误等）：
- 显示错误，然后通过 AskUserQuestion 提供选项：
  - **question：**"阶段 {N} 的后台代理遇到问题：{error}。接下来怎么做？"
  - **options：**"重试" / "改为内联运行" / "跳过并继续" / "查看详情"
  - "重试"：重新启动相同的后台代理。回到仪表盘。
  - "改为内联运行"：通过 `Skill()` 内联派发操作。完成后回到仪表盘。
  - "跳过并继续"：回到仪表盘（阶段保持当前状态）。
  - "查看详情"：读取 STATE.md 的阻塞部分，显示后重新呈现选项。

</step>

<step name="exit">

## 6. 退出

显示最终状态和进度条：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► 会话结束
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 {milestone_version} — {milestone_name}
 {PROGRESS_BAR} {progress_pct}%  ({completed_count}/{phase_count} 阶段)

 随时恢复：/gsd:manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**注意：**仍在运行的后台代理将继续执行直到完成。其结果将在下次调用 `/gsd:manager` 或 `/gsd:progress` 时可见。

</step>

</process>

<success_criteria>
- [ ] 仪表盘显示所有阶段及正确的状态指示器（D/P/E/V 列）
- [ ] 进度条显示准确的完成百分比
- [ ] 依赖解析：被阻塞的阶段显示缺少哪些依赖
- [ ] 推荐优先级：execute > plan > discuss
- [ ] Discuss 阶段通过 Skill() 内联运行——交互式问题正常工作
- [ ] Plan 阶段启动后台 Task 代理——立即返回仪表盘
- [ ] Execute 阶段启动后台 Task 代理——立即返回仪表盘
- [ ] 仪表盘刷新通过磁盘状态获取后台代理的更改
- [ ] 后台代理完成时触发通知和仪表盘刷新
- [ ] 后台代理错误提供重试/跳过选项
- [ ] 全部完成状态提供 verify-work 和 complete-milestone
- [ ] 退出显示最终状态和恢复说明
- [ ] "其他"自由文本输入被解析为阶段编号和操作
- [ ] 管理器循环持续运行直到用户退出或里程碑完成
</success_criteria>
</output>

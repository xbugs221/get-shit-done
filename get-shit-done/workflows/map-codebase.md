<purpose>
编排并行的代码库映射代理以分析代码库，并在 .planning/codebase/ 中生成结构化文档。

每个代理拥有全新的上下文，探索特定的关注领域，并**直接编写文档**。编排器仅接收确认 + 行数，然后编写摘要。

输出：.planning/codebase/ 文件夹，包含 7 个关于代码库状态的结构化文档。
</purpose>

<available_agent_types>
有效的 GSD 子代理类型（使用确切名称——不要回退到 'general-purpose'）：
- gsd-codebase-mapper — 映射项目结构和依赖关系
</available_agent_types>

<philosophy>
**为什么需要专用映射代理：**
- 每个领域拥有全新上下文（无 token 污染）
- 代理直接编写文档（无需将上下文传回编排器）
- 编排器仅总结已创建的内容（最小上下文使用量）
- 更快的执行速度（代理同时运行）

**文档质量重于长度：**
包含足够的细节使其作为参考有用。优先提供实际示例（尤其是代码模式）而非任意的简洁。

**始终包含文件路径：**
文档是 Claude 在规划/执行时的参考材料。始终包含用反引号格式化的实际文件路径：`src/services/user.ts`。
</philosophy>

<process>

<step name="init_context" priority="first">
加载代码库映射上下文：

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init map-codebase)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_MAPPER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-codebase-mapper 2>/dev/null)
```

从初始化 JSON 中提取：`mapper_model`、`commit_docs`、`codebase_dir`、`existing_maps`、`has_maps`、`codebase_dir_exists`。
</step>

<step name="check_existing">
使用初始化上下文中的 `has_maps` 检查 .planning/codebase/ 是否已存在。

如果 `codebase_dir_exists` 为 true：
```bash
ls -la .planning/codebase/
```

**如果存在：**

```
.planning/codebase/ 已存在，包含以下文档：
[列出找到的文件]

接下来做什么？
1. 刷新 - 删除现有内容并重新映射代码库
2. 更新 - 保留现有内容，仅更新特定文档
3. 跳过 - 使用现有代码库映射
```

等待用户回复。

如果选择"刷新"：删除 .planning/codebase/，继续到 create_structure
如果选择"更新"：询问要更新哪些文档，继续到 spawn_agents（已过滤）
如果选择"跳过"：退出工作流

**如果不存在：**
继续到 create_structure。
</step>

<step name="create_structure">
创建 .planning/codebase/ 目录：

```bash
mkdir -p .planning/codebase
```

**预期输出文件：**
- STACK.md（来自技术映射器）
- INTEGRATIONS.md（来自技术映射器）
- ARCHITECTURE.md（来自架构映射器）
- STRUCTURE.md（来自架构映射器）
- CONVENTIONS.md（来自质量映射器）
- TESTING.md（来自质量映射器）
- CONCERNS.md（来自关注点映射器）

继续到 spawn_agents。
</step>

<step name="detect_runtime_capabilities">
在生成代理之前，检测当前运行时是否支持用于子代理委托的 `Task` 工具。

**如何检测：** 检查你是否有权访问 `Task` 工具（根据运行时可能大写为 `Task` 或小写为 `task`）。如果你没有 `Task`/`task` 工具（或仅有 `browser_subagent` 等工具——那是用于网页浏览的，不是代码分析）：

→ **跳过 `spawn_agents` 和 `collect_confirmations`** —— 改为直接进入 `sequential_mapping`。

**关键：** 绝不要将 `browser_subagent` 或 `Explore` 作为 `Task` 的替代品。`browser_subagent` 工具专用于网页交互，用于代码库分析会失败。如果 `Task` 不可用，在当前上下文中顺序执行映射。
</step>

<step name="spawn_agents" condition="Task 工具可用">
生成 4 个并行的 gsd-codebase-mapper 代理。

使用 Task 工具，设置 `subagent_type="gsd-codebase-mapper"`、`model="{mapper_model}"` 和 `run_in_background=true` 以并行执行。

**关键：** 使用专用的 `gsd-codebase-mapper` 代理，不要使用 `Explore` 或 `browser_subagent`。映射代理直接编写文档。

**代理 1：技术焦点**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="映射代码库技术栈",
  prompt="Focus: tech

分析此代码库的技术栈和外部集成。

将以下文档写入 .planning/codebase/：
- STACK.md - 语言、运行时、框架、依赖、配置
- INTEGRATIONS.md - 外部 API、数据库、认证提供者、Webhook

深入探索。使用模板直接编写文档。仅返回确认。
${AGENT_SKILLS_MAPPER}"
)
```

**代理 2：架构焦点**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="映射代码库架构",
  prompt="Focus: arch

分析此代码库的架构和目录结构。

将以下文档写入 .planning/codebase/：
- ARCHITECTURE.md - 模式、层次、数据流、抽象、入口点
- STRUCTURE.md - 目录布局、关键位置、命名约定

深入探索。使用模板直接编写文档。仅返回确认。
${AGENT_SKILLS_MAPPER}"
)
```

**代理 3：质量焦点**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="映射代码库约定",
  prompt="Focus: quality

分析此代码库的编码约定和测试模式。

将以下文档写入 .planning/codebase/：
- CONVENTIONS.md - 代码风格、命名、模式、错误处理
- TESTING.md - 框架、结构、Mock、覆盖率

深入探索。使用模板直接编写文档。仅返回确认。
${AGENT_SKILLS_MAPPER}"
)
```

**代理 4：关注点焦点**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="映射代码库关注点",
  prompt="Focus: concerns

分析此代码库的技术债务、已知问题和关注领域。

将以下文档写入 .planning/codebase/：
- CONCERNS.md - 技术债务、缺陷、安全、性能、脆弱区域

深入探索。使用模板直接编写文档。仅返回确认。
${AGENT_SKILLS_MAPPER}"
)
```

继续到 collect_confirmations。
</step>

<step name="collect_confirmations">
等待所有 4 个代理使用 TaskOutput 工具完成。

**对于上面 Agent 工具调用返回的每个 task_id：**
```
TaskOutput tool:
  task_id: "{Agent 结果中的 task_id}"
  block: true
  timeout: 300000
```

对所有 4 个代理并行调用 TaskOutput（在一条消息中发出 4 个 TaskOutput 调用）。

所有 TaskOutput 调用返回后，读取每个代理的输出文件以收集确认。

**每个代理的预期确认格式：**
```
## 映射完成

**焦点：** {focus}
**已编写文档：**
- `.planning/codebase/{DOC1}.md`（{N} 行）
- `.planning/codebase/{DOC2}.md`（{N} 行）

准备好供编排器总结。
```

**你收到的内容：** 仅文件路径和行数。不是文档内容。

如果有代理失败，记录失败并继续处理成功的文档。

继续到 verify_output。
</step>

<step name="sequential_mapping" condition="Task 工具不可用（例如 Antigravity、Gemini CLI、Codex）">
当 `Task` 工具不可用时，在当前上下文中顺序执行代码库映射。这替代了 `spawn_agents` 和 `collect_confirmations`。

**重要：** 不要使用 `browser_subagent`、`Explore` 或任何基于浏览器的工具。仅使用文件系统工具（Read、Bash、Write、Grep、Glob、list_dir、view_file、grep_search 或运行时中可用的等效工具）。

顺序执行所有 4 个映射遍历：

**遍历 1：技术焦点**
- 探索 package.json/Cargo.toml/go.mod/requirements.txt、配置文件、依赖树
- 编写 `.planning/codebase/STACK.md` — 语言、运行时、框架、依赖、配置
- 编写 `.planning/codebase/INTEGRATIONS.md` — 外部 API、数据库、认证提供者、Webhook

**遍历 2：架构焦点**
- 探索目录结构、入口点、模块边界、数据流
- 编写 `.planning/codebase/ARCHITECTURE.md` — 模式、层次、数据流、抽象、入口点
- 编写 `.planning/codebase/STRUCTURE.md` — 目录布局、关键位置、命名约定

**遍历 3：质量焦点**
- 探索代码风格、错误处理模式、测试文件、CI 配置
- 编写 `.planning/codebase/CONVENTIONS.md` — 代码风格、命名、模式、错误处理
- 编写 `.planning/codebase/TESTING.md` — 框架、结构、Mock、覆盖率

**遍历 4：关注点焦点**
- 探索 TODO、已知问题、脆弱区域、安全模式
- 编写 `.planning/codebase/CONCERNS.md` — 技术债务、缺陷、安全、性能、脆弱区域

使用与 `gsd-codebase-mapper` 代理相同的文档模板。包含用反引号格式化的实际文件路径。

继续到 verify_output。
</step>

<step name="verify_output">
验证所有文档是否成功创建：

```bash
ls -la .planning/codebase/
wc -l .planning/codebase/*.md
```

**验证清单：**
- 所有 7 个文档存在
- 没有空文档（每个应有 >20 行）

如果有文档缺失或为空，记录哪些代理可能失败了。

继续到 scan_for_secrets。
</step>

<step name="scan_for_secrets">
**关键安全检查：** 在提交之前扫描输出文件中意外泄露的密钥。

运行密钥模式检测：

```bash
# 检查生成的文档中是否有常见 API 密钥模式
grep -E '(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]+|AKIA[A-Z0-9]{16}|xox[baprs]-[a-zA-Z0-9-]+|-----BEGIN.*PRIVATE KEY|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.)' .planning/codebase/*.md 2>/dev/null && SECRETS_FOUND=true || SECRETS_FOUND=false
```

**如果 SECRETS_FOUND=true：**

```
⚠️ 安全警报：在代码库文档中检测到潜在密钥！

在以下文件中发现类似 API 密钥或令牌的模式：
[显示 grep 输出]

如果提交，这将暴露凭据。

**需要采取的措施：**
1. 审查上面标记的内容
2. 如果这些是真实密钥，必须在提交前删除
3. 考虑将敏感文件添加到 Claude Code 的"拒绝"权限中

提交前暂停。如果标记的内容实际上不敏感，请回复"可以继续"，否则请先编辑文件。
```

等待用户确认后再继续到 commit_codebase_map。

**如果 SECRETS_FOUND=false：**

继续到 commit_codebase_map。
</step>

<step name="commit_codebase_map">
提交代码库映射：

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: map existing codebase" --files .planning/codebase/*.md
```

继续到 offer_next。
</step>

<step name="offer_next">
展示完成摘要和下一步。

**获取行数：**
```bash
wc -l .planning/codebase/*.md
```

**输出格式：**

```
代码库映射完成。

已创建 .planning/codebase/：
- STACK.md（[N] 行）- 技术和依赖
- ARCHITECTURE.md（[N] 行）- 系统设计和模式
- STRUCTURE.md（[N] 行）- 目录布局和组织
- CONVENTIONS.md（[N] 行）- 代码风格和模式
- TESTING.md（[N] 行）- 测试结构和实践
- INTEGRATIONS.md（[N] 行）- 外部服务和 API
- CONCERNS.md（[N] 行）- 技术债务和问题


---

## ▶ 接下来

**初始化项目** — 使用代码库上下文进行规划

`/gsd:new-project`

<sub>先执行 `/clear` → 刷新上下文窗口</sub>

---

**其他可用操作：**
- 重新运行映射：`/gsd:map-codebase`
- 查看特定文件：`cat .planning/codebase/STACK.md`
- 在继续之前编辑任何文档

---
```

结束工作流。
</step>

</process>

<success_criteria>
- 已创建 .planning/codebase/ 目录
- 如果 Task 工具可用：生成了 4 个带 run_in_background=true 的并行 gsd-codebase-mapper 代理
- 如果 Task 工具不可用：内联执行了 4 个顺序映射遍历（绝不使用 browser_subagent）
- 所有 7 个代码库文档存在
- 没有空文档（每个应有 >20 行）
- 清晰的完成摘要，包含行数
- 以 GSD 风格向用户展示清晰的下一步
</success_criteria>
</output>

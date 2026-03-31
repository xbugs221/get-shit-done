# CLAUDE.md 模板

用于项目根目录 `CLAUDE.md` 的模板 — 由 `gsd-tools generate-claude-md` 自动生成。

包含 6 个标记界定的部分。每个部分可独立更新。
`generate-claude-md` 子命令管理 5 个部分（项目、技术栈、约定、架构、工作流强制执行）。
配置文件部分由 `generate-claude-profile` 独占管理。

---

## 部分模板

### 项目部分
```
<!-- GSD:project-start source:PROJECT.md -->
## Project

{{project_content}}
<!-- GSD:project-end -->
```

**回退文本：**
```
Project not yet initialized. Run /gsd:new-project to set up.
```

### 技术栈部分
```
<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

{{stack_content}}
<!-- GSD:stack-end -->
```

**回退文本：**
```
Technology stack not yet documented. Will populate after codebase mapping or first phase.
```

### 约定部分
```
<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

{{conventions_content}}
<!-- GSD:conventions-end -->
```

**回退文本：**
```
Conventions not yet established. Will populate as patterns emerge during development.
```

### 架构部分
```
<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

{{architecture_content}}
<!-- GSD:architecture-end -->
```

**回退文本：**
```
Architecture not yet mapped. Follow existing patterns found in the codebase.
```

### 工作流强制执行部分
```
<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

在使用 Edit、Write 或其他文件修改工具之前，请通过 GSD 命令启动工作，以确保规划产物和执行上下文保持同步。

使用以下入口：
- `/gsd:quick` 用于小修复、文档更新和临时任务
- `/gsd:debug` 用于调查和 bug 修复
- `/gsd:execute-phase` 用于已规划的阶段工作

不要在 GSD 工作流之外直接编辑仓库，除非用户明确要求绕过。
<!-- GSD:workflow-end -->
```

### 配置文件部分（仅占位符）
```
<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
```

**注意：** 此部分不由 `generate-claude-md` 管理。它由 `generate-claude-profile` 独占管理。
上面的占位符仅在创建新的 CLAUDE.md 文件且尚无配置文件部分时使用。

---

## 部分排序

1. **项目** — 身份和用途（这个项目是什么）
2. **技术栈** — 技术选型（使用了什么工具）
3. **约定** — 代码模式和规则（代码如何编写）
4. **架构** — 系统结构（组件如何组合在一起）
5. **工作流强制执行** — 文件修改工作的默认 GSD 入口
6. **配置文件** — 开发者行为偏好（如何交互）

## 标记格式

- 开始：`<!-- GSD:{name}-start source:{file} -->`
- 结束：`<!-- GSD:{name}-end -->`
- source 属性使得源文件变更时可以进行有针对性的更新
- 使用部分匹配开始标记（不含关闭的 `-->`）进行检测

## 回退行为

当源文件缺失时，回退文本提供 Claude 可操作的指导：
- 在缺少数据时引导 Claude 的行为
- 不是占位广告或"缺失"提示
- 每个回退告诉 Claude 该做什么，而不仅仅是缺少什么

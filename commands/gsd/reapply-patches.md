---
description: 在 GSD 更新后重新应用本地修改
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

<purpose>
GSD 更新重新安装文件后，将用户之前保存的本地修改智能合并回新版本，处理上游文件同时变更的情况。
</purpose>

<process>

## 步骤 1：检测已备份的补丁

检查本地补丁目录：

```bash
# 全局安装 — 检测运行时配置目录
if [ -d "$HOME/.config/opencode/gsd-local-patches" ]; then
  PATCHES_DIR="$HOME/.config/opencode/gsd-local-patches"
elif [ -d "$HOME/.opencode/gsd-local-patches" ]; then
  PATCHES_DIR="$HOME/.opencode/gsd-local-patches"
elif [ -d "$HOME/.gemini/gsd-local-patches" ]; then
  PATCHES_DIR="$HOME/.gemini/gsd-local-patches"
else
  PATCHES_DIR="$HOME/.claude/gsd-local-patches"
fi
# 本地安装回退 — 检查所有运行时目录
if [ ! -d "$PATCHES_DIR" ]; then
  for dir in .config/opencode .opencode .gemini .claude; do
    if [ -d "./$dir/gsd-local-patches" ]; then
      PATCHES_DIR="./$dir/gsd-local-patches"
      break
    fi
  done
fi
```

从补丁目录读取 `backup-meta.json`。

**未找到补丁时：** 提示"未找到本地补丁，无需重新应用"并退出。

## 步骤 2：显示补丁摘要

```
## 待重新应用的本地补丁

**备份自：** v{from_version}
**当前版本：** {读取 VERSION 文件}
**已修改文件：** {数量}

| # | 文件 | 状态 |
|---|------|------|
| 1 | {file_path} | 待处理 |
```

## 步骤 3：合并每个文件

对于 `backup-meta.json` 中的每个文件：

1. **读取备份版本**（用户修改副本）和**新安装版本**
2. **比较并合并：**
   - 文件相同：跳过（修改已被上游纳入）
   - 文件不同：识别用户修改并应用到新版本
   - **合并策略：** 完整读取两个版本，识别用户添加/修改的部分，应用到新版本。若用户修改部分同时被上游更改，标记冲突并询问用户
3. **报告状态：** `已合并` / `已跳过` / `有冲突`

## 步骤 4：更新清单

重新应用后记录哪些文件被修改，清单将在下次 /gsd:update 时重新生成。

## 步骤 5：清理选项

询问用户：保留还是清理补丁备份目录。

## 步骤 6：报告

```
## 补丁已重新应用

| # | 文件 | 状态 |
|---|------|------|
| 1 | {file_path} | ✓ 已合并 |
| 2 | {file_path} | ○ 已跳过（已在上游中） |
| 3 | {file_path} | ⚠ 冲突已解决 |

{数量} 个文件已更新。您的本地修改已重新生效。
```

</process>

<success_criteria>
- [ ] 所有备份补丁已处理
- [ ] 用户修改已合并到新版本
- [ ] 冲突已通过用户输入解决
- [ ] 已报告每个文件的状态
</success_criteria>

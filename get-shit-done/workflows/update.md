<purpose>
通过 npm 检查 GSD 更新，显示已安装版本与最新版本之间的更新日志，获取用户确认，然后执行清除缓存的全新安装。
</purpose>

<required_reading>
在开始之前，阅读调用提示的 execution_context 中引用的所有文件。
</required_reading>

<process>

<step name="get_installed_version">
通过检查本地和全局两个位置并验证安装完整性，检测 GSD 是本地安装还是全局安装。

首先，从调用提示的 `execution_context` 路径推导 `PREFERRED_RUNTIME`：
- 路径包含 `/.codex/` -> `codex`
- 路径包含 `/.gemini/` -> `gemini`
- 路径包含 `/.config/opencode/` 或 `/.opencode/` -> `opencode`
- 否则 -> `claude`

使用 `PREFERRED_RUNTIME` 作为首先检查的运行时，以便 `/gsd:update` 定位到调用它的运行时。

```bash
# 运行时候选列表："<runtime>:<config-dir>" 存储为数组。
# 使用数组而非空格分隔的字符串确保在 bash 和 zsh 中正确
# 迭代（zsh 默认不会对未加引号的变量进行词分割）。修复 #1173。
RUNTIME_DIRS=( "claude:.claude" "opencode:.config/opencode" "opencode:.opencode" "gemini:.gemini" "codex:.codex" )

# PREFERRED_RUNTIME 应在运行此代码块之前从 execution_context 设置。
# 如果未设置，从运行时环境变量推断；回退到 claude。
if [ -z "$PREFERRED_RUNTIME" ]; then
  if [ -n "$CODEX_HOME" ]; then
    PREFERRED_RUNTIME="codex"
  elif [ -n "$GEMINI_CONFIG_DIR" ]; then
    PREFERRED_RUNTIME="gemini"
  elif [ -n "$OPENCODE_CONFIG_DIR" ] || [ -n "$OPENCODE_CONFIG" ]; then
    PREFERRED_RUNTIME="opencode"
  elif [ -n "$CLAUDE_CONFIG_DIR" ]; then
    PREFERRED_RUNTIME="claude"
  else
    PREFERRED_RUNTIME="claude"
  fi
fi

# 重新排序条目，使首选运行时优先检查。
ORDERED_RUNTIME_DIRS=()
for entry in "${RUNTIME_DIRS[@]}"; do
  runtime="${entry%%:*}"
  if [ "$runtime" = "$PREFERRED_RUNTIME" ]; then
    ORDERED_RUNTIME_DIRS+=( "$entry" )
  fi
done
for entry in "${RUNTIME_DIRS[@]}"; do
  runtime="${entry%%:*}"
  if [ "$runtime" != "$PREFERRED_RUNTIME" ]; then
    ORDERED_RUNTIME_DIRS+=( "$entry" )
  fi
done

# 先检查本地（仅当有效且与全局不同时优先）
LOCAL_VERSION_FILE="" LOCAL_MARKER_FILE="" LOCAL_DIR="" LOCAL_RUNTIME=""
for entry in "${ORDERED_RUNTIME_DIRS[@]}"; do
  runtime="${entry%%:*}"
  dir="${entry#*:}"
  if [ -f "./$dir/get-shit-done/VERSION" ] || [ -f "./$dir/get-shit-done/workflows/update.md" ]; then
    LOCAL_RUNTIME="$runtime"
    LOCAL_VERSION_FILE="./$dir/get-shit-done/VERSION"
    LOCAL_MARKER_FILE="./$dir/get-shit-done/workflows/update.md"
    LOCAL_DIR="$(cd "./$dir" 2>/dev/null && pwd)"
    break
  fi
done

GLOBAL_VERSION_FILE="" GLOBAL_MARKER_FILE="" GLOBAL_DIR="" GLOBAL_RUNTIME=""
for entry in "${ORDERED_RUNTIME_DIRS[@]}"; do
  runtime="${entry%%:*}"
  dir="${entry#*:}"
  if [ -f "$HOME/$dir/get-shit-done/VERSION" ] || [ -f "$HOME/$dir/get-shit-done/workflows/update.md" ]; then
    GLOBAL_RUNTIME="$runtime"
    GLOBAL_VERSION_FILE="$HOME/$dir/get-shit-done/VERSION"
    GLOBAL_MARKER_FILE="$HOME/$dir/get-shit-done/workflows/update.md"
    GLOBAL_DIR="$(cd "$HOME/$dir" 2>/dev/null && pwd)"
    break
  fi
done

# 仅当解析后的路径不同时才视为本地（防止 CWD=$HOME 时的误判）
IS_LOCAL=false
if [ -n "$LOCAL_VERSION_FILE" ] && [ -f "$LOCAL_VERSION_FILE" ] && [ -f "$LOCAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$LOCAL_VERSION_FILE"; then
  if [ -z "$GLOBAL_DIR" ] || [ "$LOCAL_DIR" != "$GLOBAL_DIR" ]; then
    IS_LOCAL=true
  fi
fi

if [ "$IS_LOCAL" = true ]; then
  INSTALLED_VERSION="$(cat "$LOCAL_VERSION_FILE")"
  INSTALL_SCOPE="LOCAL"
  TARGET_RUNTIME="$LOCAL_RUNTIME"
elif [ -n "$GLOBAL_VERSION_FILE" ] && [ -f "$GLOBAL_VERSION_FILE" ] && [ -f "$GLOBAL_MARKER_FILE" ] && grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' "$GLOBAL_VERSION_FILE"; then
  INSTALLED_VERSION="$(cat "$GLOBAL_VERSION_FILE")"
  INSTALL_SCOPE="GLOBAL"
  TARGET_RUNTIME="$GLOBAL_RUNTIME"
elif [ -n "$LOCAL_RUNTIME" ] && [ -f "$LOCAL_MARKER_FILE" ]; then
  # 检测到运行时但 VERSION 缺失/损坏：视为未知版本，保留运行时目标
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="LOCAL"
  TARGET_RUNTIME="$LOCAL_RUNTIME"
elif [ -n "$GLOBAL_RUNTIME" ] && [ -f "$GLOBAL_MARKER_FILE" ]; then
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="GLOBAL"
  TARGET_RUNTIME="$GLOBAL_RUNTIME"
else
  INSTALLED_VERSION="0.0.0"
  INSTALL_SCOPE="UNKNOWN"
  TARGET_RUNTIME="claude"
fi

echo "$INSTALLED_VERSION"
echo "$INSTALL_SCOPE"
echo "$TARGET_RUNTIME"
```

解析输出：
- 第 1 行 = 已安装版本（`0.0.0` 表示未知版本）
- 第 2 行 = 安装范围（`LOCAL`、`GLOBAL` 或 `UNKNOWN`）
- 第 3 行 = 目标运行时（`claude`、`opencode`、`gemini` 或 `codex`）
- 如果范围为 `UNKNOWN`，使用 `--claude --global` 回退方案进入安装步骤。

如果检测到多个运行时安装且无法从 execution_context 确定调用运行时，在执行安装前询问用户要更新哪个运行时。

**如果 VERSION 文件缺失：**
```
## GSD 更新

**已安装版本：**未知

你的安装不包含版本跟踪。

正在执行全新安装...
```

进入安装步骤（比较时视为版本 0.0.0）。
</step>

<step name="check_latest_version">
通过 npm 检查最新版本：

```bash
npm view get-shit-done-cc version 2>/dev/null
```

**如果 npm 检查失败：**
```
无法检查更新（离线或 npm 不可用）。

手动更新：`npx get-shit-done-cc --global`
```

退出。
</step>

<step name="compare_versions">
比较已安装版本与最新版本：

**如果已安装 == 最新：**
```
## GSD 更新

**已安装：**X.Y.Z
**最新：**X.Y.Z

你已经是最新版本。
```

退出。

**如果已安装 > 最新：**
```
## GSD 更新

**已安装：**X.Y.Z
**最新：**A.B.C

你的版本高于最新发布版（开发版本？）。
```

退出。
</step>

<step name="show_changes_and_confirm">
**如果有可用更新**，在更新前获取并显示新内容：

1. 从 GitHub 原始 URL 获取更新日志
2. 提取已安装版本与最新版本之间的条目
3. 显示预览并请求确认：

```
## GSD 有可用更新

**已安装：**1.5.10
**最新：**1.5.15

### 更新内容
────────────────────────────────────────────────────────────

## [1.5.15] - 2026-01-20

### 新增
- 功能 X

## [1.5.14] - 2026-01-18

### 修复
- 错误修复 Y

────────────────────────────────────────────────────────────

⚠️  **注意：**安装程序会执行 GSD 文件夹的全新安装：
- `commands/gsd/` 将被清除并替换
- `get-shit-done/` 将被清除并替换
- `agents/gsd-*` 文件将被替换

（路径相对于检测到的运行时安装位置：
全局：`~/.claude/`、`~/.config/opencode/`、`~/.opencode/`、`~/.gemini/` 或 `~/.codex/`
本地：`./.claude/`、`./.config/opencode/`、`./.opencode/`、`./.gemini/` 或 `./.codex/`）

你在其他位置的自定义文件将被保留：
- 不在 `commands/gsd/` 中的自定义命令 ✓
- 不以 `gsd-` 为前缀的自定义代理 ✓
- 自定义钩子 ✓
- 你的 CLAUDE.md 文件 ✓

如果你直接修改了任何 GSD 文件，它们将自动备份到 `gsd-local-patches/`，更新后可以使用 `/gsd:reapply-patches` 重新应用。
```

使用 AskUserQuestion：
- 问题："继续更新？"
- 选项：
  - "是，立即更新"
  - "否，取消"

**如果用户取消：**退出。
</step>

<step name="run_update">
使用步骤 1 中检测到的安装类型运行更新：

从步骤 1 构建运行时标志：
```bash
RUNTIME_FLAG="--$TARGET_RUNTIME"
```

**如果是本地安装：**
```bash
npx -y get-shit-done-cc@latest "$RUNTIME_FLAG" --local
```

**如果是全局安装：**
```bash
npx -y get-shit-done-cc@latest "$RUNTIME_FLAG" --global
```

**如果是未知安装：**
```bash
npx -y get-shit-done-cc@latest --claude --global
```

捕获输出。如果安装失败，显示错误并退出。

清除更新缓存，使状态栏指示器消失：

```bash
# 清除所有运行时目录的更新缓存
for dir in .claude .config/opencode .opencode .gemini .codex; do
  rm -f "./$dir/cache/gsd-update-check.json"
  rm -f "$HOME/$dir/cache/gsd-update-check.json"
done
```

SessionStart 钩子（`gsd-check-update.js`）写入检测到的运行时缓存目录，因此必须清除所有路径以防止过期的更新指示器。
</step>

<step name="display_result">
格式化完成消息（更新日志已在确认步骤中显示）：

```
╔═══════════════════════════════════════════════════════════╗
║  GSD 已更新：v1.5.10 → v1.5.15                             ║
╚═══════════════════════════════════════════════════════════╝

⚠️  请重启运行时以加载新命令。

[查看完整更新日志](https://github.com/gsd-build/get-shit-done/blob/main/CHANGELOG.md)
```
</step>


<step name="check_local_patches">
更新完成后，检查安装程序是否检测到并备份了本地修改的文件：

检查配置目录中是否存在 gsd-local-patches/backup-meta.json。

**如果发现补丁：**

```
更新前已备份本地补丁。
运行 /gsd:reapply-patches 将你的修改合并到新版本中。
```

**如果没有补丁：**正常继续。
</step>
</process>

<success_criteria>
- [ ] 正确读取已安装版本
- [ ] 通过 npm 检查最新版本
- [ ] 如果已是最新则跳过更新
- [ ] 在更新前获取并显示更新日志
- [ ] 显示全新安装警告
- [ ] 获取用户确认
- [ ] 更新成功执行
- [ ] 显示重启提醒
</success_criteria>
</output>

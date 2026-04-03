# 内嵌 GSD 的小修复 Spec 工作流设计稿

## 1. 背景

前一版思路将这个小工作流视为一个独立产品，强调固定五阶段、强约束推进和独立状态管理。进一步分析后，发现这条路线虽然清晰，但会浪费 GSD 已有的核心优势：

- 长周期项目管理
- 里程碑与阶段规划
- `.planning/` 体系下的持续状态
- 并行 agent 推进
- 已有的 quick/debug/verify-work 闭环

因此，更合理的方向不是脱离 GSD 另起炉灶，而是把这个小工作流设计成 GSD 整体工作流中的一条专门通道，用于处理“规模不大但不能草率”的问题。

这条通道应服务于：

- 小 bug 修复
- 局部行为异常调查
- 需要先论证再改动的小需求
- 不值得单独立 phase，但又不应直接 `/gsd:fast` 的任务

它不替代 GSD 的主流程，而是补足 GSD 在“小问题也应有 spec 闭环”上的缺口。

## 2. 新的产品定位

这不是一个独立的多 agent 系统，而是 GSD 的一个新工作流入口。

建议定位为：

一个嵌入 GSD 的“小修复 spec 通道”，用于在不走完整 phase 流程的前提下，对局部问题执行一条更严格的闭环：

1. 分析问题
2. 形成小型提案
3. 审核提案
4. 实现修复
5. 回看需求与提案
6. 归档到 GSD 的现有状态体系中

它应当保持以下特点：

- 复用 GSD 的项目上下文和状态管理
- 复用已有 agent，尽量少造新轮子
- 比 `/gsd:fast` 更严谨
- 比完整 phase 流程更轻量
- 比现有 `debug + quick` 组合更强调“提案可审查”

## 3. 核心判断

深入比较后，可以得出一个重要结论：

GSD 已经覆盖了“小任务”的很多能力，但还没有把这些能力组织成一条明确的小型 spec 工作流。

换句话说：

- 它已经会调研
- 已经会调试
- 已经会规划
- 已经会执行
- 已经会验证

但它还没有专门处理这样一种场景：

“这是个不大的问题，但我不想直接修。我想先基于证据搞清楚，再形成一个可审查的小提案，再实现，再检查实现是否符合一开始的问题和提案。”

这就是新工作流的独特位置。

## 4. 对 GSD 现有能力的分析

### 4.1 `/gsd:fast`

`/gsd:fast` 的定位是极小任务的直接内联处理。

适合：

- 拼写修复
- 配置值调整
- 导入修复
- 极小范围的快速改动

它的优势是快，但明显不适合需要调查、论证或审查的问题。

它的问题不是功能不足，而是目标就不是为“需要先搞清楚再改”的任务设计的。

### 4.2 `/gsd:quick`

`/gsd:quick` 已经是最接近新方向的能力。

它已经支持：

- 轻量 discuss
- focused research
- planner
- plan-checker
- executor
- verifier

它也已经能产出：

- `CONTEXT.md`
- `RESEARCH.md`
- `PLAN.md`
- `SUMMARY.md`
- `VERIFICATION.md`

因此，`quick` 不是一个需要替代的对象，而是新工作流最应复用的底座。

但它仍然缺少两个关键点：

- 没有一个明确的“proposal-review”阶段
- 没有把“小修复提案”作为一个独立且可审查的对象

`quick` 更像是“小任务版 phase 执行”，而不是“小问题版 spec 闭环”。

### 4.3 `/gsd:debug`

`/gsd:debug` 在 bug 调查方面很强，特别是：

- 症状收集
- 根因调查
- 证据化推理
- `find_root_cause_only`
- `find_and_fix`
- human-verify
- resolved archive

这说明 GSD 在“调查问题”这件事上并不弱，甚至已经比很多通用工作流更强。

但它的重点是：

- 调试
- 找根因
- 修掉问题

而不是：

- 把根因分析转成一个显式提案
- 对提案做一次独立审查
- 再由实现和 review 阶段回看这个提案

所以 `debug` 是新工作流分析阶段的重要组成部分，但不能直接等同于新工作流本身。

### 4.4 `/gsd:verify-work`

`verify-work` 已经提供了：

- 用户视角的 UAT
- 发现问题后的 gap diagnosis
- 并行 debugger 调查
- 基于根因的 gap closure planning

这非常有价值，说明 GSD 已经具备“验证失败后自动回到修复”的能力。

但它的入口在“阶段工作已经完成之后”，主要服务 phase 级成果的验收，而不是在一个小问题刚开始时就建立一条 spec 化的处理通道。

## 5. 新工作流真正的独特性

如果只说“会调研、会修复、会验证”，这个工作流没有独特性。

真正的独特性在于下面三点必须同时成立：

### 5.1 小问题也必须先形成证据化结论

不是“怀疑这里有 bug，然后顺手改一下”，而是先回答：

- 原始问题是什么
- 观察到的症状是什么
- 已知证据是什么
- 最可能的原因是什么
- 当前准备采取什么修复方向

这使得小任务也具有可追溯性。

### 5.2 小问题也有独立的 proposal-review

这是目前 GSD 现有 quick/debug 路径里最缺失的一环。

新工作流强调：

- 先有一个小提案
- 再有一个 reviewer 只评审提案
- reviewer 不做实现

这会显著降低“analysis 直接滑向 coding”的风险。

### 5.3 code review 回看的是“原始问题 + 小提案”

现有验证往往偏向：

- 代码是否工作
- 症状是否消失
- must_haves 是否达成

而新工作流强调的是：

- 这次修改是否真的回应了用户最初的问题
- 是否按提案承诺的方式解决了问题
- 是否出现了为了修 bug 而偷偷扩大范围的情况

这让 code review 不只是质量检查，而是需求对照。

## 6. 目标用户与场景

### 6.1 目标用户

主要是已经在使用 GSD 管理长期项目的用户，他们需要在主流程之外处理很多“碎但不能乱修”的问题。

这类用户通常：

- 已经接受 GSD 的 `.planning/` 与阶段体系
- 不希望每个小问题都新建 phase
- 也不希望对有风险的小问题直接 `/gsd:fast`
- 习惯通过文档、提交、状态记录来回看历史

### 6.2 核心使用场景

#### 场景 A：阶段推进过程中发现一个局部 bug

主项目仍然按里程碑和 phase 推进，但用户发现某个界面交互、某个接口行为或某个 CLI 响应有问题。

这个问题不值得单开 phase，但又不能直接热修。用户希望：

- 保留问题记录
- 先调查
- 有一个明确修复方向
- 再编码
- 再回看最初问题

#### 场景 B：用户对修复方案本身不确定

问题已经知道，但怎么修并不明确。可能有多个修复方向，每个方向影响不同。

此时用户最需要的不是立刻写代码，而是让系统输出一个小型可审查提案，然后让 reviewer 先挑毛病。

#### 场景 C：阶段验收中发现缺口，需要小范围回补

`verify-work` 或人工验收发现了问题，但这个问题局部、清晰、范围受限。

此时不一定需要重新进入完整 phase 规划，更适合走一个小型 spec-fix 工作流：

- 补证据
- 形成 fix proposal
- 审核
- 实现
- 回看
- 归档

#### 场景 D：开发者想保留“为什么这么改”的记录

很多小 bug 修复最后只剩一个 `fix:` commit，但几天后没人记得：

- 为什么会这么改
- 其他方案为什么没选
- 这个 fix 是否只解决表象

新工作流的价值之一，就是把这些信息保留下来。

## 7. 产品目标

- 让 GSD 对“小问题”也有一条明确、稳定、可追溯的闭环。
- 复用现有 quick/debug/verify-work 能力，而不是平行造轮子。
- 把“小提案审查”引入 GSD 的轻量任务路径。
- 让 code review 回到原始问题和提案，而不只是检查代码结果。
- 让小问题处理结果仍然纳入 GSD 的整体状态和长期项目脉络。

## 8. 非目标

- 不替代现有的 `/gsd:fast`
- 不替代现有的 `/gsd:quick`
- 不替代 phase 级完整规划流程
- 不要求所有小任务都走这条通道
- 不引入会自主决定流程走向的调度 agent
- 不支持任意数量或任意布局的 pane 编排

## 9. 新工作流与现有命令的边界

### 应继续使用 `/gsd:fast`

当任务满足以下特征时：

- 一句话即可定义
- 不需要研究
- 不需要提案
- 不需要 review
- 用户只想尽快完成

### 应继续使用 `/gsd:quick`

当任务是一个小功能或小范围实现，需要：

- 简单规划
- 执行
- 可选验证

但不需要一个明确的“问题调查 -> 提案审查”语义时。

### 应优先使用新工作流

当任务满足以下特征时：

- 问题本身需要先分析
- 修复方向不应直接拍板
- 希望先有一个小提案再实现
- 希望 code review 回到原始问题和提案
- 希望把这次修复作为长期项目中的一个可追溯事件

### 应继续使用 `/gsd:debug`

当目标是纯调试或根因调查，尤其是：

- 还不确定是否要立刻修
- 先只想找到根因
- 问题复杂，需要 debugger 深入调查

实际上，新工作流可以把 `debug` 作为内部子步骤来用，而不是替代它。

## 10. 建议的工作流形态

建议把它设计为一个新命令，例如：

- `/gsd:bugfix`
- `/gsd:spec-fix`
- `/gsd:fix-with-review`

其中推荐 `bugfix` 或 `spec-fix`。

整体路径建议为：

1. capture problem
2. analyze
3. draft proposal
4. review proposal
5. implement
6. review against original problem and proposal
7. 若 review 失败，则带着 review 意见返回 implement
8. archive into `.planning/quick/` or dedicated subdirectory

注意，这条路径不必都由全新 agent 完成。更合理的是：

- `analyze` 复用 `gsd-debugger` 的诊断能力或研究能力
- `draft proposal` 复用 `gsd-planner`，但输出对象不是 phase plan，而是 fix proposal
- `review proposal` 需要新增一个轻量 reviewer 角色，或改造 plan-checker
- `implement` 复用 `gsd-executor`
- `review implementation` 复用 `gsd-verifier`，但增加“问题/提案对照”维度

不过，推进流程的主体不应是 agent，而应是固定线性的 runner。更具体地说：

- agent 只负责当前阶段的产出
- 阶段切换由脚本或 hook 判断，不由 agent 决策
- 每一阶段完成后先校验产物，再 commit，再推进
- code review 失败时不是“从头 redo”，而是 coding agent 基于评审意见增量修复
- code review → coding 的回环必须有上限，最多允许 3 次 review / redo
- 第 3 次 code review 完成后，无论是否仍有残余非致命意见，都视为通过并推进到 archive
- 5 个工作流 agent 的 provider 必须可独立配置，不能被单一 `--runtime` 参数全局绑定

## 11. 产物设计方向

这条小通道的关键，不是 agent 数量，而是产物清晰。

建议至少包含以下产物：

- `PROBLEM.md`
- `ANALYSIS.md`
- `PROPOSAL.md`
- `PROPOSAL-REVIEW.md`
- `SUMMARY.md`
- `VERIFICATION.md` 或 `IMPLEMENTATION-REVIEW.md`

这些产物应被视为 quick lane 下的轻量工件，而不是 phase 工件。

它们的作用分别是：

- `PROBLEM.md`：保存原始问题和边界
- `ANALYSIS.md`：保存证据、症状、根因或结论
- `PROPOSAL.md`：保存修复方向、范围、风险、非目标
- `PROPOSAL-REVIEW.md`：保存 reviewer 的质疑和改进建议
- `SUMMARY.md`：保存实际实现结果
- `VERIFICATION.md`：保存是否真的解决了最初问题

## 12. 关键需求

### 12.1 流程需求

- 新工作流必须嵌入 GSD 的现有项目上下文中运行。
- 新工作流必须可在 phase 中途触发，而不破坏主 phase 状态。
- 新工作流必须允许复用现有 quick/debug agent 能力。
- 新工作流必须把 proposal-review 作为独立步骤，而不是隐含在 planner/checker 内。
- 新工作流必须由固定状态机推进，而不是由调度 agent 动态决策。
- 新工作流必须在前 2 次 code-review 未通过时回退到 coding，并在第 3 次 code-review 后自动视为通过。
- 新工作流必须支持对 analysis、proposal-review、coding、code-review、archive 这 5 个 agent 分别配置 provider。

### 12.2 审查需求

- proposal-review 不得实现代码。
- code review 必须回看原始问题与 proposal。
- 验证输出必须明确回答“是否按提案解决了最初问题”。
- code review 的失败输出必须结构化保存，以便 coding 只做基于意见的增量修复。
- 第 3 次 code review 后如果仍有意见，必须把这些意见写入最终 review 工件，但不得阻塞 archive。

### 12.3 历史与追溯需求

- 小问题的处理记录必须能回看。
- 小问题修复应当能被挂接到 GSD 现有 STATE 体系中。
- 小问题的产物应当在长期项目上下文中可见。
- 每个阶段完成后必须生成独立 commit。
- 第一个 commit message 必须保留用户原问题，格式固定为 `问题：<原文单行化版本>`。

### 12.4 集成需求

- 不要求新建 ROADMAP phase。
- 不应破坏现有 quick 任务表和 phase 状态。
- 应尽量复用已有 CLI 工具与 agent。
- 必须支持通过 `tmux` 或 `zellij` 启动固定 pane 布局。
- 固定布局中第一个 pane 必须是 `lazygit`，其余 pane 才是 workflow stages。
- 必须提供配置项，让 5 个 agent 的 provider 可以任意组合。

## 13. MVP 建议

MVP 不需要全新系统，但需要做出“固定 runner + 新语义 + 新产物链”。

首版建议只做：

- 一个新命令入口
- 一个固定线性 runner
- 问题捕获
- analysis 产物
- proposal 产物
- proposal-review 产物
- executor 实现
- implementation review / verification
- 最多 3 次的 code-review / coding 增量修复回环，其中第 3 次 review 自动通过
- zellij 固定 6 pane 布局，tmux 适配可随后补齐
- 5 个 agent 的 provider 独立配置
- 接入 `.planning/STATE.md`

首版不要做：

- 复杂 branch 策略
- 外部 AI proposal review
- 自动和 phase/gap closure 深度联动
- 会自行决定流程走向的调度 agent
- 任意 pane 数量、任意 pane 布局、任意 stage 排布

## 14. 成功标准

如果这个方向是对的，用户会明确感受到：

- “我不用为小问题单开 phase，但也不用草率修。”
- “这个流程比 quick 更稳，比完整 phase 更轻。”
- “我能看到这次修复为什么这么做，而不是只看到一个 fix commit。”
- “proposal-review 真正拦住了不成熟的修法。”
- “这条小通道仍然属于 GSD 的整体项目管理体系，而不是外部孤岛。”

## 15. 一句话总结

新方向不是“做一个独立的小工作流系统”，而是“在 GSD 内增加一条面向小问题的 spec 化修复通道”，让 quick/debug 之上再多一层可审查、可追溯、可回看需求的小提案闭环。

## 16. 执行机制补充

### 16.1 runner 而不是调度 agent

这条工作流是固定的线性推进，不需要一个调度 agent 去做动态决策。更可靠的实现方式应当是：

- 一个 `spec-fix start` 入口命令
- 一个持久化状态文件，例如 `.planning/fixes/<id>/workflow.json`
- 一组阶段校验器
- 一组阶段完成 hook
- 一个负责 pane/window 生命周期的 mux 适配层

runner 的职责应当包括：

- 初始化 fix 目录与产物骨架
- 写入 `PROBLEM.md`
- 生成第一个 commit：`问题：<用户原文单行化版本>`
- 创建 mux window 与固定 6 panes
- 向各个 pane 注入固定命令
- 在阶段完成后执行“校验 -> commit -> 状态推进”
- 在前 2 次 review 未通过时把结构化意见传回 coding pane
- 在第 3 次 review 后把最终 review 备注带入 archive，而不是中断流程
- 读取并解析 5 个 agent 的 provider 配置，并将结果分发给对应 pane

### 16.2 固定 pane 布局

pane 布局应当固定，不允许 agent 自行扩展：

1. pane 1：`lazygit`
2. pane 2：analysis agent
3. pane 3：proposal-review agent
4. pane 4：coding agent
5. pane 5：code-review agent
6. pane 6：archive agent

这个布局的目的不是为了并行执行所有阶段，而是为了让用户始终在同一个 window 中看到：

- 左上角持续显示 git 变化
- 中间 5 个 pane 按职责固定
- 当前推进到哪个阶段一眼可见

### 16.3 固定状态机

建议状态机定义为：

`problem-captured -> analysis-done -> proposal-reviewed -> coding-done -> code-review-passed -> archived`

唯一允许的显式回环为：

`code-review-failed -> coding-redo -> coding-done`

补充约束：

- `coding-redo` 不代表从头开始实现
- 它只允许基于最近一次 code-review 的意见做增量修复
- runner 必须记录当前 review 轮次
- 前 2 次 review 未通过时，流程回到 `coding-redo`
- 第 3 次 review 完成后，不再回退到 coding，而是直接进入 `code-review-passed`
- 第 3 次 review 的遗留意见必须保存在最终 review 工件中

### 16.4 agent provider 配置

单一 `--runtime` 参数不应作为 5 个 agent 的全局强制 provider。更合理的方式是增加一个配置项，例如：

```json
{
  "workflow": {
    "spec_fix_agent_providers": {
      "analysis": "codex",
      "proposal_review": "claude",
      "coding": "codex",
      "code_review": "claude",
      "archive": "gemini"
    }
  }
}
```

这个配置的要求是：

- 5 个 agent 必须可以任意组合 provider
- runner 必须按 agent 角色而不是按整个 run 全局解析 provider
- 缺失配置时才允许回退到默认 provider 策略
- pane 中注入的命令必须体现各自 agent 的 provider 选择

### 16.5 用户日常使用流程

从用户视角，最合理的入口不是“先打开某个 agent CLI 再手动 prompt 它创建 pane”，而是：

1. 用户在任意一个普通 shell pane 中执行固定命令
2. runner 创建新的 zellij 或 tmux window
3. runner 切出 6 个 panes，并将 `lazygit` 放在第一个 pane
4. runner 先只放开 analysis 阶段
5. 每当某阶段完成，hook 校验产物并自动 commit
6. 校验通过后 runner 解锁下一阶段
7. 完成后 archive 阶段归档并写最终 commit

建议的命令形态：

```bash
gsd-tools spec-fix start \
  --mux zellij \
  --problem "用户原始问题原文"
```

slash command 如果存在，也应当只是这个命令的薄封装，而不是另一套独立实现。

### 16.6 用户完成后如何检查

用户完成后不应靠猜，而应有固定检查方式：

- 在 pane 1 的 `lazygit` 中确认阶段提交链完整
- 运行 `gsd-tools spec-fix status <id>` 查看当前状态、轮次、各阶段 commit hash
- 查看 `.planning/fixes/<id>/` 下的工件是否齐全
- 查看对应 OpenSpec change 是否已 archived

`status` 输出至少应包含：

- 当前阶段
- 当前 review 轮次
- 第 3 次 review 是否触发自动通过
- 各阶段 commit hash
- 当前 mux 类型与 pane 标识
- 对应 OpenSpec change 名称与状态
- 5 个 agent 的 provider 解析结果

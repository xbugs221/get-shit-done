# GSD 使用流程图

## 场景一：全新项目完整流程

从零开始一个新项目，走完整的规划→执行→交付流程。

```mermaid
flowchart TD
    Start([开始新项目]) --> MapCode

    MapCode[/gsd:map-codebase/] --> MapDesc[分析已有代码结构]
    MapDesc --> NewProj

    NewProj[/gsd:new-project/] --> NewDesc[回答项目愿景问题 自动生成路线图]
    NewDesc -->|生成 ROADMAP| PhaseLoop

    subgraph PhaseLoop["对每个 Phase 循环"]
        direction TB
        Discuss[/gsd:discuss-phase N/] --> DiscDesc[讨论实现方案偏好]
        DiscDesc --> Plan
        Plan[/gsd:plan-phase N/] --> PlanDesc[研究 + 生成详细计划]
        PlanDesc --> Exec
        Exec[/gsd:execute-phase N/] --> ExecDesc[并行执行 自动提交]
        ExecDesc --> Verify
        Verify[/gsd:verify-work N/] --> VerDesc[逐项验收测试]
        VerDesc -->|通过| Ship
        VerDesc -->|有问题| FixGap
        FixGap[/gsd:execute-phase N --gaps-only/] --> FixDesc[只修复验收失败项]
        FixDesc --> Verify
        Ship[/gsd:ship N/] --> ShipDesc[创建 PR 提交]
    end

    PhaseLoop --> Complete
    Complete[/gsd:complete-milestone/] --> CompDesc[归档里程碑 打 tag]
    CompDesc --> Done([项目交付])

    style Start fill:#4CAF50,color:#fff
    style Done fill:#4CAF50,color:#fff
    style FixGap fill:#FF9800,color:#fff
```

## 场景二：已有项目添加新功能

项目已经在运行，需要加一个新功能或修复一个较大的 bug。

```mermaid
flowchart TD
    Start([需要添加功能]) --> Decision{功能规模}

    Decision -->|大功能| NewMile[/gsd:new-milestone v2/]
    Decision -->|中等功能| AddPhase[/gsd:add-phase/]
    Decision -->|紧急插入| InsertPhase[/gsd:insert-phase 3/]

    NewMile --> NewMileDesc[开启新版本周期]
    AddPhase --> AddDesc[追加到路线图末尾]
    InsertPhase --> InsertDesc[插入为 3.1 阶段]

    NewMileDesc --> D
    AddDesc --> D
    InsertDesc --> D

    D[/gsd:discuss-phase N/] --> P[/gsd:plan-phase N/]
    P --> E[/gsd:execute-phase N/]
    E --> V[/gsd:verify-work N/]
    V --> Ship[/gsd:ship N/]
    Ship --> Done([功能上线])

    style Start fill:#2196F3,color:#fff
    style Done fill:#2196F3,color:#fff
    style InsertPhase fill:#FF9800,color:#fff
```

## 场景三：小任务快速修复

不想走完整的 Phase 流程，只是改个 bug 或做个小调整。

```mermaid
flowchart TD
    Start([有个小任务]) --> Size{任务复杂度}

    Size -->|改拼写改配置| Fast[/gsd:fast 修复拼写/]
    Size -->|小 bug 小功能| Quick[/gsd:quick/]
    Size -->|需要调研| QuickFull[/gsd:quick --research --full/]

    Fast --> FastDesc[直接执行 秒级完成 无规划]
    FastDesc --> CommitA([自动提交])

    Quick --> QuickDesc[轻量规划+执行 跳过研究和验证]
    QuickDesc --> CommitB([自动提交])

    QuickFull --> QFDesc[研究+规划+执行+验证 完整但不建 Phase]
    QFDesc --> CommitC([自动提交])

    style Start fill:#9C27B0,color:#fff
    style CommitA fill:#4CAF50,color:#fff
    style CommitB fill:#4CAF50,color:#fff
    style CommitC fill:#4CAF50,color:#fff
```

### 需要固定审查闸门的小修复

当问题不大，但又必须保留证据、提案审查、代码回看和归档记录时，走固定的 `spec-fix` runner。

职责边界：
- `.planning/fixes/<id>/` 保存这一次 fix run 的运行态、阶段工件和 mux 元数据
- `.planning/openspec/` 保存对应 OpenSpec change 的 proposal、design、specs、tasks 与 archive 历史
- `spec-fix` 负责推进 workflow，OpenSpec 负责声明态工件与 change 生命周期
- archive 阶段只有在关联 OpenSpec change 先成功归档后才会把 workflow 标记为 `archived`

```mermaid
flowchart TD
    Start([有个小问题但不能直接改]) --> Capture[spec-fix start --change]
    Capture --> Analysis[analysis]
    Analysis --> Proposal[proposal-review]
    Proposal --> Coding[coding]
    Coding --> Review[code-review]
    Review -->|通过| Archive[archive]
    Review -->|前两轮不通过| Redo[coding redo]
    Redo --> Review
    Review -->|第 3 轮后自动通过| Archive
    Archive --> Done([归档完成])

    style Start fill:#8BC34A,color:#000
    style Review fill:#FFB74D,color:#000
    style Archive fill:#4CAF50,color:#fff
```

## 场景四：全自动少问模式

不想被问问题，让 AI 自己决定一切。

```mermaid
flowchart TD
    Start([想少操心]) --> Route{你想怎么做}

    Route -->|完全放手| Settings[/gsd:settings/]
    Route -->|手动推进但少问| DiscussAuto[/gsd:discuss-phase N --auto/]
    Route -->|有 PRD 文档| NewProjPRD[/gsd:new-project --auto @prd.md/]

    Settings --> SetDesc[设置 skip_discuss: true]
    SetDesc --> Autonomous[/gsd:autonomous/]
    Autonomous --> AutoDesc[自动循环所有阶段]
    AutoDesc --> VerifyAll

    DiscussAuto --> DADesc[自动选择推荐默认值]
    DADesc --> PlanAuto[/gsd:plan-phase N/]
    PlanAuto --> ExecAuto[/gsd:execute-phase N/]
    ExecAuto --> VerifyAll

    NewProjPRD --> PRDDesc[从文档提取 零问题]
    PRDDesc --> Autonomous2[/gsd:autonomous/]
    Autonomous2 --> VerifyAll

    VerifyAll[/gsd:verify-work/] --> VNote[这步需要你参与 验收无法全自动]
    VNote --> Done([完成])

    style Start fill:#FF5722,color:#fff
    style Done fill:#FF5722,color:#fff
    style VerifyAll fill:#FFC107,color:#000
```

## 场景五：不知道下一步干什么

迷路了？不确定项目推进到哪了？

```mermaid
flowchart TD
    Start([不知道该干啥]) --> Choice{你的情况}

    Choice -->|忘了到哪步| Next[/gsd:next/]
    Choice -->|有想法不知用啥命令| Do[/gsd:do/]
    Choice -->|上次做到一半| Resume[/gsd:resume-work/]
    Choice -->|想看整体进度| Progress[/gsd:progress/]

    Next --> NextDesc[自动检测状态 跳转到正确的下一步]
    NextDesc --> Detected{检测到的状态}
    Detected -->|无 CONTEXT| D2[discuss-phase]
    Detected -->|无 PLAN| P2[plan-phase]
    Detected -->|有未完成计划| E2[execute-phase]
    Detected -->|执行完毕| V2[verify-work]
    Detected -->|全部完成| C2[complete-milestone]

    Do --> DoDesc[用自然语言描述 自动路由到对应命令]
    DoDesc -->|如: 加个暗色模式| Routed[自动匹配 add-phase]

    Resume --> ResumeDesc[恢复上次中断的工作 完整上下文还原]

    Progress --> ProgDesc[显示当前进度 推荐下一步]

    style Start fill:#607D8B,color:#fff
    style Next fill:#E8F5E9
    style Do fill:#FFF3E0
    style Resume fill:#F3E5F5
    style Progress fill:#E3F2FD
```

## 场景六：调试与日常维护

遇到 bug 或需要维护项目时的快捷路径。

```mermaid
flowchart TD
    Start([日常维护]) --> What{要做什么}

    What -->|遇到 bug| Debug[/gsd:debug/]
    What -->|看代码质量| Review{审查方式}
    What -->|记个想法| Note{记录方式}
    What -->|管理多阶段| Manager[/gsd:manager/]

    Debug --> DebugDesc[科学方法排查 持久化调试状态]
    DebugDesc -->|找到问题| Fix{修复方式}
    Fix -->|简单修复| Fast2[/gsd:fast/]
    Fix -->|需要规划| Quick2[/gsd:quick/]

    Review -->|架构分析| MapCode[/gsd:map-codebase/]
    Review -->|前端审计| UIReview[/gsd:ui-review/]
    Review -->|健康检查| Health[/gsd:health/]

    Note -->|快速记录| AddNote[/gsd:note/]
    Note -->|从对话捕捉| AddTodo[/gsd:add-todo/]
    Note -->|存入停车场| Backlog[/gsd:add-backlog/]

    Manager --> MgrDesc[多阶段交互式管理 一个终端控制全局]

    style Start fill:#795548,color:#fff
    style Debug fill:#FFCDD2
    style MapCode fill:#E8F5E9
    style AddNote fill:#FFF9C4
```

## 速查：命令选择决策树

```mermaid
flowchart LR
    Q([我要做什么]) --> A{有完整路线图}

    A -->|没有| B{项目规模}
    B -->|大项目| NP[new-project]
    B -->|做v2| NM[new-milestone]
    B -->|一个功能| QK[quick]
    B -->|一行代码| FT[fast]

    A -->|有| C{知道下一步}
    C -->|不知道| NX[next]
    C -->|知道| D{哪个阶段}
    D -->|讨论| DP[discuss-phase]
    D -->|规划| PP[plan-phase]
    D -->|执行| EP[execute-phase]
    D -->|验收| VW[verify-work]
    D -->|全自动| AU[autonomous]

    style Q fill:#1565C0,color:#fff
    style NP fill:#C8E6C9
    style NM fill:#C8E6C9
    style QK fill:#FFE0B2
    style FT fill:#E8F5E9
    style NX fill:#BBDEFB
    style AU fill:#F8BBD0
```

# 调研模板

用于 `.planning/phases/XX-name/{phase_num}-RESEARCH.md` 的模板 - 在规划之前进行全面的生态系统调研。

**用途：** 记录 Claude 为了良好地实现某个阶段所需了解的信息 - 不仅是"用哪个库"，而是"专家是如何构建这个的"。

---

## 文件模板

```markdown
# 阶段 [X]：[名称] - 调研

**调研日期：** [date]
**领域：** [主要技术/问题领域]
**置信度：** [HIGH/MEDIUM/LOW]

<user_constraints>
## 用户约束（来自 CONTEXT.md）

**关键：** 如果存在来自 /gsd:discuss-phase 的 CONTEXT.md，请将锁定的决策逐字复制到此处。规划器必须遵守这些决策。

### 锁定的决策
[从 CONTEXT.md 的 `## Decisions` 部分复制 - 这些是不可协商的]
- [决策 1]
- [决策 2]

### Claude 自行裁量
[从 CONTEXT.md 复制 - 调研员/规划器可以自行选择的领域]
- [领域 1]
- [领域 2]

### 延后的想法（不在范围内）
[从 CONTEXT.md 复制 - 不要调研或规划这些]
- [延后 1]
- [延后 2]

**如果不存在 CONTEXT.md：** 写 "No user constraints - all decisions at Claude's discretion"
</user_constraints>

<research_summary>
## 摘要

[2-3 段执行摘要]
- 调研了什么
- 标准方法是什么
- 关键建议

**主要建议：** [一句话可操作的指导]
</research_summary>

<standard_stack>
## 标准技术栈

该领域已确立的库/工具：

### 核心
| 库 | 版本 | 用途 | 为何是标准 |
|---------|---------|---------|--------------|
| [name] | [ver] | [功能描述] | [专家使用它的原因] |
| [name] | [ver] | [功能描述] | [专家使用它的原因] |

### 辅助
| 库 | 版本 | 用途 | 使用场景 |
|---------|---------|---------|-------------|
| [name] | [ver] | [功能描述] | [用例] |
| [name] | [ver] | [功能描述] | [用例] |

### 考虑过的替代方案
| 替代对象 | 可用替代 | 权衡 |
|------------|-----------|----------|
| [standard] | [alternative] | [替代方案合理的场景] |

**安装：**
```bash
npm install [packages]
# 或
yarn add [packages]
```
</standard_stack>

<architecture_patterns>
## 架构模式

### 推荐的项目结构
```
src/
├── [folder]/        # [用途]
├── [folder]/        # [用途]
└── [folder]/        # [用途]
```

### 模式 1：[模式名称]
**是什么：** [描述]
**何时使用：** [条件]
**示例：**
```typescript
// [来自 Context7/官方文档的代码示例]
```

### 模式 2：[模式名称]
**是什么：** [描述]
**何时使用：** [条件]
**示例：**
```typescript
// [代码示例]
```

### 应避免的反模式
- **[反模式]：** [为什么不好，应该怎么做]
- **[反模式]：** [为什么不好，应该怎么做]
</architecture_patterns>

<dont_hand_roll>
## 不要自己造轮子

看起来简单但已有现成解决方案的问题：

| 问题 | 不要自己构建 | 改用 | 原因 |
|---------|-------------|-------------|-----|
| [problem] | [你会构建的东西] | [库] | [边界情况、复杂性] |
| [problem] | [你会构建的东西] | [库] | [边界情况、复杂性] |
| [problem] | [你会构建的东西] | [库] | [边界情况、复杂性] |

**关键洞察：** [为什么在这个领域自定义解决方案更差]
</dont_hand_roll>

<common_pitfalls>
## 常见陷阱

### 陷阱 1：[名称]
**会出什么问题：** [描述]
**为什么会发生：** [根本原因]
**如何避免：** [预防策略]
**预警信号：** [如何及早发现]

### 陷阱 2：[名称]
**会出什么问题：** [描述]
**为什么会发生：** [根本原因]
**如何避免：** [预防策略]
**预警信号：** [如何及早发现]

### 陷阱 3：[名称]
**会出什么问题：** [描述]
**为什么会发生：** [根本原因]
**如何避免：** [预防策略]
**预警信号：** [如何及早发现]
</common_pitfalls>

<code_examples>
## 代码示例

来自官方来源的经过验证的模式：

### [常见操作 1]
```typescript
// 来源：[Context7/官方文档 URL]
[code]
```

### [常见操作 2]
```typescript
// 来源：[Context7/官方文档 URL]
[code]
```

### [常见操作 3]
```typescript
// 来源：[Context7/官方文档 URL]
[code]
```
</code_examples>

<sota_updates>
## 技术前沿（2024-2025）

最近的变化：

| 旧方法 | 当前方法 | 变化时间 | 影响 |
|--------------|------------------|--------------|--------|
| [old] | [new] | [日期/版本] | [对实现的意义] |

**值得考虑的新工具/模式：**
- [工具/模式]：[它能实现什么，何时使用]
- [工具/模式]：[它能实现什么，何时使用]

**已弃用/过时的：**
- [事物]：[为什么过时了，被什么替代了]
</sota_updates>

<open_questions>
## 未解决的问题

无法完全解决的事项：

1. **[问题]**
   - 已知信息：[部分信息]
   - 不明确的地方：[差距]
   - 建议：[在规划/执行过程中如何处理]

2. **[问题]**
   - 已知信息：[部分信息]
   - 不明确的地方：[差距]
   - 建议：[如何处理]
</open_questions>

<sources>
## 来源

### 主要来源（HIGH 置信度）
- [Context7 library ID] - [获取的主题]
- [官方文档 URL] - [检查了什么]

### 次要来源（MEDIUM 置信度）
- [通过官方来源验证的 WebSearch] - [发现 + 验证]

### 第三方来源（LOW 置信度 - 需要验证）
- [仅 WebSearch] - [发现，标记为在实现过程中验证]
</sources>

<metadata>
## 元数据

**调研范围：**
- 核心技术：[什么]
- 生态系统：[探索的库]
- 模式：[调研的模式]
- 陷阱：[检查的领域]

**置信度细分：**
- 标准技术栈：[HIGH/MEDIUM/LOW] - [原因]
- 架构：[HIGH/MEDIUM/LOW] - [原因]
- 陷阱：[HIGH/MEDIUM/LOW] - [原因]
- 代码示例：[HIGH/MEDIUM/LOW] - [原因]

**调研日期：** [date]
**有效期至：** [估计 - 稳定技术 30 天，快速发展的技术 7 天]
</metadata>

---

*阶段：XX-name*
*调研完成日期：[date]*
*准备好进行规划：[yes/no]*
```

---

## 良好示例

```markdown
# 阶段 3：3D 城市驾驶 - 调研

**调研日期：** 2025-01-20
**领域：** 使用 Three.js 构建具有驾驶机制的 3D 网页游戏
**置信度：** HIGH

<research_summary>
## 摘要

调研了用于构建 3D 城市驾驶游戏的 Three.js 生态系统。标准方法使用 Three.js 配合 React Three Fiber 进行组件架构设计，使用 Rapier 处理物理效果，使用 drei 提供常用辅助功能。

关键发现：不要自己编写物理或碰撞检测代码。Rapier（通过 @react-three/rapier）可以高效处理车辆物理、地形碰撞和城市物体交互。自定义物理代码会导致 bug 和性能问题。

**主要建议：** 使用 R3F + Rapier + drei 技术栈。从 drei 的车辆控制器开始，添加 Rapier 车辆物理，使用实例化网格构建城市以提升性能。
</research_summary>

<standard_stack>
## 标准技术栈

### 核心
| 库 | 版本 | 用途 | 为何是标准 |
|---------|---------|---------|--------------|
| three | 0.160.0 | 3D 渲染 | 网页 3D 的标准 |
| @react-three/fiber | 8.15.0 | Three.js 的 React 渲染器 | 声明式 3D，更好的开发体验 |
| @react-three/drei | 9.92.0 | 辅助工具和抽象层 | 解决常见问题 |
| @react-three/rapier | 1.2.1 | 物理引擎绑定 | R3F 最佳物理引擎 |

### 辅助
| 库 | 版本 | 用途 | 使用场景 |
|---------|---------|---------|-------------|
| @react-three/postprocessing | 2.16.0 | 视觉效果 | 泛光、景深、动态模糊 |
| leva | 0.9.35 | 调试 UI | 调整参数 |
| zustand | 4.4.7 | 状态管理 | 游戏状态、UI 状态 |
| use-sound | 4.0.1 | 音频 | 引擎声音、环境音 |

### 考虑过的替代方案
| 替代对象 | 可用替代 | 权衡 |
|------------|-----------|----------|
| Rapier | Cannon.js | Cannon 更简单但车辆性能较差 |
| R3F | 原生 Three | 不用 React 时用原生，但 R3F 开发体验更好 |
| drei | 自定义辅助工具 | drei 经过实战检验，不要重新发明 |

**安装：**
```bash
npm install three @react-three/fiber @react-three/drei @react-three/rapier zustand
```
</standard_stack>

<architecture_patterns>
## 架构模式

### 推荐的项目结构
```
src/
├── components/
│   ├── Vehicle/          # 带物理的玩家车辆
│   ├── City/             # 城市生成和建筑
│   ├── Road/             # 道路网络
│   └── Environment/      # 天空、光照、雾效
├── hooks/
│   ├── useVehicleControls.ts
│   └── useGameState.ts
├── stores/
│   └── gameStore.ts      # Zustand 状态
└── utils/
    └── cityGenerator.ts  # 程序化生成辅助工具
```

### 模式 1：使用 Rapier 的车辆物理
**是什么：** 使用带有车辆特定设置的 RigidBody，而不是自定义物理
**何时使用：** 任何地面车辆
**示例：**
```typescript
// 来源：@react-three/rapier 文档
import { RigidBody, useRapier } from '@react-three/rapier'

function Vehicle() {
  const rigidBody = useRef()

  return (
    <RigidBody
      ref={rigidBody}
      type="dynamic"
      colliders="hull"
      mass={1500}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <mesh>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial />
      </mesh>
    </RigidBody>
  )
}
```

### 模式 2：城市的实例化网格
**是什么：** 对重复对象（建筑、树木、道具）使用 InstancedMesh
**何时使用：** 超过 100 个相似对象时
**示例：**
```typescript
// 来源：drei 文档
import { Instances, Instance } from '@react-three/drei'

function Buildings({ positions }) {
  return (
    <Instances limit={1000}>
      <boxGeometry />
      <meshStandardMaterial />
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} scale={[1, Math.random() * 5 + 1, 1]} />
      ))}
    </Instances>
  )
}
```

### 应避免的反模式
- **在渲染循环中创建网格：** 只创建一次，仅更新变换
- **不使用 InstancedMesh：** 为建筑使用单独的网格会严重影响性能
- **自定义物理计算：** Rapier 每次都处理得更好
</architecture_patterns>

<dont_hand_roll>
## 不要自己造轮子

| 问题 | 不要自己构建 | 改用 | 原因 |
|---------|-------------|-------------|-----|
| 车辆物理 | 自定义速度/加速度 | Rapier RigidBody | 轮胎摩擦、悬挂、碰撞很复杂 |
| 碰撞检测 | 对所有东西进行射线检测 | Rapier 碰撞器 | 性能、边界情况、穿透问题 |
| 相机跟随 | 手动插值 | drei CameraControls 或使用 useFrame 自定义 | 平滑插值、边界处理 |
| 城市生成 | 纯随机放置 | 基于网格加噪声变化 | 随机看起来不对，网格可预测 |
| LOD | 手动距离检查 | drei <Detailed> | 处理过渡、滞后效应 |

**关键洞察：** 3D 游戏开发有 40 多年已解决的问题。Rapier 实现了正确的物理模拟。drei 实现了正确的 3D 辅助工具。对抗这些会导致看起来像"游戏手感"问题但实际上是物理边界情况的 bug。
</dont_hand_roll>

<common_pitfalls>
## 常见陷阱

### 陷阱 1：物理穿透
**会出什么问题：** 快速物体穿过墙壁
**为什么会发生：** 默认物理步长对于该速度来说太大
**如何避免：** 在 Rapier 中使用 CCD（连续碰撞检测）
**预警信号：** 物体随机出现在建筑外面

### 陷阱 2：绘制调用导致的性能崩溃
**会出什么问题：** 游戏在有很多建筑时卡顿
**为什么会发生：** 每个网格 = 1 次绘制调用，数百栋建筑 = 数百次调用
**如何避免：** 对相似对象使用 InstancedMesh，合并静态几何体
**预警信号：** GPU 受限，尽管场景简单但帧率低

### 陷阱 3：车辆"飘浮"感
**会出什么问题：** 汽车感觉不贴地
**为什么会发生：** 缺少正确的轮胎/悬挂模拟
**如何避免：** 使用 Rapier 车辆控制器或仔细调整质量/阻尼
**预警信号：** 汽车弹跳异常，过弯没有抓地力
</common_pitfalls>

<code_examples>
## 代码示例

### 基本 R3F + Rapier 设置
```typescript
// 来源：@react-three/rapier 入门指南
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'

function Game() {
  return (
    <Canvas>
      <Physics gravity={[0, -9.81, 0]}>
        <Vehicle />
        <City />
        <Ground />
      </Physics>
    </Canvas>
  )
}
```

### 车辆控制 Hook
```typescript
// 来源：社区模式，已通过 drei 文档验证
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'

function useVehicleControls(rigidBodyRef) {
  const [, getKeys] = useKeyboardControls()

  useFrame(() => {
    const { forward, back, left, right } = getKeys()
    const body = rigidBodyRef.current
    if (!body) return

    const impulse = { x: 0, y: 0, z: 0 }
    if (forward) impulse.z -= 10
    if (back) impulse.z += 5

    body.applyImpulse(impulse, true)

    if (left) body.applyTorqueImpulse({ x: 0, y: 2, z: 0 }, true)
    if (right) body.applyTorqueImpulse({ x: 0, y: -2, z: 0 }, true)
  })
}
```
</code_examples>

<sota_updates>
## 技术前沿（2024-2025）

| 旧方法 | 当前方法 | 变化时间 | 影响 |
|--------------|------------------|--------------|--------|
| cannon-es | Rapier | 2023 | Rapier 更快、维护更好 |
| 原生 Three.js | React Three Fiber | 2020+ | R3F 现在是 React 应用的标准 |
| 手动 InstancedMesh | drei <Instances> | 2022 | 更简单的 API，处理更新 |

**值得考虑的新工具/模式：**
- **WebGPU：** 即将到来，但尚未准备好用于游戏生产环境（2025）
- **drei Gltf 辅助工具：** <useGLTF.preload> 用于加载界面

**已弃用/过时的：**
- **cannon.js（原版）：** 使用 cannon-es 分支或更好的选择 Rapier
- **手动射线检测用于物理：** 直接使用 Rapier 碰撞器
</sota_updates>

<sources>
## 来源

### 主要来源（HIGH 置信度）
- /pmndrs/react-three-fiber - 入门、hooks、性能
- /pmndrs/drei - 实例、控制、辅助工具
- /dimforge/rapier-js - 物理设置、车辆物理

### 次要来源（MEDIUM 置信度）
- Three.js 论坛"城市驾驶游戏"主题 - 已对照文档验证模式
- R3F 示例仓库 - 已验证代码可运行

### 第三方来源（LOW 置信度 - 需要验证）
- 无 - 所有发现均已验证
</sources>

<metadata>
## 元数据

**调研范围：**
- 核心技术：Three.js + React Three Fiber
- 生态系统：Rapier、drei、zustand
- 模式：车辆物理、实例化、城市生成
- 陷阱：性能、物理、手感

**置信度细分：**
- 标准技术栈：HIGH - 已通过 Context7 验证，广泛使用
- 架构：HIGH - 来自官方示例
- 陷阱：HIGH - 在论坛中有记录，已在文档中验证
- 代码示例：HIGH - 来自 Context7/官方来源

**调研日期：** 2025-01-20
**有效期至：** 2025-02-20（30 天 - R3F 生态系统稳定）
</metadata>

---

*阶段：03-city-driving*
*调研完成日期：2025-01-20*
*准备好进行规划：yes*
```

---

## 指南

**何时创建：**
- 在规划小众/复杂领域的阶段之前
- 当 Claude 的训练数据可能过时或稀缺时
- 当"专家如何做"比"用哪个库"更重要时

**结构：**
- 使用 XML 标签作为章节标记（与 GSD 模板一致）
- 七个核心章节：summary、standard_stack、architecture_patterns、dont_hand_roll、common_pitfalls、code_examples、sources
- 所有章节均为必填（驱动全面调研）

**内容质量：**
- 标准技术栈：具体版本号，而不仅仅是名称
- 架构：包含来自权威来源的实际代码示例
- 不要自己造轮子：明确说明哪些问题不要自己解决
- 陷阱：包含预警信号，而不仅仅是"不要这样做"
- 来源：诚实标注置信度等级

**与规划的集成：**
- RESEARCH.md 作为 PLAN.md 中的 @context 引用加载
- 标准技术栈指导库的选择
- "不要自己造轮子"防止自定义解决方案
- 陷阱为验证标准提供信息
- 代码示例可在任务操作中引用

**创建之后：**
- 文件位于阶段目录中：`.planning/phases/XX-name/{phase_num}-RESEARCH.md`
- 在规划工作流程中被引用
- plan-phase 在文件存在时自动加载它

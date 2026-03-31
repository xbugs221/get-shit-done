# 编码约定模板

用于 `.planning/codebase/CONVENTIONS.md` 的模板 - 记录编码风格和模式。

**目的：** 记录此代码库中代码的编写方式。为 Claude 匹配现有风格提供规范性指南。

---

## 文件模板

```markdown
# 编码约定

**分析日期：** [YYYY-MM-DD]

## 命名模式

**文件：**
- [模式：例如 "所有文件使用 kebab-case"]
- [测试文件：例如 "*.test.ts 与源文件放在一起"]
- [组件：例如 "PascalCase.tsx 用于 React 组件"]

**函数：**
- [模式：例如 "所有函数使用 camelCase"]
- [异步：例如 "异步函数无特殊前缀"]
- [处理器：例如 "handleEventName 用于事件处理器"]

**变量：**
- [模式：例如 "变量使用 camelCase"]
- [常量：例如 "常量使用 UPPER_SNAKE_CASE"]
- [私有：例如 "私有成员使用 _前缀" 或 "无前缀"]

**类型：**
- [接口：例如 "PascalCase，无 I 前缀"]
- [类型：例如 "类型别名使用 PascalCase"]
- [枚举：例如 "枚举名使用 PascalCase，值使用 UPPER_CASE"]

## 代码风格

**格式化：**
- [工具：例如 "Prettier，配置在 .prettierrc 中"]
- [行长度：例如 "最大 100 个字符"]
- [引号：例如 "字符串使用单引号"]
- [分号：例如 "必须" 或 "省略"]

**代码检查：**
- [工具：例如 "ESLint，配置在 eslint.config.js 中"]
- [规则：例如 "继承 airbnb-base，生产代码中无 console"]
- [运行：例如 "npm run lint"]

## 导入组织

**顺序：**
1. [例如 "外部包（react、express 等）"]
2. [例如 "内部模块（@/lib、@/components）"]
3. [例如 "相对导入（.、..）"]
4. [例如 "类型导入（import type {}）"]

**分组：**
- [空行：例如 "组之间空一行"]
- [排序：例如 "每组内按字母排序"]

**路径别名：**
- [使用的别名：例如 "@/ 对应 src/、@components/ 对应 src/components/"]

## 错误处理

**模式：**
- [策略：例如 "抛出错误，在边界处捕获"]
- [自定义错误：例如 "继承 Error 类，命名为 *Error"]
- [异步：例如 "使用 try/catch，不使用 .catch() 链"]

**错误类型：**
- [何时抛出：例如 "无效输入、缺少依赖"]
- [何时返回：例如 "预期的失败返回 Result<T, E>"]
- [日志记录：例如 "抛出前记录带上下文的错误日志"]

## 日志记录

**框架：**
- [工具：例如 "console.log、pino、winston"]
- [级别：例如 "debug、info、warn、error"]

**模式：**
- [格式：例如 "带上下文对象的结构化日志"]
- [何时：例如 "记录状态转换、外部调用"]
- [何处：例如 "在服务边界记录，不在工具函数中"]

## 注释

**何时注释：**
- [例如 "解释为什么，而不是什么"]
- [例如 "记录业务逻辑、算法、边缘情况"]
- [例如 "避免显而易见的注释，如 // 计数器递增"]

**JSDoc/TSDoc：**
- [使用：例如 "公共 API 必须有，内部可选"]
- [格式：例如 "使用 @param、@returns、@throws 标签"]

**TODO 注释：**
- [模式：例如 "// TODO(username): 描述"]
- [跟踪：例如 "如有可用，链接到 issue 编号"]

## 函数设计

**大小：**
- [例如 "保持在 50 行以内，提取辅助函数"]

**参数：**
- [例如 "最多 3 个参数，更多时使用对象"]
- [例如 "在参数列表中解构对象"]

**返回值：**
- [例如 "显式返回，不使用隐式 undefined"]
- [例如 "对保护子句使用提前返回"]

## 模块设计

**导出：**
- [例如 "优先使用命名导出，默认导出仅用于 React 组件"]
- [例如 "从 index.ts 导出公共 API"]

**桶文件：**
- [例如 "使用 index.ts 重新导出公共 API"]
- [例如 "避免循环依赖"]

---

*约定分析：[日期]*
*在模式变更时更新*
```

<good_examples>
```markdown
# 编码约定

**分析日期：** 2025-01-20

## 命名模式

**文件：**
- 所有文件使用 kebab-case（command-handler.ts、user-service.ts）
- *.test.ts 与源文件放在一起
- index.ts 用于桶导出

**函数：**
- 所有函数使用 camelCase
- 异步函数无特殊前缀
- handleEventName 用于事件处理器（handleClick、handleSubmit）

**变量：**
- 变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE（MAX_RETRIES、API_BASE_URL）
- 无下划线前缀（TS 中无私有标记）

**类型：**
- 接口使用 PascalCase，无 I 前缀（User，不是 IUser）
- 类型别名使用 PascalCase（UserConfig、ResponseData）
- 枚举名使用 PascalCase，值使用 UPPER_CASE（Status.PENDING）

## 代码风格

**格式化：**
- Prettier，配置在 .prettierrc 中
- 100 字符行长度
- 字符串使用单引号
- 必须使用分号
- 2 空格缩进

**代码检查：**
- ESLint，配置在 eslint.config.js 中
- 继承 @typescript-eslint/recommended
- 生产代码中禁止 console.log（使用 logger）
- 运行：npm run lint

## 导入组织

**顺序：**
1. 外部包（react、express、commander）
2. 内部模块（@/lib、@/services）
3. 相对导入（./utils、../types）
4. 类型导入（import type { User }）

**分组：**
- 组之间空一行
- 每组内按字母排序
- 类型导入在每组末尾

**路径别名：**
- @/ 映射到 src/
- 无其他别名定义

## 错误处理

**模式：**
- 抛出错误，在边界处捕获（路由处理器、主函数）
- 继承 Error 类用于自定义错误（ValidationError、NotFoundError）
- 异步函数使用 try/catch，不使用 .catch() 链

**错误类型：**
- 在无效输入、缺少依赖、不变量违反时抛出
- 抛出前记录带上下文的错误日志：logger.error({ err, userId }, 'Failed to process')
- 在错误消息中包含原因：new Error('Failed to X', { cause: originalError })

## 日志记录

**框架：**
- pino 日志器实例从 lib/logger.ts 导出
- 级别：debug、info、warn、error（无 trace）

**模式：**
- 带上下文的结构化日志：logger.info({ userId, action }, 'User action')
- 在服务边界记录，不在工具函数中
- 记录状态转换、外部 API 调用、错误
- 提交的代码中禁止 console.log

## 注释

**何时注释：**
- 解释为什么，而不是什么：// 重试 3 次因为 API 有瞬态故障
- 记录业务规则：// 用户必须在 24 小时内验证邮箱
- 解释不明显的算法或变通方案
- 避免显而易见的注释：// 将 count 设为 0

**JSDoc/TSDoc：**
- 公共 API 函数必须有
- 如果函数签名自解释，内部函数可选
- 使用 @param、@returns、@throws 标签

**TODO 注释：**
- 格式：// TODO: 描述（无用户名，使用 git blame）
- 如存在则链接到 issue：// TODO: 修复竞态条件（issue #123）

## 函数设计

**大小：**
- 保持在 50 行以内
- 提取辅助函数处理复杂逻辑
- 每个函数一个抽象层次

**参数：**
- 最多 3 个参数
- 4 个以上参数使用选项对象：function create(options: CreateOptions)
- 在参数列表中解构：function process({ id, name }: ProcessParams)

**返回值：**
- 显式 return 语句
- 对保护子句使用提前返回
- 对预期失败使用 Result<T, E> 类型

## 模块设计

**导出：**
- 优先使用命名导出
- 默认导出仅用于 React 组件
- 从 index.ts 桶文件导出公共 API

**桶文件：**
- index.ts 重新导出公共 API
- 保持内部辅助函数私有（不从 index 导出）
- 避免循环依赖（如需要从具体文件导入）

---

*约定分析：2025-01-20*
*在模式变更时更新*
```
</good_examples>

<guidelines>
**CONVENTIONS.md 中应包含的内容：**
- 在代码库中观察到的命名模式
- 格式化规则（Prettier 配置、代码检查规则）
- 导入组织模式
- 错误处理策略
- 日志记录方法
- 注释约定
- 函数和模块设计模式

**不应包含在此处的内容：**
- 架构决策（那是 ARCHITECTURE.md 的内容）
- 技术选型（那是 STACK.md 的内容）
- 测试模式（那是 TESTING.md 的内容）
- 文件组织（那是 STRUCTURE.md 的内容）

**填写此模板时：**
- 检查 .prettierrc、.eslintrc 或类似配置文件
- 检查 5-10 个代表性源文件了解模式
- 寻找一致性：如果 80%+ 遵循某个模式，就记录它
- 使用规范性语气："使用 X" 而不是 "有时使用 Y"
- 记录偏差："遗留代码使用 Y，新代码应使用 X"
- 总计保持在约 150 行以内

**在以下情况下对阶段规划有用：**
- 编写新代码（匹配现有风格）
- 添加功能（遵循命名模式）
- 重构（应用一致的约定）
- 代码审查（对照记录的模式检查）
- 入门指引（了解风格期望）

**分析方法：**
- 扫描 src/ 目录了解文件命名模式
- 检查 package.json scripts 中的 lint/format 命令
- 阅读 5-10 个文件识别函数命名、错误处理
- 查找配置文件（.prettierrc、eslint.config.js）
- 记录导入、注释、函数签名中的模式
</guidelines>

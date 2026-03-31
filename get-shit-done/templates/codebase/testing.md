# 测试模式模板

用于 `.planning/codebase/TESTING.md` 的模板 - 记录测试框架和模式。

**目的：** 记录测试如何编写和运行。用于添加与现有模式匹配的测试的指南。

---

## 文件模板

```markdown
# 测试模式

**分析日期：** [YYYY-MM-DD]

## 测试框架

**运行器：**
- [框架：例如 "Jest 29.x"、"Vitest 1.x"]
- [配置：例如 "项目根目录中的 jest.config.js"]

**断言库：**
- [库：例如 "内置 expect"、"chai"]
- [匹配器：例如 "toBe、toEqual、toThrow"]

**运行命令：**
```bash
[例如 "npm test" 或 "npm run test"]              # 运行所有测试
[例如 "npm test -- --watch"]                     # 监视模式
[例如 "npm test -- path/to/file.test.ts"]       # 单个文件
[例如 "npm run test:coverage"]                   # 覆盖率报告
```

## 测试文件组织

**位置：**
- [模式：例如 "*.test.ts 与源文件放在一起"]
- [替代方式：例如 "__tests__/ 目录" 或 "独立的 tests/ 目录树"]

**命名：**
- [单元测试：例如 "module-name.test.ts"]
- [集成测试：例如 "feature-name.integration.test.ts"]
- [端到端测试：例如 "user-flow.e2e.test.ts"]

**结构：**
```
[展示实际目录模式，例如：
src/
  lib/
    utils.ts
    utils.test.ts
  services/
    user-service.ts
    user-service.test.ts
]
```

## 测试结构

**测试套件组织：**
```typescript
[展示实际使用的模式，例如：

describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle success case', () => {
      // 准备
      // 执行
      // 断言
    });

    it('should handle error case', () => {
      // 测试代码
    });
  });
});
]
```

**模式：**
- [设置：例如 "beforeEach 用于共享设置，避免 beforeAll"]
- [清理：例如 "afterEach 用于清理，恢复 mock"]
- [结构：例如 "要求使用准备/执行/断言模式"]

## Mock

**框架：**
- [工具：例如 "Jest 内置 mock"、"Vitest vi"、"Sinon"]
- [导入 mock：例如 "vi.mock() 在文件顶部"]

**模式：**
```typescript
[展示实际的 mock 模式，例如：

// Mock 外部依赖
vi.mock('./external-service', () => ({
  fetchData: vi.fn()
}));

// 在测试中使用 mock
const mockFetch = vi.mocked(fetchData);
mockFetch.mockResolvedValue({ data: 'test' });
]
```

**需要 mock 的内容：**
- [例如 "外部 API、文件系统、数据库"]
- [例如 "时间/日期（使用 vi.useFakeTimers）"]
- [例如 "网络调用（使用 mock fetch）"]

**不需要 mock 的内容：**
- [例如 "纯函数、工具函数"]
- [例如 "内部业务逻辑"]

## 装置和工厂

**测试数据：**
```typescript
[展示创建测试数据的模式，例如：

// 工厂模式
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  };
}

// 装置文件
// tests/fixtures/users.ts
export const mockUsers = [/* ... */];
]
```

**位置：**
- [例如 "tests/fixtures/ 用于共享装置"]
- [例如 "工厂函数在测试文件中或 tests/factories/"]

## 覆盖率

**要求：**
- [目标：例如 "80% 行覆盖率"、"没有具体目标"]
- [执行：例如 "CI 在 <80% 时阻塞"、"覆盖率仅供参考"]

**配置：**
- [工具：例如 "通过 --coverage 标志的内置覆盖率"]
- [排除：例如 "排除 *.test.ts、配置文件"]

**查看覆盖率：**
```bash
[例如 "npm run test:coverage"]
[例如 "open coverage/index.html"]
```

## 测试类型

**单元测试：**
- [范围：例如 "隔离测试单个函数/类"]
- [mock：例如 "mock 所有外部依赖"]
- [速度：例如 "每个测试必须在 <1s 内运行"]

**集成测试：**
- [范围：例如 "一起测试多个模块"]
- [mock：例如 "mock 外部服务，使用真实的内部模块"]
- [设置：例如 "使用测试数据库，填充数据"]

**端到端测试：**
- [框架：例如 "Playwright 用于端到端测试"]
- [范围：例如 "测试完整的用户流程"]
- [位置：例如 "e2e/ 目录与单元测试分开"]

## 常用模式

**异步测试：**
```typescript
[展示模式，例如：

it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
]
```

**错误测试：**
```typescript
[展示模式，例如：

it('should throw on invalid input', () => {
  expect(() => functionCall()).toThrow('error message');
});

// 异步错误
it('should reject on failure', async () => {
  await expect(asyncCall()).rejects.toThrow('error message');
});
]
```

**快照测试：**
- [用法：例如 "仅用于 React 组件" 或 "未使用"]
- [位置：例如 "__snapshots__/ 目录"]

---

*测试分析：[日期]*
*在测试模式变更时更新*
```

<good_examples>
```markdown
# 测试模式

**分析日期：** 2025-01-20

## 测试框架

**运行器：**
- Vitest 1.0.4
- 配置：项目根目录中的 vitest.config.ts

**断言库：**
- Vitest 内置 expect
- 匹配器：toBe、toEqual、toThrow、toMatchObject

**运行命令：**
```bash
npm test                              # 运行所有测试
npm test -- --watch                   # 监视模式
npm test -- path/to/file.test.ts     # 单个文件
npm run test:coverage                 # 覆盖率报告
```

## 测试文件组织

**位置：**
- *.test.ts 与源文件放在一起
- 没有独立的 tests/ 目录

**命名：**
- unit-name.test.ts 用于所有测试
- 文件名中不区分单元/集成测试

**结构：**
```
src/
  lib/
    parser.ts
    parser.test.ts
  services/
    install-service.ts
    install-service.test.ts
  bin/
    install.ts
    （没有测试 - 通过 CLI 进行集成测试）
```

## 测试结构

**测试套件组织：**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ModuleName', () => {
  describe('functionName', () => {
    beforeEach(() => {
      // 重置状态
    });

    it('should handle valid input', () => {
      // 准备
      const input = createTestInput();

      // 执行
      const result = functionName(input);

      // 断言
      expect(result).toEqual(expectedOutput);
    });

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow('Invalid input');
    });
  });
});
```

**模式：**
- 使用 beforeEach 进行每个测试的设置，避免 beforeAll
- 使用 afterEach 恢复 mock：vi.restoreAllMocks()
- 在复杂测试中使用显式的准备/执行/断言注释
- 每个测试聚焦一个断言点（但可以有多个 expect）

## Mock

**框架：**
- Vitest 内置 mock（vi）
- 通过 vi.mock() 在测试文件顶部进行模块 mock

**模式：**
```typescript
import { vi } from 'vitest';
import { externalFunction } from './external';

// Mock 模块
vi.mock('./external', () => ({
  externalFunction: vi.fn()
}));

describe('test suite', () => {
  it('mocks function', () => {
    const mockFn = vi.mocked(externalFunction);
    mockFn.mockReturnValue('mocked result');

    // 使用 mock 函数的测试代码

    expect(mockFn).toHaveBeenCalledWith('expected arg');
  });
});
```

**需要 mock 的内容：**
- 文件系统操作（fs-extra）
- 子进程执行（child_process.exec）
- 外部 API 调用
- 环境变量（process.env）

**不需要 mock 的内容：**
- 内部纯函数
- 简单工具函数（字符串操作、数组辅助函数）
- TypeScript 类型

## 装置和工厂

**测试数据：**
```typescript
// 测试文件中的工厂函数
function createTestConfig(overrides?: Partial<Config>): Config {
  return {
    targetDir: '/tmp/test',
    global: false,
    ...overrides
  };
}

// tests/fixtures/ 中的共享装置
// tests/fixtures/sample-command.md
export const sampleCommand = `---
description: Test command
---
Content here`;
```

**位置：**
- 工厂函数：在测试文件中靠近使用处定义
- 共享装置：tests/fixtures/（用于多文件测试数据）
- Mock 数据：简单时内联在测试中，复杂时使用工厂

## 覆盖率

**要求：**
- 没有强制的覆盖率目标
- 覆盖率仅供参考
- 聚焦于关键路径（解析器、服务逻辑）

**配置：**
- Vitest 通过 c8 提供覆盖率（内置）
- 排除：*.test.ts、bin/install.ts、配置文件

**查看覆盖率：**
```bash
npm run test:coverage
open coverage/index.html
```

## 测试类型

**单元测试：**
- 隔离测试单个函数
- Mock 所有外部依赖（fs、child_process）
- 快速：每个测试 <100ms
- 示例：parser.test.ts、validator.test.ts

**集成测试：**
- 一起测试多个模块
- 仅 mock 外部边界（文件系统、进程）
- 示例：install-service.test.ts（测试 service + parser）

**端到端测试：**
- 目前未使用
- CLI 集成通过手动测试

## 常用模式

**异步测试：**
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**错误测试：**
```typescript
it('should throw on invalid input', () => {
  expect(() => parse(null)).toThrow('Cannot parse null');
});

// 异步错误
it('should reject on file not found', async () => {
  await expect(readConfig('invalid.txt')).rejects.toThrow('ENOENT');
});
```

**文件系统 mock：**
```typescript
import { vi } from 'vitest';
import * as fs from 'fs-extra';

vi.mock('fs-extra');

it('mocks file system', () => {
  vi.mocked(fs.readFile).mockResolvedValue('file content');
  // 测试代码
});
```

**快照测试：**
- 本代码库中未使用
- 优先使用显式断言以保持清晰

---

*测试分析：2025-01-20*
*在测试模式变更时更新*
```
</good_examples>

<guidelines>
**TESTING.md 中应包含的内容：**
- 测试框架和运行器配置
- 测试文件位置和命名模式
- 测试结构（describe/it、beforeEach 模式）
- Mock 方法和示例
- 装置/工厂模式
- 覆盖率要求
- 如何运行测试（命令）
- 实际代码中的常见测试模式

**不应包含在此处的内容：**
- 具体测试用例（留给实际测试文件）
- 技术选型（那是 STACK.md 的内容）
- CI/CD 设置（那是部署文档的内容）

**填写此模板时：**
- 检查 package.json scripts 中的测试命令
- 找到测试配置文件（jest.config.js、vitest.config.ts）
- 阅读 3-5 个现有测试文件以识别模式
- 查找 tests/ 或 test-utils/ 中的测试工具
- 检查覆盖率配置
- 记录实际使用的模式，而非理想模式

**在以下情况下对阶段规划有用：**
- 添加新功能（编写匹配的测试）
- 重构（保持测试模式）
- 修复缺陷（添加回归测试）
- 了解验证方法
- 搭建测试基础设施

**分析方法：**
- 检查 package.json 中的测试框架和脚本
- 阅读测试配置文件了解覆盖率、设置
- 检查测试文件组织（共存式 vs 分离式）
- 审查 5 个测试文件了解模式（mock、结构、断言）
- 查找测试工具、装置、工厂
- 记录所有测试类型（单元、集成、端到端）
- 记录运行测试的命令
</guidelines>

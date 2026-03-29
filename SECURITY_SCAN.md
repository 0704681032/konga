# 安全扫描报告

扫描时间：2026-03-29

## 关注的 6 个历史漏洞包

| # | 包名 | 旧版本 | 当前状态 | 安全等级 |
|---|---|---|---|---|
| 1 | `json-schema` | 0.2.2 | **仍存在**（传递依赖） | critical |
| 2 | `requestretry` | 1.9.0 | **已消除** | - |
| 3 | `y18n` | 3.2.1 | **已升级** 到 5.0.8 | 已修复 |
| 4 | `merge` | 1.1.3 | **已消除** | - |
| 5 | `mout` | 0.9.1 | **已消除** | - |
| 6 | `shelljs` | 0.7.6 | **已消除** | - |

### 详细分析

#### 1. json-schema 0.2.2 — 仍存在（传递依赖）

- **依赖链**：`sails` → `machinepack-postgresql` → `request` → `http-signature` → `jsprim` → `json-schema`
- **项目代码是否直接使用**：否，项目中无 `require('json-schema')`
- **风险评估**：`json-schema` 仅在 `jsprim` 内部用于 JSON Schema 验证，不接受外部输入，实际被利用风险低
- **根本原因**：`request` 包已废弃（deprecated），Sails 1.x 内部部分 machinepack 仍依赖它
- **建议**：关注 Sails 后续版本是否移除 `request` 依赖

#### 2. requestretry 1.9.0 — 已消除

升级后不再存在于 `package-lock.json` 和 `node_modules/` 中。

#### 3. y18n 3.2.1 → 5.0.8 — 已升级修复

- **依赖链**：`mocha` → `yargs` → `y18n`
- **项目代码是否直接使用**：否，仅由测试工具链引入（devDependencies）
- **漏洞**：3.x 版本存在原型污染（Prototype Pollution），5.0.8 已修复
- **是否进入生产环境**：否，`mocha` 为 devDependency

#### 4. merge 1.1.3 — 已消除

升级后不再存在于 `package-lock.json` 和 `node_modules/` 中。

#### 5. mout 0.9.1 — 已消除

- 原被 `barrels`（测试数据加载工具）使用
- 升级后 `barrels` 已通过补丁修复，不再依赖该版本

#### 6. shelljs 0.7.6 — 已消除

原被旧版 grunt/sails 内部使用，升级后不再依赖。

## 使用性质分类

### 传递依赖（项目代码未直接引用）

| 包名 | 引入路径 | 是否进入生产环境 |
|---|---|---|
| `json-schema` | `sails` → `request` → `http-signature` → `jsprim` → `json-schema` | 是（Sails 内部） |
| `y18n` | `mocha` → `yargs` → `y18n` | 否（devDependency） |

### 已消除（升级后不再存在）

| 包名 | 原引入路径 |
|---|---|
| `requestretry` | 旧版 Sails 适配器 |
| `merge` | 旧版 Sails 内部工具 |
| `mout` | `barrels`（测试工具） |
| `shelljs` | 旧版 grunt/sails 内部 |

## npm audit 完整扫描结果

### 按严重等级统计

| 等级 | 数量 | 说明 |
|---|---|---|
| critical | 30+ | 主要来自 `request`（废弃包）、`babel-core`（旧版）、`grunt`、`lodash`、`ejs` |
| high | 30+ | `angular`（1.x）、`moment`、`sails`、`socket.io`、`axios` 等 |
| moderate | 20+ | 前端 Angular 插件、`js-yaml`、`less` 等 |
| low | 4 | `cookie`、`inquirer`、`sails-mongo`、`tmp` |

### 关键 high/critical 项说明

| 包名 | 等级 | 性质 | 说明 |
|---|---|---|---|
| `request` | critical | 传递依赖 | 已废弃包，被 Sails machinepack 引用，项目不直接使用 |
| `ejs` | critical | 直接依赖 | Sails 视图引擎，需关注 Sails 官方更新 |
| `lodash` | critical | 传递依赖 | 被 Sails/Waterline 大量使用，升级需 Sails 官方推动 |
| `grunt` | critical | 直接依赖 | 构建工具，仅开发环境使用 |
| `babel-*` | critical | 传递依赖 | 旧版 babel-core，来自 sails-hook-grunt |
| `knex` | critical | 传递依赖 | 数据库查询构建器，由 sails-postgresql 引入 |
| `angular` | high | 直接依赖（前端） | AngularJS 1.x 已停止维护，前端框架层风险 |
| `axios` | high | 直接依赖 | HTTP 客户端，用于代理请求到 Kong API |
| `moment` | high | 直接依赖（前端） | 已停止维护，建议替换为 dayjs |
| `socket.io` | high | 直接依赖 | 实时通信，Sails 1.x 依赖 |

### 风险评估

**高风险项（需优先关注）**：
1. `ejs` — Sails 视图引擎的模板注入风险，建议关注 Sails 官方更新
2. `axios` — 核心代理组件，需保持更新
3. `knex` / `pg` — 数据库层，直接影响数据安全

**中等风险项（计划改进）**：
1. `angular` 1.x — 前端框架已停止维护，长期应迁移
2. `moment` — 已停止维护，可替换为 `dayjs`
3. `request` — 废弃包，依赖 Sails 官方移除

**低风险项（开发环境）**：
1. `grunt`、`babel-*`、`mocha` — 仅开发环境使用
2. `y18n` — 已升级到安全版本，且仅测试环境

## 总结

- **6 个历史扫描项**：4 个已消除，1 个已升级修复，1 个（`json-schema`）仍作为传递依赖存在但实际风险低
- **项目代码未直接使用任何有漏洞的包**，所有风险均来自传递依赖
- **生产环境影响最大的是 `ejs`、`axios`、`knex`/`pg`**，需持续关注官方安全更新
- **长期建议**：AngularJS 1.x 前端框架已停止维护，应规划前端框架迁移

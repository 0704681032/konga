# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

Konga 是 [Kong Admin API](https://getkong.org/) 的 Web 管理界面（兼容 Kong 1.x）。后端基于 **Sails.js 1.5.x**，前端基于 **AngularJS 1.5.x**。要求 Node.js 18 LTS。

## 常用命令

```bash
npm install              # 安装依赖
npm start                # 启动开发服务器 http://localhost:1337
npm run production       # 以生产模式启动（--prod）
npm test                 # 运行 mocha 测试（60s 超时，使用 chai + supertest）
grunt build              # 开发环境资源构建（sass、jst、copy、linker）
grunt buildProd          # 生产环境构建（concat、uglify、cssmin）
node ./bin/konga.js prepare -a postgres -u postgresql://...  # 生产环境数据库迁移
```

## 端到端验证步骤

升级或修改后，必须进行完整的端到端验证：

### 1. 后端 API 测试
```bash
npm test
```
确保所有 62 个测试通过。

### 2. 启动服务器
```bash
npm start
```
检查控制台输出，确保没有错误。

### 3. 浏览器验证
打开浏览器访问 http://localhost:1337

#### 3.1 检查控制台错误
- 打开浏览器开发者工具 (F12)
- 切换到 Console 标签
- 确保没有红色错误信息
- 特别注意 Angular 模块加载错误

#### 3.2 验证静态资源加载
- 在 Network 标签中检查所有 JS/CSS 文件是否返回 200
- 常见问题：`node_modules/` 下的文件返回 404
- 解决方法：运行 `grunt copy:dev sails-linker:devJs`

#### 3.3 注册管理员账户
- 如果是首次访问，会显示注册页面
- 创建管理员账户（用户名、邮箱、密码）

#### 3.4 登录验证
- 使用创建的账户登录
- 确保登录成功后跳转到仪表板
- 检查是否有 API 调用错误

### 4. 前端依赖问题排查

如果前端 JS 加载失败：

1. **检查 node_modules 复制**
   ```bash
   ls .tmp/public/node_modules/
   ```
   应该看到所有需要的包目录

2. **重新构建前端资源**
   ```bash
   rm -rf .tmp/public
   npx grunt copy:dev sails-linker:devJs sails-linker:devStyles
   ```

3. **检查 Angular 模块名**
   - `assets/js/app/core/dependencies/dependencies.js` 中的模块名必须与 npm 包导出的模块名一致
   - 例如：`ngSails` 不是 `sails.io`

4. **检查 JS 文件路径**
   - `tasks/pipeline.js` 中的路径必须正确
   - npm 包的 JS 文件可能在 `dist/` 子目录下

## 架构

### 启动流程
`app.js` → 通过 dotenv 加载 `.env` → 校验 Node 版本 → 执行 `makedb/` 进行数据库初始化/迁移 → `sails.lift()` 启动服务器。

### 后端 (Sails.js 1.5.x)
- **`api/controllers/`** — 路由处理器，按 Kong API 对象组织（KongServices、KongRoutes、KongConsumers、KongPlugins 等）
- **`api/models/`** — Waterline ORM 模型。多数模型包含 `seed()` 方法用于初始数据填充，以及 `updateOrCreate` 用于 upsert 操作。迁移策略：`alter`。
- **`api/services/`** — 共享业务逻辑。`Utils.js` 提供全局使用的校验工具函数。
- **`api/policies/`** — 鉴权与访问控制（基于 JWT 和 Session）。在 `config/policies.js` 中按路由配置。
- **`api/responses/`** — 自定义 Sails 响应辅助方法（如 `ok`、`notFound`、`serverError`）。

### 前端 (AngularJS 1.5.x)
- **`assets/js/app/`** — Angular 应用，按功能模块组织：`frontend.dashboard`、`frontend.consumers`、`frontend.plugins`、`frontend.services`、`frontend.routes`、`frontend.certificates`、`frontend.snapshots`、`frontend.cluster`、`frontend.healthchecks`。
- 使用 UI Router 做路由、Angular Bootstrap 做 UI 组件、Socket.io 做实时更新、AngularSails 做数据同步。
- **`assets/styles/`** — Sass 样式文件（Bootstrap + Paper 主题）。
- Grunt 编译资源并通过 `grunt-sails-linker` 自动注入到 EJS 模板中。

### 数据库支持
通过 Waterline ORM 支持多种数据库适配器：localDiskDb（开发默认）、MySQL、PostgreSQL、MongoDB、SQL Server。通过环境变量配置（`DB_ADAPTER`、`DB_URI`，或单独设置 `DB_HOST`/`DB_PORT` 等）。

### 关键配置
- **`config/`** — Sails 标准配置（路由、策略、数据库连接、模型等）
- **`config/env/`** — 按环境覆盖配置（development.js、production.js）
- **`.env`** — 运行时配置（从 `.env_example` 复制）。主要变量：`PORT`、`NODE_ENV`、`DB_ADAPTER`、`DB_URI`、`TOKEN_SECRET`、`KONGA_HOOK_TIMEOUT`。

### 测试
- 测试框架：Mocha + Chai + Supertest
- `test/bootstrap.test.js` — 测试启动前先 lift Sails
- `test/fixtures/` — 测试数据（由 Barrels 加载）
- `test/functional/` — 按功能分组的集成测试

## Sails 1.x 迁移注意事项

本项目已从 Sails 0.12.x 迁移到 Sails 1.5.x。主要变化：

### API 变化
- `req.param()` → 使用 `req.params`、`req.body`、`req.query`
- `req.socket` → 直接使用 `req`
- `connection` → `datastore`
- 模型 `enum` → `isIn` 验证规则
- `type: 'email'` → `type: 'string'` + `isEmail: true`

### 生命周期回调
- `afterDestroy(values, cb)` 中 `values` 是单个记录而非数组
- `update()` 返回数组，需用 `.meta({fetch: true})` 获取更新后的记录

### Blueprint 行为
- `findOne` 找不到记录时返回空而非 404，需要自定义 action
- `count` action 需要自定义实现

### 前端依赖
- Bower 已移除，改用 npm 管理前端依赖
- `tasks/pipeline.js` 中的 `nodeModulesToCopy` 控制要复制的包
- 注意 npm 包的模块名和文件路径可能与 bower 包不同
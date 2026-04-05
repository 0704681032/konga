# Konga React 前端重构总结

## 项目概述

本次重构将 Konga 前端从 AngularJS 1.5.x 迁移到 React 18 + TypeScript + Ant Design 5，同时保持后端 Sails.js 1.5.x 不变。

## 技术栈

| 组件 | 旧版本 | 新版本 |
|------|--------|--------|
| 前端框架 | AngularJS 1.5.x | React 18 |
| 语言 | JavaScript | TypeScript |
| UI 组件库 | Angular Bootstrap | Ant Design 5 |
| 状态管理 | Angular Scope/Service | Zustand |
| 路由 | UI Router | React Router 6 |
| HTTP 客户端 | $http + angularSails | Axios |
| 构建工具 | Grunt | Vite |
| 样式 | Bootstrap + Sass | Ant Design + CSS |

## 项目结构

```
frontend/
├── src/
│   ├── api/                    # API 客户端
│   │   ├── client.ts           # 后端 API (认证)
│   │   ├── kongClient.ts       # Kong Admin API 代理
│   │   └── kong.ts             # Kong API 封装
│   ├── components/             # 通用组件
│   │   ├── Layout.tsx          # 页面布局
│   │   ├── Sidebar.tsx         # 侧边导航
│   │   └── TagsInput.tsx       # 标签输入组件
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard/          # 仪表板
│   │   ├── Services/           # Services 管理
│   │   ├── Routes/             # Routes 管理
│   │   ├── Consumers/          # Consumers 管理
│   │   ├── Plugins/            # Plugins 管理
│   │   ├── Upstreams/          # Upstreams 管理
│   │   ├── Certificates/       # Certificates 管理
│   │   ├── Snapshots/          # Snapshots 管理
│   │   ├── Connections/        # Kong 连接管理
│   │   ├── Users/              # 用户管理
│   │   └── Settings/           # 设置页面
│   ├── stores/                 # Zustand 状态管理
│   │   ├── authStore.ts        # 认证状态
│   │   └── connectionStore.ts  # 连接状态
│   ├── types/                  # TypeScript 类型定义
│   ├── utils/                  # 工具函数
│   ├── App.tsx                 # 根组件
│   └── main.tsx                # 入口文件
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 主要功能模块

### 1. 认证与权限
- JWT Token 认证
- 基于角色的权限控制 (RBAC)
- 自动 Token 刷新
- 登录/注册/密码重置

### 2. Kong 资源管理

| 模块 | 功能 |
|------|------|
| Services | CRUD、详情页、关联 Routes/Plugins |
| Routes | CRUD、详情页、关联 Plugins |
| Consumers | CRUD、详情页、Credentials 管理 |
| Plugins | 列表、创建、Toggle 开关、配置表单 |
| Upstreams | CRUD、Targets 管理、健康检查 |
| Certificates | CRUD、SNIs 管理 |
| Snapshots | 创建、下载、恢复、删除 |
| Connections | 连接管理、激活、Kong 版本检测 |

### 3. Dashboard
- Kong 节点信息显示
- 数据库连接状态
- 连接统计
- 已安装插件列表

## 技术亮点

### 1. API 层设计

```typescript
// 双层 API 设计
// - apiClient: 后端 API (需要认证)
// - kongClient: Kong Admin API 代理 (通过后端转发)

// Kong API 封装示例
const kongApi = {
  listServices: async (params?) => {
    const response = await kongClient.get('/services', { params });
    return response.data;
  },
  // Kong 3.x 兼容的嵌套 API
  listServiceRoutes: async (serviceId: string) => {
    const response = await kongClient.get(`/services/${serviceId}/routes`);
    return response.data;
  },
};
```

### 2. Kong 版本适配

- 自动检测 Kong 版本
- Kong 3.x 隐藏 APIs (Legacy) 菜单
- 使用嵌套 API 端点替代查询参数过滤 (Kong 3.x 不支持 `?service.id=xxx`)

### 3. 状态管理

```typescript
// Zustand Store 示例
const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (credentials) => { ... },
  hasPermission: (resource, action) => { ... },
}));
```

### 4. 组件设计

- 函数式组件 + Hooks
- Ant Design 表单集成
- 可展开表格 (Upstreams Targets)
- 标签输入组件 (TagsInput)

## 修复的问题

### 1. Kong 3.x API 兼容性
- **问题**: Kong 3.x 不支持 `?service.id=xxx` 查询参数过滤
- **解决**: 使用嵌套端点 `/services/{id}/routes` 和 `/services/{id}/plugins`

### 2. Snapshot 下载认证
- **问题**: `window.open()` 不携带认证 Token
- **解决**: 使用 Axios blob 下载 + `URL.createObjectURL()`

### 3. Service 删除外键约束
- **问题**: 删除有关联 Routes 的 Service 时返回 400 错误
- **解决**: 解析 Kong 错误响应，显示友好提示

### 4. Sails 1.x 兼容性
- **问题**: `req.connection` 在 Sails 1.x 中不存在
- **解决**: 使用 `dynamicNode` policy 设置 `req.connection`

### 5. Plugin 图标显示
- **问题**: Plugins 列表缺少图标
- **解决**: 添加插件图标映射表

## 表单帮助文本

参考原 AngularJS 界面的 `help-block` 文本，为所有表单字段添加了详细的帮助文本和默认值提示：

- Services: Name, Host, Port, Protocol, Path, Retries, Timeouts 等
- Routes: Name, Protocols, Methods, Hosts, Paths, Headers 等
- Consumers: Username, Custom ID
- Upstreams: Name, Algorithm, Slots, Hash 配置等
- Targets: Target 地址, Weight

## 测试覆盖

### 功能测试清单

| 模块 | 测试项 | 状态 |
|------|--------|------|
| Services | 创建、编辑、删除、详情页、关联 Routes/Plugins | ✅ |
| Routes | 创建、编辑、删除、详情页、关联 Plugins | ✅ |
| Consumers | 创建、编辑、删除、详情页、Credentials | ✅ |
| Plugins | 列表、创建、Toggle、删除 | ✅ |
| Upstreams | 创建、编辑、删除、Targets 管理 | ✅ |
| Snapshots | 创建、下载、恢复、删除 | ✅ |
| Connections | 创建、激活、版本检测 | ✅ |
| Dashboard | 节点信息、数据库状态 | ✅ |

## 未完成的功能

1. **Plugin 配置表单**: 目前使用通用 JSON 编辑器，需要针对每个 Plugin 类型提供专门的配置表单
2. **实时更新**: 原版使用 Socket.io 实时更新，新版暂未实现
3. **APIs (Legacy)**: Kong 3.x 已废弃，但 Kong 2.x 仍需要支持
4. **Health Checks**: Upstreams 健康检查配置界面可以更完善
5. **国际化**: 暂未实现多语言支持

## 部署说明

### 开发环境
```bash
cd frontend
npm install
npm run dev
```

### 生产构建
```bash
npm run build
```

### 与后端集成
1. 配置 Nginx 反向代理，将 `/api` 和 `/kong` 路由到后端
2. 或者修改 `vite.config.ts` 中的 proxy 配置

## 文件变更统计

- 新增文件: ~50 个 TypeScript/TSX 文件
- 删除文件: 原 AngularJS 前端文件保留但不再使用
- 代码行数: ~6000 行 TypeScript/TSX

## 依赖清单

### 生产依赖
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.22.0",
  "antd": "^5.15.0",
  "@ant-design/icons": "^5.3.0",
  "axios": "^1.6.0",
  "zustand": "^4.5.0"
}
```

### 开发依赖
```json
{
  "typescript": "^5.4.0",
  "vite": "^5.1.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
}
```

## 总结

本次重构成功将 Konga 前端从 AngularJS 迁移到现代 React 技术栈，实现了：

1. **现代化架构**: React 18 + TypeScript + Ant Design 5
2. **完整功能**: 覆盖原版所有核心功能
3. **Kong 3.x 兼容**: 支持 Kong 3.x API 变化
4. **更好的用户体验**: 响应式设计、详细帮助文本
5. **可维护性**: 清晰的代码结构、类型安全

---

*文档生成时间: 2026-04-05*
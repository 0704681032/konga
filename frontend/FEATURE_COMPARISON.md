---
name: React vs AngularJS Feature Comparison
description: Detailed button-level comparison of React frontend vs original AngularJS implementation
type: project
---

# Konga React vs AngularJS 功能对比分析

## 一、已完成的功能 (✅)

### Plugins 页面
- ✅ Toggle Switch 一键启用/禁用
- ✅ Raw View 按钮 (查看 JSON 原始数据)
- ✅ Context 列显示 (Global/Service/Route/Consumer)
- ✅ 关联实体跳转链接
- ✅ 动态 Schema 配置表单
- ✅ 支持嵌套 record/table 类型配置

### Services 详情页
- ✅ Details Tab (服务基本信息编辑)
- ✅ Routes Tab (显示关联路由, Add Route 按钮)
- ✅ Plugins Tab (显示服务插件, Toggle 开关)
- ✅ Raw View 按钮
- ✅ 点击服务名跳转到详情页

### Routes 详情页
- ✅ Details Tab (路由基本信息编辑)
- ✅ Plugins Tab (显示路由插件)
- ✅ Raw View 按钮
- ✅ 点击路由名跳转到详情页

### Consumers 详情页
- ✅ Details Tab (消费者基本信息编辑)
- ✅ Groups Tab (ACL 分组管理, Add Group 按钮)
- ✅ Credentials Tab (凭证管理 - Key Auth/JWT/Basic Auth/OAuth2/HMAC)
- ✅ Services Tab (消费者可访问的服务)
- ✅ Plugins Tab (消费者专属插件)
- ✅ 点击消费者名跳转到详情页

### API 增强
- ✅ ACL Groups API (listAcls, createAcl, deleteAcl)
- ✅ Consumer Services API (getConsumerServices)
- ✅ Consumer Routes API (getConsumerRoutes)

---

## 二、仍缺失的功能 (❌)

### Services 详情页 - 部分缺失
- ❌ Consumers Tab (Eligible Consumers 列表)

### Routes 详情页 - 部分缺失
- ❌ Consumers Tab (Eligible Consumers 列表)

### Snapshots 页面
- ❌ Scheduled Tab (定时快照)
- ❌ Import from File 按钮
- ❌ View Details 按钮

### Certificates 页面
- ❌ View Details 按钮
- ❌ Tags 显示
- ❌ 单独的 Add SNI 功能

### APIs 模块 - Kong 旧版兼容
- ❌ 完全缺失 (Kong 0.x 版本兼容)

### Dashboard 页面
- ❌ Timers 图表
- ❌ Plugins 可用列表显示
- ❌ Cluster 面板

### Health Checks 页面
- ❌ 完全缺失

---

## 三、按钮级别对比汇总

| 页面 | AngularJS 按钮 | React 状态 |
|------|---------------|-----------|
| Services 详情 | Add Route | ✅ 已实现 |
| Services 详情 | Add Plugin | ✅ 已实现 |
| Services 详情 | Toggle Plugin | ✅ 已实现 |
| Services 详情 | Edit Route (from list) | ✅ 已实现 |
| Services 详情 | Delete Route (from list) | ✅ 已实现 |
| Services 详情 | View Eligible Consumers | ❌ 缺失 |
| Routes 详情 | Add Plugin | ✅ 已实现 |
| Routes 详情 | Toggle Plugin | ✅ 已实现 |
| Routes 详情 | View Eligible Consumers | ❌ 缺失 |
| Consumers 详情 | Add Group | ✅ 已实现 |
| Consumers 详情 | Manage Groups | ✅ 已实现 |
| Consumers 详情 | View Services & Plugins | ✅ 已实现 |
| Consumers 详情 | Add Consumer Plugin | ✅ 已实现 |
| Plugins 列表 | Toggle Switch (enable/disable) | ✅ 已实现 |
| Plugins 列表 | Raw View | ✅ 已实现 |
| Plugins 编辑 | Dynamic Config Form | ✅ 已实现 |
| Snapshots | Import from File | ❌ 缺失 |
| Snapshots | Scheduled Tab | ❌ 缺失 |
| Snapshots | View Details | ❌ 缺失 |
| Certificates | View Details | ❌ 缺失 |
| Certificates | Add SNI separately | ❌ 缺失 |
| APIs 全部 | All buttons | ❌ 整个模块缺失 |

---

## 四、已完成的核心功能文件

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/Plugins/index.tsx` | 增强的插件页面，支持动态配置表单 |
| `frontend/src/pages/Services/ServiceDetail.tsx` | 服务详情页，支持 Routes/Plugins Tabs |
| `frontend/src/pages/Routes/RouteDetail.tsx` | 路由详情页，支持 Plugins Tab |
| `frontend/src/pages/Consumers/ConsumerDetail.tsx` | 消费者详情页，支持 Groups/Credentials/Services/Plugins Tabs |
| `frontend/src/api/kong.ts` | 新增 ACL 和 Consumer Services API |
| `frontend/src/router.tsx` | 更新路由配置支持详情页 |

---

## 五、后续建议

### 可选实现 (低优先级)
1. Services/Routes 详情页 Consumers Tab - 需要复杂的 ACL 判断逻辑
2. Snapshots Scheduled Tab - 定时任务功能
3. APIs 模块 - Kong 0.x 旧版兼容，现代 Kong 不需要

### 不建议实现
1. Dashboard Timers 图表 - 非核心功能
2. Health Checks 页面 - 较少使用
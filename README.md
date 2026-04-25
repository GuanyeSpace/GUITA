# GUITA

归她（GUITA）Monorepo 工程骨架。当前阶段只初始化全栈 TypeScript 工作区，不包含登录、业务页面和 CRUD 逻辑。

## Notion 文档

- [文档 1：产品蓝图（占位）](https://www.notion.so/guanyespace/guita-doc-1)
- [文档 2：数据模型（占位）](https://www.notion.so/guanyespace/guita-doc-2)
- [文档 3：工程协作（占位）](https://www.notion.so/guanyespace/guita-doc-3)

## 技术栈

| 模块 | 技术 | 用途 |
| --- | --- | --- |
| Monorepo | pnpm Workspace + Turborepo | 多应用与共享包统一编排 |
| API | NestJS 11 + Prisma + PostgreSQL | 后端服务、健康检查、数据访问 |
| Admin | Next.js 14 App Router + Tailwind CSS v4 | 后台 CMS 壳子 |
| Miniapp | 微信原生小程序 + TypeScript | C 端小程序骨架 |
| Shared | Zod + TypeScript | 数据模型、类型、API 客户端占位 |
| Infra | PostgreSQL 16 + pgvector + Redis 7 | 本地开发依赖 |
| CI | GitHub Actions | lint / test / build / Prisma 校验 |

## 目录说明

- `apps/api`：NestJS API 服务
- `apps/admin`：Next.js 后台 CMS
- `apps/miniapp`：微信原生小程序
- `packages/config`：ESLint / TS 基础配置
- `packages/shared-schema`：Zod 数据模型
- `packages/shared-types`：共享常量与类型
- `packages/api-client`：前后端共用 API Client 占位
- `prisma`：Schema、seed、迁移脚本

## 快速开始

首次运行前，先把根目录 `.env.example` 复制为 `.env`。

### 1. 准备

```bash
corepack enable
pnpm install
```

### 2. 起本地依赖

```bash
docker compose up -d
```

### 3. 数据库

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. 启动三个 app

```bash
pnpm dev
```

验证方式：

- API: [http://localhost:3001/healthz](http://localhost:3001/healthz) 返回 `200 OK`
- Admin: [http://localhost:3000](http://localhost:3000) 看到「归她 · 后台 CMS · 待登录」
- Miniapp: 用微信开发者工具导入 `apps/miniapp` 目录，首页看到「世界很大，归她就好」

## 常用命令

```bash
pnpm lint
pnpm test
pnpm build
pnpm db:format
pnpm db:diff
```

## 当前阶段边界

- 不包含 auth / login
- 不包含业务页面实现
- 不包含 hosts CRUD API
- 不包含外部业务 SDK 接入

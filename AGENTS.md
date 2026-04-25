# AGENTS

## 项目目标

- 这是一个全栈 TypeScript Monorepo。
- Step 1 只允许搭工程骨架、共享模型、数据库基础、三端 hello world。
- 不允许提前写登录、业务页面、CMS 业务逻辑或第三方业务 SDK。

## 目录约定

- `apps/api`：NestJS API
- `apps/admin`：Next.js 后台
- `apps/miniapp`：微信小程序
- `packages/shared-schema`：Zod Schema
- `packages/shared-types`：常量与共享类型
- `packages/api-client`：API 包装层
- `prisma`：数据库模型、seed、迁移

## 代码规则

- 默认使用 TypeScript。
- 共享结构优先放在 `packages/*`。
- 环境变量只写 `.env.example`，禁止提交真值。
- Commit 使用 Conventional Commits。
- 没有明确授权前，不引入业务 SDK。

## 完成标准

- `pnpm install` 能完成依赖安装。
- `pnpm db:generate`、`pnpm db:migrate`、`pnpm db:seed` 能执行。
- `pnpm dev` 后 API / Admin / Miniapp 都有 hello world。

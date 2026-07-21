# love-live-diary

双人共享日记本（Cloudflare Worker + R2），支持**多会话隔离**：不同情侣可在同一站点使用各自的 PIN，数据完全分开。

输入会话 PIN、选择身份后进入对应日记本：每一页左右各一人的日记，支持类似飞书文档的**划词批注**。

**线上地址：** https://love-live-diary.frankwkd.workers.dev  
**仓库：** https://github.com/FrankWkd-Plus/love-live-diary

## 功能（MVP）

- **多会话**：Admin 可创建多个独立会话，每会话独立 PIN / 姓名 / 标题 / 日记页
- 用户端：输入 PIN（全局唯一）自动匹配会话，选择身份 A / B
- 共同日记本：按页管理（日期 + 标题）
- 每页双栏日记，只能编辑自己那一栏
- 划选任意一侧正文 →「添加批注」；高亮与右侧批注列表联动
- 批注可编辑 / 删除（仅作者本人）
- 数据落在 Cloudflare R2（JSON 文件）
- Admin 后台：会话 CRUD、按会话查看/编辑/删除日记页

## 技术栈

- Cloudflare Workers（API + 内嵌静态 SPA，无前端构建）
- Cloudflare R2（`sessions.json` + `sessions/<id>/…`）
- 会话：HMAC 签名 Cookie（用户 30 天 / 管理员 12 小时）
- GitHub Actions 自动部署（push `main`）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
cp .dev.vars.example .dev.vars   # 本地密钥
npm run dev
```

打开终端提示的本地地址（通常是 `http://127.0.0.1:8787`）。

1. 打开 `/admin`，用 `ADMIN_PASSWORD`（默认见 `.dev.vars.example`）登录  
2. **新建会话**，设置名称与 PIN  
3. 打开 `/`，用该 PIN + 身份进入日记本  

本地会使用 Wrangler 模拟的 R2。

### 3. 部署到 Cloudflare

```bash
npx wrangler login
npx wrangler r2 bucket create diary-data   # 仅首次
npm run deploy

# 敏感配置用 secret（不要写进 git）
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_PASSWORD
```

展示默认值（登录前占位）在 `wrangler.toml` 的 `[vars]`：

```toml
[vars]
PAGE_TITLE = "我们的小本本"
PERSON_A = "小A"
PERSON_B = "小B"
```

真实的双方姓名、页面标题、PIN 在 Admin 的**会话**里配置。

### 4. GitHub 自动部署

仓库已包含 `.github/workflows/deploy.yml`。在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | 权限含 Workers Scripts Edit、Account Read、R2 等 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

Worker 上的 `SESSION_SECRET` / `ADMIN_PASSWORD` 仍用 `wrangler secret put` 管理，不经过 GitHub。

## 配置项

| 变量 | 来源 | 说明 |
|------|------|------|
| `SESSION_SECRET` | **secret** | 会话 Cookie 签名密钥 |
| `ADMIN_PASSWORD` | **secret** | 管理后台密码 |
| `PAGE_TITLE` | vars | 登录前默认标题（占位） |
| `PERSON_A` / `PERSON_B` | vars | 登录前默认姓名（占位） |
| `DIARY_BUCKET` | R2 binding | 桶名 `diary-data` |

本地用 `.dev.vars` 覆盖（勿提交）。

> **注意：** 旧版全局 `DIARY_PIN` 已移除。用户 PIN 由 Admin 为每个会话单独设置，且**全局唯一**。  
> 存储布局已变更（见下），与旧版 `meta.json` / `settings.json` / 根级 `pages/` **不兼容**；部署后请清空 R2 或接受旧对象无效。

## API 概览

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | `{ pin, person: "A"\|"B" }` → 按 PIN 匹配会话 |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 当前会话（含姓名、标题） |
| GET | `/api/pages` | **当前会话**页列表 |
| POST | `/api/pages` | 新建页 `{ date?, title? }` |
| GET | `/api/pages/:id` | 页详情 |
| PATCH | `/api/pages/:id` | 改标题/日期 |
| DELETE | `/api/pages/:id` | 删除页 |
| PUT | `/api/pages/:id/entry` | 保存自己的日记 `{ person, body }` |
| POST | `/api/pages/:id/annotations` | 新建批注 |
| PATCH | `/api/pages/:id/annotations/:annId` | 编辑批注 |
| DELETE | `/api/pages/:id/annotations/:annId` | 删除批注 |

用户 Cookie 含 `sessionId`；所有页操作只作用于该会话，客户端无法指定其他会话。

### 管理（`/admin`，独立 Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | `{ password }` |
| POST | `/api/admin/logout` | 退出 |
| GET | `/api/admin/me` | 当前管理员会话 |
| GET | `/api/admin/sessions` | 会话列表 |
| POST | `/api/admin/sessions` | 创建 `{ name, pin, personA?, personB?, pageTitle? }` |
| GET | `/api/admin/sessions/:id` | 会话详情 |
| PUT | `/api/admin/sessions/:id` | 更新会话 |
| DELETE | `/api/admin/sessions/:id` | 删除会话及全部日记 |
| GET | `/api/admin/sessions/:id/pages` | 该会话页列表 |
| GET | `/api/admin/sessions/:id/pages/:pageId` | 页详情 |
| PUT | `/api/admin/sessions/:id/pages/:pageId` | 整页更新（含双方正文） |
| DELETE | `/api/admin/sessions/:id/pages/:pageId` | 删除页 |

## 数据模型

R2 对象：

```
sessions.json
sessions/<sessionId>/meta.json
sessions/<sessionId>/pages/<pageId>.json
```

`sessions.json` 摘要：

```json
{
  "sessions": [
    {
      "id": "ses_...",
      "name": "小明 & 小红",
      "pin": "123456",
      "personA": "小明",
      "personB": "小红",
      "pageTitle": "我们的小本本",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "updatedAt": "..."
}
```

单页结构（摘要，与旧版相同）：

```json
{
  "id": "pg_...",
  "date": "2026-07-21",
  "title": "2026-07-21",
  "entries": {
    "A": { "body": "...", "updatedAt": "..." },
    "B": { "body": "...", "updatedAt": "..." }
  },
  "annotations": [
    {
      "id": "ann_...",
      "author": "A",
      "target": "B",
      "start": 12,
      "end": 28,
      "quote": "被选中的原文",
      "content": "批注内容",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

批注 `start` / `end` 为对应 `target` 正文的 UTF-16 偏移（与 JavaScript 字符串下标一致）。正文被大幅改写后，旧批注高亮可能漂移——MVP 不做偏移迁移。

## 安全说明

- 每会话一个共享 PIN，适合信任的双人场景，不是强多租户 SaaS
- PIN 全局唯一，Admin 可查看各会话 PIN
- Cookie 为 HttpOnly + SameSite=Lax；HTTPS 下自动加 Secure
- 请务必修改默认 `ADMIN_PASSWORD` 与 `SESSION_SECRET`
- 不提供用户侧会话列表 API，降低枚举面
- Worker 变量对账号成员可见，勿把 PIN 当作高强度密钥

## 目录

```
src/
  worker.ts   # 路由与鉴权
  store.ts    # R2 读写（会话 + 页）
  crypto.ts   # HMAC 会话 & id
  types.ts    # 类型
  ui.ts       # 用户 SPA
  admin.ts    # 管理 SPA（会话管理）
wrangler.toml
```

## License

Private / 自用。

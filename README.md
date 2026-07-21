# love-live-diary

双人共享日记本（Cloudflare Worker + R2）。

输入共享 PIN、选择身份后进入共同日记本：每一页左右各一人的日记，支持类似飞书文档的**划词批注**。

**线上地址：** https://love-live-diary.frankwkd.workers.dev  
**仓库：** https://github.com/FrankWkd-Plus/love-live-diary

## 功能（MVP）

- 共享 PIN 登录，选择身份 A / B
- 共同日记本：按页管理（日期 + 标题）
- 每页双栏日记，只能编辑自己那一栏
- 划选任意一侧正文 →「添加批注」；高亮与右侧批注列表联动
- 批注可编辑 / 删除（仅作者本人）
- 数据落在 Cloudflare R2（JSON 文件）

## 技术栈

- Cloudflare Workers（API + 内嵌静态 SPA，无前端构建）
- Cloudflare R2（`meta.json` + `pages/<id>.json`）
- 会话：HMAC 签名 Cookie（30 天）
- GitHub Actions 自动部署（push `main`）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
cp .dev.vars.example .dev.vars   # 本地 PIN / 密钥
npm run dev
```

打开终端提示的本地地址（通常是 `http://127.0.0.1:8787`）。

本地会使用 Wrangler 模拟的 R2。默认 PIN 见 `.dev.vars.example`（`123456`）。

### 3. 部署到 Cloudflare

```bash
npx wrangler login
npx wrangler r2 bucket create diary-data   # 仅首次
npm run deploy

# 敏感配置用 secret（不要写进 git）
npx wrangler secret put DIARY_PIN
npx wrangler secret put SESSION_SECRET
```

展示名等非敏感配置在 `wrangler.toml` 的 `[vars]`：

```toml
[vars]
PAGE_TITLE = "我们的小本本"
PERSON_A = "小A"
PERSON_B = "小B"
```

### 4. GitHub 自动部署

仓库已包含 `.github/workflows/deploy.yml`。在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | 权限含 Workers Scripts Edit、Account Read、R2 等 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID（本账号：`27e1ca33bfb4852baa84fa237d79b6fb`） |

Worker 上的 `DIARY_PIN` / `SESSION_SECRET` 仍用 `wrangler secret put` 管理，不经过 GitHub。

## 配置项

| 变量 | 来源 | 说明 |
|------|------|------|
| `DIARY_PIN` | **secret** | 进入双人空间的共享 PIN |
| `SESSION_SECRET` | **secret** | 会话 Cookie 签名密钥 |
| `PAGE_TITLE` | vars | 页面标题 |
| `PERSON_A` / `PERSON_B` | vars | 两位作者显示名 |
| `DIARY_BUCKET` | R2 binding | 桶名 `diary-data` |

本地用 `.dev.vars` 覆盖（勿提交）。
## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | `{ pin, person: "A"\|"B" }` |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 当前会话 |
| GET | `/api/pages` | 页列表 |
| POST | `/api/pages` | 新建页 `{ date?, title? }` |
| GET | `/api/pages/:id` | 页详情 |
| PATCH | `/api/pages/:id` | 改标题/日期 |
| DELETE | `/api/pages/:id` | 删除页 |
| PUT | `/api/pages/:id/entry` | 保存自己的日记 `{ person, body }` |
| POST | `/api/pages/:id/annotations` | 新建批注 |
| PATCH | `/api/pages/:id/annotations/:annId` | 编辑批注 |
| DELETE | `/api/pages/:id/annotations/:annId` | 删除批注 |

## 数据模型

R2 对象：

```
meta.json
pages/<pageId>.json
```

单页结构（摘要）：

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

- 单共享 PIN，适合信任的双人场景，不是多租户系统
- Cookie 为 HttpOnly + SameSite=Lax；HTTPS 下自动加 Secure
- 请务必修改默认 `DIARY_PIN` 与 `SESSION_SECRET`
- Worker 变量对账号成员可见，勿把 PIN 当作高强度密钥

## 目录

```
src/
  worker.ts   # 路由与鉴权
  store.ts    # R2 读写
  crypto.ts   # HMAC 会话 & id
  types.ts    # 类型
  ui.ts       # SPA HTML/CSS/JS
wrangler.toml
```

## License

Private / 自用。

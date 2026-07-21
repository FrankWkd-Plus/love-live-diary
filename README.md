# love-live-diary

双人共享日记本（Cloudflare Worker + R2）。

输入共享 PIN、选择身份后进入共同日记本：每一页左右各一人的日记，支持类似飞书文档的**划词批注**。

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

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

打开终端提示的本地地址（通常是 `http://127.0.0.1:8787`）。

本地会使用 Wrangler 模拟的 R2，无需真实 Cloudflare 账号即可体验。

默认 PIN：`123456`（见 `wrangler.toml`）。

### 3. 部署到 Cloudflare

1. 在 Cloudflare 控制台创建 R2 桶，默认名 `diary-data`（可在 `wrangler.toml` 修改）
2. 修改 `wrangler.toml` 中的配置：

```toml
[vars]
DIARY_PIN = "你的共享PIN"
PAGE_TITLE = "我们的小本本"
PERSON_A = "小A"
PERSON_B = "小B"
SESSION_SECRET = "换成足够长的随机字符串"
```

3. 登录并部署：

```bash
npx wrangler login
npm run deploy
```

## 配置项

| 变量 | 说明 |
|------|------|
| `DIARY_PIN` | 进入双人空间的共享 PIN |
| `PAGE_TITLE` | 页面标题 |
| `PERSON_A` / `PERSON_B` | 两位作者显示名 |
| `SESSION_SECRET` | 会话 Cookie 签名密钥，**部署前务必修改** |
| `DIARY_BUCKET` | R2 binding，对应桶名 `diary-data` |

也可用 `.dev.vars` 覆盖本地开发变量（勿提交密钥）。

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

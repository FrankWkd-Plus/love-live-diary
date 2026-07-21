# 📓 love-live-diary

双人共享日记本 · Cloudflare Workers + R2

不同情侣可在同一站点使用**独立会话**：各自暗号（PIN）、姓名、标题与日记页完全隔离。打开本子后左右双栏写日记，支持类似飞书文档的**划词批注**（含自注、悬停预览）。

| | |
|---|---|
| **线上** | https://love-live-diary.frankwkd.workers.dev |
| **仓库** | https://github.com/FrankWkd-Plus/love-live-diary |
| **管理** | `/admin` |

---

## 功能

### 用户端
- **两步登录**：先对暗号 → 检索空间与双方姓名 → 再选择身份进入
- 登录页文案：placeholder「对暗号啦」；标题下无多余说明
- 共同日记本：按页管理（日期 + 标题）
- 每页左右双栏卡片，只能编辑自己那一栏
- 划选任意一侧正文（含自己）→「添加批注」
- 荧光高亮与右侧批注列表联动；**悬停高亮可预览批注**
- 批注可编辑 / 删除（仅作者本人）
- 笔记本 📓 favicon；暖色纸质感界面

### 管理端 `/admin`
- **会话管理**：创建 / 编辑 / **删除会话**（连带清空该会话全部日记）
- 会话列表每项右侧有 **删除** 按钮；单击会话进入编辑态也可删除
- 每会话独立 PIN（全局唯一）、双方姓名、页面标题
- 按会话查看、编辑、删除日记页与正文
- 深色管理控制台

### 技术
- Cloudflare Workers（API + 内嵌 SPA，**无前端构建**）
- Cloudflare R2 存 JSON
- HMAC 签名 Cookie（用户 30 天 / 管理员 12 小时）
- 手动部署：`npm run deploy`

---

## 快速开始

### 1. 安装

```bash
npm install
cp .dev.vars.example .dev.vars
```

### 2. 本地开发

```bash
npm run dev
```

打开 `http://127.0.0.1:8787`：

1. 访问 **`/admin`**，用 `ADMIN_PASSWORD` 登录（见 `.dev.vars`）
2. **新建会话**，设置名称与暗号（PIN）
3. 回到 **`/`**，对暗号 → 选身份 → 写日记

### 3. 提交并推送

一键提交当前改动并 push 到 GitHub（**仅单一作者**，不写 Co-Author）：

```bash
npm run push
# 或自定义提交说明：
bash scripts/push.sh "feat: polish login copy"
```

脚本路径：`scripts/push.sh`  
行为：有改动则 `git add -A` + commit → `git push origin <当前分支>`；无改动则跳过 commit。

### 4. 部署到 Cloudflare

```bash
npx wrangler login
npx wrangler r2 bucket create diary-data   # 仅首次
npm run deploy

npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_PASSWORD
```

登录前的占位标题 / 姓名在 `wrangler.toml`：

```toml
[vars]
PAGE_TITLE = "我们的小本本"
PERSON_A = "小A"
PERSON_B = "小B"
```

真实姓名、标题、暗号均在 Admin **会话**中配置。

---

## 配置项

| 变量 | 来源 | 说明 |
|------|------|------|
| `SESSION_SECRET` | secret | Cookie 签名密钥 |
| `ADMIN_PASSWORD` | secret | 管理后台密码 |
| `PAGE_TITLE` | vars | 登录前默认标题（占位） |
| `PERSON_A` / `PERSON_B` | vars | 登录前默认姓名（占位） |
| `DIARY_BUCKET` | R2 | 桶名 `diary-data` |

> 旧版全局 `DIARY_PIN` 已移除。存储布局与早期 `meta.json` / 根级 `pages/` **不兼容**，部署后请清空 R2 或忽略旧对象。

---

## 使用流程

```
Admin 创建会话（暗号 + 姓名）
        │
        ▼
用户输入暗号 ──► /api/lookup-pin ──► 显示双方姓名
        │
        ▼
选择身份 A/B ──► /api/login ──► 进入该会话日记本
        │
        ▼
写日记 · 划词批注 · 悬停预览
```

---

## API 概览

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/lookup-pin` | `{ pin }` → 校验并返回姓名（不写 Cookie） |
| POST | `/api/login` | `{ pin, person }` → 登录 |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 当前会话 |
| GET/POST | `/api/pages` | 列表 / 新建 |
| GET/PATCH/DELETE | `/api/pages/:id` | 详情 / 改标题日期 / 删除 |
| PUT | `/api/pages/:id/entry` | 保存自己的正文 |
| POST/PATCH/DELETE | `/api/pages/:id/annotations[/:annId]` | 批注 CRUD |

Cookie 含 `sessionId`；页操作仅限当前会话。

### 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` · `/logout` | 登录 / 退出 |
| GET | `/api/admin/me` | 管理员状态 |
| GET/POST | `/api/admin/sessions` | 列表 / 创建 |
| GET/PUT/DELETE | `/api/admin/sessions/:id` | 详情 / 更新 / **删除会话**（连带全部日记与批注） |
| GET | `/api/admin/sessions/:id/pages` | 该会话页列表 |
| GET/PUT/DELETE | `/api/admin/sessions/:id/pages/:pageId` | 页读写删 |

---

## 数据模型

```
sessions.json
sessions/<sessionId>/meta.json
sessions/<sessionId>/pages/<pageId>.json
```

**会话注册表**

```json
{
  "sessions": [{
    "id": "ses_...",
    "name": "小明 & 小红",
    "pin": "123456",
    "personA": "小明",
    "personB": "小红",
    "pageTitle": "我们的小本本",
    "createdAt": "...",
    "updatedAt": "..."
  }],
  "updatedAt": "..."
}
```

**单页（摘要）**

```json
{
  "id": "pg_...",
  "date": "2026-07-21",
  "title": "今天",
  "entries": {
    "A": { "body": "...", "updatedAt": "..." },
    "B": { "body": "...", "updatedAt": "..." }
  },
  "annotations": [{
    "id": "ann_...",
    "author": "A",
    "target": "B",
    "start": 12,
    "end": 28,
    "quote": "选中原文",
    "content": "批注",
    "createdAt": "...",
    "updatedAt": "..."
  }]
}
```

批注偏移为 UTF-16（与 JS 字符串下标一致）。正文大改后旧高亮可能漂移——MVP 不做偏移迁移。

---

## 安全

- 共享暗号适合信任双方，非强多租户 SaaS
- PIN 全局唯一；Admin 可见各会话 PIN
- Cookie：HttpOnly + SameSite=Lax；HTTPS 自动 Secure
- 请修改默认 `ADMIN_PASSWORD` 与 `SESSION_SECRET`
- 不提供用户侧会话列表（防枚举）

---

## 目录

```
src/
  worker.ts   # 路由与鉴权
  store.ts    # R2（会话 + 页）
  crypto.ts   # HMAC & id
  types.ts    # 类型
  ui.ts       # 用户 SPA
  admin.ts    # 管理 SPA
scripts/
  push.sh     # 一键 commit + push（单作者）
wrangler.toml
```

## License

Private / 自用。

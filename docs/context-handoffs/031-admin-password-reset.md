# 031 – 管理员账号密码重置

## 需求
「管理员账号重置」。

## 背景
- `admin`（管理员，isAdmin）的密码是初始化时设置的 bootstrap 密码（明文未知），与 49 个种子账号的 `Vigor@2026` 不一致，导致用 admin 登录提示「账号或密码不正确」。

## 操作
- 本地生成新 hash（与 BFF 完全一致）：`salt = randomBytes(16).toString('base64url')`，`salt + ':' + pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('base64url')`。
- CVM：备份 `users.json.bak-adminreset` → 用 python 将 `admin` 的 `passwordHash` 替换为新 hash，`disabled=False`。
- 重启 `vigor-workbench-bff.service`（BFF 内存缓存 users.json，必须重启才生效）。

## 验证
- `POST /api/auth/login`（admin / Vigor@2026）→ HTTP 201，返回 `isAdmin: true`。
- 携带 cookie `GET /api/auth/session` → HTTP 200，`username: admin`，管理员会话可用。

## 结果
- 管理员账号：**admin / Vigor@2026**（与全员种子密码一致）。

# 小程序接入工作台：对接代码示例

> 配套文档：`docs/mini-program-integration-spec.md`（前置规范与 UI 设计逻辑）。
> 以下示例均为真实接口的最小可用写法，按场景粘贴改造即可。

---

## 1. 同域内嵌页：读取当前用户会话

```js
// 工作台以 iframe 嵌入时，同域可直接复用会话 Cookie
async function getCurrentUser() {
  const resp = await fetch('/api/auth/session', { credentials: 'include' })
  if (resp.status === 401) return null // 未登录
  const data = await resp.json()
  return data.user // { id, username, displayName, role, isAdmin, organizationScope, department, departmentHead, teamId, teamName, disabled }
}
```

## 2. 独立小程序：登录并保存会话

```js
const resp = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  credentials: 'include', // 让 Set-Cookie 生效（同域）
  body: JSON.stringify({ username: 'judy', password: 'Vigor@2026' }),
})
if (resp.status !== 201) throw new Error('账号或密码不正确')
const { user } = await resp.json()
// 之后所有请求带 credentials: 'include' 即可
```

## 3. 应用注册（两个文件必须同步新增）

前端 `src/data/workbench.ts` 的 `apps` 数组追加一项：

```ts
{ id: 'new-app', name: '新应用', shortName: '新', department: 'sales',
  description: '一句话说明。', urlEnv: 'VITE_APP_NEW_APP_URL',
  access: ['general_manager', 'sales_vp'], state: 'ready' },
```

BFF `apps/bff/src/apps.service.ts` 的 seed 同步注册（字段：id/name/department/description/access/state）。

## 4. 调用工作台代理 API（带应用身份）

```js
// 小程序侧持有自己的应用代理密钥（只放服务端，禁止进前端/仓库）
const APP_ID = 'new-app'
const APP_SECRET = process.env.NEW_APP_PROXY_SECRET // 服务端注入

async function chat(body) {
  const resp = await fetch('/api/apps/' + APP_ID + '/ai/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Workbench-App-Id': APP_ID,
      'X-Workbench-App-Secret': APP_SECRET,
    },
    body: JSON.stringify(body),
  })
  return resp.json()
}
```

## 5. 人员选择器（弹窗选人）

```js
// 打开选择器小窗（420×560，页面会自动居中）
const picker = window.open(
  `/org-picker?mode=${mode}&title=${encodeURIComponent('选择人员')}&token=${encodeURIComponent(ORG_PICKER_TOKEN)}`,
  '_blank', 'width=420,height=560'
)

// 接收结果 —— 必须校验 event.origin！
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return // 只信任同源
  if (event.data?.type !== 'vigor.org.picker.result') return
  const { mode, persons } = event.data
  // persons: [{ id, department, team, role, name, englishName }, ...]
  console.log('已选人员', persons)
  if (picker && !picker.closed) picker.close()
})
```

## 6. 桥接令牌（独立服务端代用户调用，需扩展白名单）

```js
const resp = await fetch('/api/auth/bridge', {
  method: 'POST', credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ appId: 'ai-sales-coach' }),
})
const { token } = await resp.json()
// token 用于小程序后端代该用户调用工作台接口
```

## 7. Nginx 同域反向代理示例

```nginx
# /etc/nginx/conf.d/vigor-workbench.conf 内新增
location /apps/new-app/ {
    proxy_pass http://127.0.0.1:4xxx/;          # 小程序自身服务
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 8. 网关地址配置（.env）

```bash
# 工作台根目录 .env，配置后重新构建前端
VITE_APP_NEW_APP_URL=/apps/new-app/
```

## 9. 读取本应用被授权启用的服务

```js
// 需登录会话；返回 [{ id, name, endpoint, enabled }]
const resp = await fetch(`/api/apps/${APP_ID}/api-services`, { credentials: 'include' })
const services = await resp.json()
```

---

## 验收要点

- [ ] 全部请求同域、带 `credentials: 'include'`
- [ ] 应用密钥只存在小程序服务端环境变量，未进前端/仓库/日志
- [ ] `postMessage` 回调校验了 `event.origin`
- [ ] 应用注册两端同步、岗位权限已配置

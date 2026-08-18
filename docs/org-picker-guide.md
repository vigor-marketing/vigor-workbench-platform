# 组织架构选择器｜其他程序接入指南

工作台提供「组织架构与人员」数据与选择器，供平台其他程序调用。
- 数据来源：`人员组织架构清单`（49 人，部门/团队/组织角色/姓名/英文名）。
- 两种调用方式：**A. 打开选择窗口**（用户交互选人）；**B. 直接调 API 取数据**（程序直连）。

## 准备

- 工作台地址（部署域）：下面示例用 `https://workbench.example.com`，实际按你的域名替换（当前内测为 `http://1.15.91.150`）。
- 选择器令牌 `PICKER_TOKEN`：向工作台管理员索取（存于 CVM `/etc/vigor-workbench/bff.env`），令牌用于免登录访问，请只放在服务端配置/环境变量里，不要写进前端代码。

---

## A. 打开选择窗口（推荐，用户交互）

**URL 格式**

```
https://workbench.example.com/org-picker?mode=single|multi&title=<标题>&token=<PICKER_TOKEN>
```

- `mode=single` 单选；`mode=multi` 多选。
- 用户确认后，选择页通过 `window.opener.postMessage` 把结果回传，并自动关窗。

**调用方代码（任意前端程序均可）**

```js
function openOrgPicker({ mode = 'single', title = '选择人员' } = {}) {
  const token = process.env.PICKER_TOKEN          // 从你的服务端配置读取
  const base = 'https://workbench.example.com'    // 工作台域名
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.origin !== base) return            // 必做：校验消息来源
      if (event.data?.type !== 'vigor.org.picker.result') return
      window.removeEventListener('message', handler)
      resolve(event.data.persons)
    }
    window.addEventListener('message', handler)
    window.open(
      `${base}/org-picker?mode=${mode}&title=${encodeURIComponent(title)}&token=${token}`,
      'orgpicker',
      'width=420,height=560',
    )
  })
}

// 用法（多选）：
const people = await openOrgPicker({ mode: 'multi', title: '选择项目成员' })
console.log(people)
// → [{ id:'judy', department:'船务部', team:'船务部', role:'部门负责人/管理岗', name:'吴琼', englishName:'Judy' }, ...]

// 用法（单选）：
const [one] = await openOrgPicker({ mode: 'single', title: '选择负责人' })
```

**结果格式**：`persons` 为所选人员数组；单选时也是数组（长度 1）。每条含：
`{ id, department, team, role, name, englishName }`。

---

## B. 直接调 API 取数据（程序直连，无 UI）

请求头带令牌即可，无需登录：

```bash
curl -H "X-Picker-Token: $PICKER_TOKEN" https://workbench.example.com/api/org/persons
curl -H "X-Picker-Token: $PICKER_TOKEN" https://workbench.example.com/api/org/tree
curl -H "X-Picker-Token: $PICKER_TOKEN" https://workbench.example.com/api/org/departments
```

- `/api/org/persons`：平铺 49 人。
- `/api/org/tree`：部门 → 团队 → 人员树（8 个部门）。
- `/api/org/departments`：部门名列表。

后端示例：

```js
const res = await fetch('https://workbench.example.com/api/org/tree', {
  headers: { 'X-Picker-Token': process.env.PICKER_TOKEN },
})
const tree = await res.json()   // [{ department, teams:[{ team, persons:[...] }] }]
```

---

## 安全须知

1. **令牌即凭据**：不要写进前端 bundle / Git / 日志；泄露后在 CVM `bff.env` 修改并重启即可轮换。
2. **回传校验来源**：务必检查 `event.origin === 工作台域名`，防止伪造消息。
3. **URL 中的令牌**：选择窗口 URL 会携带令牌（进入浏览器历史），内网工具可接受；如需更严，可让选择页改用 session（登录态）或加来源白名单。
4. **数据敏感**：组织人员为真实姓名，令牌仅分发给可信的内部程序。

# 041 – 小程序接入工作台：前置规范与 UI 设计逻辑文档

## 需求
「帮我整理后续小程序接入工作台的前置规范和ui设计逻辑」

## 交付
- 新文档 `docs/mini-program-integration-spec.md`（130 行），内容与实际实现核对一致：
  1. **接入前置规范**：同域反向代理 `/apps/<appId>/` + `.env` 网关地址；应用双端注册（BFF apps.service + 前端 workbench.ts）；岗位与权限（admin/app-permissions）；身份会话（vigor_session Cookie / auth/session / auth/bridge）；API 接入（服务与授权 registry + app-grants + `X-Workbench-App-Id/Secret` 代理调用）；数据边界（不直连数据库、不泄密钥、内网测试）；人员选择器协议（org-picker token + postMessage + origin 校验）；接入自检清单。
  2. **UI 设计逻辑**：设计语言（品牌色 #15202c/#d92d20、8 个部门强调色、Noto Sans SC/DM Mono、圆角/阴影）；布局（侧边栏悬停展开、顶栏、page-heading + api-tabs）；组件规范（按钮/表单/460px 居中弹窗/toast/账号卡片/部门区块/徽标/行列表/空错误态）；交互逻辑（部门顺序统一、岗位以账号为准、删除保护、内联新增、小窗居中）；一致性验收红线。
- 规范基于工作台现有真实接口与样式（已 grep 核对 app 相关路由、bridge、proxy、grants、picker）。

## 提交
- `docs/mini-program-integration-spec.md` + 本 handoff，已 push（见 git log）。

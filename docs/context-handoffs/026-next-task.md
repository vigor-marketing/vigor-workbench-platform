# 026 — 销售管理全面核验后续交接

更新时间：2026-08-14（Asia/Shanghai）

## 结论与当前状态

- 销售小组隔离、报价分级审批、合同用印、电子/纸质归档元数据登记、认证启动加固均已部署并通过独立副本回归。
- 服务端执行权限；前端隐藏不作为安全边界。保留一套明确标记“系统验收演示（非真实）”的完整业务链。
- 生产销售台账 schema `version: 4`；客户、商机、报价、合同、回款、项目各 1 条，均属于 `sales-team-1 / 销售一组`；报价 approved 且有正式编号，合同 signed、CI 已确认，项目 active；用印、归档、转组审计均 0 条。
- 当前仅登记合同电子/纸质归档元数据，不接收文件。2026-08-14 最新安全核验确认：项目未安装已明确检查的腾讯 COS Node SDK；BFF 进程中 `COS_BUCKET`、`COS_REGION`、`COS_PREFIX`、`TENCENTCLOUD_SECRETID`、`TENCENTCLOUD_SECRETKEY`、`COS_SECRET_ID`、`COS_SECRET_KEY` 均不存在；`/etc/vigor-workbench/bff.env` 不存在。未读取或输出任何秘密值。真实上传尚不具备实施条件。
- 用户已确认多屏幕比例适配范围覆盖整个 Vigor 统一工作台及所有应用，销售管理由本独立任务负责纳入。2026-08-14 15:30 已部署销售专属响应式约束层：超宽屏内容最大宽度、1180/860/680/420 内容断点、平板/窄屏重排、台账容器内部滚动、表单字段重排、操作按钮换行、移动安全区及粗指针 44px 点击区。未修改公共壳层、`Layout` 或 `App.tsx`，未改变服务端权限。浏览器自动化通道仍无法加载公网 IP，因此完整多视口、缩放截图验收尚未完成，不得声称视觉验收完成。

## 腾讯云、入口与 SSH 授权

- CVM：`ins-59qdrwy7`，地域 `ap-shanghai`；公网入口 `http://1.15.91.150/`；销售入口 `http://1.15.91.150/workspace/apps/sales-management`。
- SSH：主机 `1.15.91.150`，用户 `ubuntu`（不是 root），端口 22，无主机别名。
- 私钥仅作本机路径引用：`/Users/monk/Downloads/cbs069791292101.pem`，模式 0600；RSA 指纹 `SHA256:uBIyjyhfbYZxpCYZD6/+OUt77whNhs0EnUIB2QauRIM`。严禁复制私钥内容。
- 推荐命令：`ssh -i /Users/monk/Downloads/cbs069791292101.pem -o IdentitiesOnly=yes ubuntu@1.15.91.150`。
- 2026-08-14 已再次实测登录成功，主机名 `VM-32-15-ubuntu`，`sudo -n` 可用。历史 root 登录失败是用户名错误，不是授权缺失。新对话交付前仍须实测授权，不能只写地址。

## 部署、数据与代码位置

- 应用：`/opt/vigor-workbench-pilot/app`。
- BFF：`vigor-workbench-bff.service`，仅监听 `127.0.0.1:4000`；Nginx 代理 `/api/`。
- 销售数据：`/var/lib/vigor-workbench/sales.json`，0600 root；应用权限：`/var/lib/vigor-workbench/app-permissions.json`，0600 root；用户：`/var/lib/vigor-workbench/users.json`，0600 root。
- 前端：`src/components/SalesManagementPage.tsx`、`src/styles.css`、`src/App.tsx`、`src/lib/server-auth.ts`。
- BFF：`apps/bff/src/sales.service.ts`、`app.controller.ts`、`apps.service.ts`、`auth.service.ts`、`config.ts`、`types.ts`。
- systemd drop-in：`/etc/systemd/system/vigor-workbench-bff.service.d/10-environment.conf`，可选引用 `/etc/vigor-workbench/bff.env`；后者当前不存在。
- 未来 COS 交接只能记录 bucket、region、prefix 与凭据“引用位置”，绝不记录秘密值。当前这些非秘密参数与凭据引用仍未提供。

## 权限与业务规则

- 销售应用持久岗位：总经理、分管销售副总、销售经理、销售组长、销售员、项目跟进员、财务经理、会计。
- 总经理/销售副总/销售经理全局可见；销售组长/销售员/项目跟进员仅本组；六类实体沿链继承 `teamId/teamName`。
- 跨组转移 API：`POST /api/sales/:entity/:id/team-transfer`；仅销售经理及以上，级联下游并写 `teamTransfers`。
- 报价：仅创建人提交；销售员→同组组长；组长→销售经理或销售副总；销售经理→销售副总；销售副总和总经理提交即自动批准；禁止自审；项目跟进员不能创建/审批。批准生成 `VIGOR-Q-...-V版本号`。
- 合同必须来自已审批报价；项目必须来自 CI 已确认合同且指定跟进员。
- 用印：销售员申请→财务经理审批/驳回→会计盖章登记；与 CI 独立。API 为合同 `seal-applications` 创建、申请 `review` 和 `execute`。
- 归档：销售员登记电子合同元数据，会计登记纸质归档元数据；同合同合并记录、独立审计。API 为合同 `archives/electronic` 与 `archives/paper`。
- 财务经理/会计只获得合同、已审批报价、用印、归档窄视图；其他销售数据为空且写操作拒绝。

## 验证、恢复与安全边界

- 四套独立临时台账矩阵均通过：小组隔离、报价审批、用印、归档；报价额外验证组长/经理不能代销售员提交；临时文件已清理。
- 损坏 `sales.json` 与 `users.json` 均会拒绝启动且测试前后 SHA-256 不变；缺失用户文件且无 `BOOTSTRAP_ADMIN_PASSWORD` 时拒绝创建；启动密码只有用户文件不存在时使用且至少 12 位。生产用户文件和密码哈希未改变。
- 前端 `tsc -b && vite build` 与 BFF `tsc -p tsconfig.json` 均通过。最近服务验证：BFF active、Nginx active、`GET localhost:4000/api/health` 为 ok、Nginx `/` 为 HTTP 200、4000 仅本机监听、TCP 3000 持续监听。
- 销售响应式部署验证：2026-08-14 15:30（Asia/Shanghai）。`styles.css` 销售专属新增约位于 236–299 行；服务器 mtime `2026-08-14 15:30:19.258028917 +0800`，SHA-256 `ed1affdf11bc4debc267362995f9aa7a4d3c99c866b974a079d2a113ca75e07c`。前端 `tsc -b && vite build` 通过；Impeccable 机械检查返回 0 项；BFF 与 Nginx active，健康接口 ok；4000 仅监听 `127.0.0.1`，3000 持续监听且未修改。
- 备份：`sales-team-isolation-20260814-105129`、`quote-approval-20260814-111238`、`contract-seal-20260814-112605`、`contract-archive-20260814-113322`、`sales-audit-fixes-20260814-121224`、`auth-bootstrap-hardening-20260814-143839`、`sales-responsive-20260814-153019`，均位于 `/opt/vigor-workbench-pilot/backups/` 且采用限制权限。
- 回滚：从对应备份恢复源码/数据，重建前端与 BFF，只重启 `vigor-workbench-bff.service`。绝不停止、重启、修改或占用 AI 销售陪练 TCP 3000。
- HTTP/IP 仅限内测，不得录入或上传真实客户、合同、回款、证件、密钥等敏感数据；不得暴露 BFF、数据库、COS 或 API 密钥；不得擅自扩展采购或其他财务写入。

## 下一步与持久交接要求

1. 销售模块响应式源码适配已部署，真实视觉矩阵仍为持久待办。验收视口至少包括：1920×1080、1366×768；2560×1600、1920×1200 等 16:10；21:9 超宽屏；1280×800 小尺寸笔记本；平板横屏与竖屏；每类场景覆盖浏览器缩放 80%–150%。
2. 响应式验收重点：表格和表单不得造成整页横向溢出；主要/流程操作按钮不能被遮挡；导航和所有业务子页可达；弹窗、抽屉及表单操作区不得超出视口；超宽屏避免内容无限拉伸和过宽空白；字号与点击区不得因压缩变得过小。还须覆盖长名称/编号、空态、加载态、权限受限态。
3. 前端响应式调整不得弱化任何 BFF 服务端权限、小组隔离、审批、用印或归档规则。涉及信息架构、字段取舍、交互模式等重大改动，继续按用户要求逐项确认后实施。
4. 浏览器通道恢复后按上述完整矩阵集中截图验收；当前仅有源码级适配，不得标记完成。
5. 真实电子文件上传必须等待用户提供非秘密的 COS bucket、region、prefix 和安全凭据引用位置，并作为重大变更再次确认；不得要求用户在聊天粘贴 secret/token。
6. 每份后续编号交接必须完整保留并更新：腾讯云资源；SSH 用户/主机/端口/别名/密钥路径引用/指纹/sudo/最近实测；部署与入口；数据/COS 非秘密引用；岗位和所有服务端权限规则；销售模块完整响应式验收矩阵及进度；未完成项；3000 与内测安全边界；构建、服务、健康检查、备份和回滚。不得包含私钥、密码、token 或秘密值。

# 工作台上下文交接｜2026-08-07

## 当前目标

建立统一办公工作台：先作为三个既有业务小程序的同域入口，再逐步形成统一权限、待办、数据分析与 AI 能力的平台。

## 已确认的核心规则

- 初期按部门顺序接入：销售 `ai-sales-coach`、采购 `vigor-product-encoder`、财务 `sales-commission`。
- 不能用 GitHub 页面 iframe；生产接入采用同域 Nginx 反向代理 `/apps/{app-id}/`。
- 小程序保有各自业务数据；工作台不直接跨库写入，后续以 BFF、事件和平台映射数据联通。
- 工作台内待办必须实时更新；可转交但需要审批；逾期标红，并通知负责人、发起人、小组长和对应副总经理。
- 总经理和两位副总经理查看全经营数据；销售副总与总经理查看销售明细；组长仅看本组数据。
- 以后每当临近上下文压缩：先生成本类结构化交接文件，再在同一项目创建新对话继续任务。

## 已完成

- 前端 MVP 已完成：React + TypeScript + Vite，含总览、角色切换演示、待办中心、按部门的应用入口与嵌入状态。
- 架构与运行文档已完成：`README.md`、`docs/architecture.md`、`docs/roles-and-access.md`、`docs/nginx.conf.example`、`platform-contracts/README.md`。
- 私有 GitHub 仓库已建立并上传首期代码：<https://github.com/vigor-marketing/vigor-workbench-platform>。
- 已创建 BFF 基础代码与 PostgreSQL 初始化脚本：`apps/bff/`、`database/init.sql`、`docker-compose.yml`、`docs/bff.md`。

## 已完成的 BFF 工作

1. `apps/bff/src/app.controller.ts` 使用明确的 HTTP 异常；空或非法 `completed` 返回 400。
2. PostgreSQL 记录的 `dueAt` 在 BFF 中转换为 ISO 字符串。
3. 本地默认启用 `DEMO_MODE=true`，生产环境仍须明确设置为 `false` 并接入 OIDC。
4. 前端 `src/lib/platform-api.ts` 已接入 `/api/todos`；`src/App.tsx` 在 BFF 不可用时降级到静态演示待办。
5. NestJS 依赖已安装；前端和 BFF TypeScript 编译、Vite production build 均已成功。
6. 本机 BFF 已验证：`GET /api/health` 返回 `memory-demo`；`GET /api/todos` 返回 4 条记录；`PATCH /api/todos/todo-01` 成功更新后可被再次读取；空请求体返回 400。验证后已恢复演示数据。
7. 按正确性、可读性、架构、安全和性能五个维度完成审查：无合并阻塞项。已知限制为演示身份和内存存储仅限本地开发，生产必须先接 OIDC 与 PostgreSQL。

## 关键文件

- 前端入口：`src/App.tsx`
- 静态演示数据：`src/data/workbench.ts`
- BFF：`apps/bff/src/main.ts`、`apps/bff/src/app.controller.ts`、`apps/bff/src/todos.service.ts`
- 数据库：`database/init.sql`
- 环境变量示例：`.env.example`
- BFF 文档：`docs/bff.md`

## 验证状态与注意事项

- 首期前端曾通过 TypeScript 与 Vite build，并在浏览器验证无控制台错误。
- BFF 已完成本地验证，当前为内存演示存储；PostgreSQL 初始化文件已准备但本轮未启动 Docker 数据库验证。
- 本地 Git 根提交与通过 GitHub Contents API 上传形成的远程历史不相连；不要直接普通 `git push`，后续继续使用已连接的 GitHub API 更新文件。当前待同步本次 BFF 文件。
- 正式生产认证尚未接入；当前 BFF 的 `X-Demo-Role` 仅供 `DEMO_MODE=true` 本地演示使用，不能用于生产。

## 腾讯云既有财务模块验证

- 已阅读用户提供的 `/Users/monk/Downloads/腾讯云基础资料总览.md`；其中不含凭据。
- 销售提成系统部署在 CloudBase 环境 `monktestcloud-d8gnzlwaw449aa8b8`，后端为 CloudRun 服务 `sales-commission`，应用数据库为单实例 SQLite，正式备份在传统 CloudBase COS。它不是工作台 PostgreSQL 的替代品。
- 2026-08-07 只读验证通过：CloudRun `GET /api/health` 返回 `{ "ok": true }`；静态站与 API 均返回 HTTP 200。
- 静态站响应未发现 `X-Frame-Options` 或 CSP frame 限制。但正式接入仍必须使用工作台域名下的 `/apps/sales-commission/` Nginx 反向代理；不得在产品中固化外部 CloudBase 域名。
- 未创建、修改或删除任何腾讯云资源、COS 对象、数据库或服务配置。

## 腾讯云凭据与数据库资源状态

- 用户提供的 `/Users/monk/Downloads/SecretKey.csv` 已按本机临时调用方式验证有效；密钥未写入项目、Git、环境文件或长期 CLI 配置，且不会在对话中复述。
- 已用该凭据只读查询：CDB（MySQL）实例数为 0。后续改用腾讯云 PostgreSQL 服务的正确接口复核，发现已有 1 个运行中的 PostgreSQL 17 实例，位于 `ap-shanghai-9`。早先因接口返回格式不同而得出的“PostgreSQL 实例数为 0”结论已撤销。
- 尚未创建工作台数据库、数据库账号、VPC、安全组或任何计费资源。现有 PostgreSQL 实例的业务归属和可用数据库尚未确认；不得写入或复用，除非用户明确批准。若坚持新建隔离实例，仍须确认实例规格、地域、网络、实例名称、数据库名称与预算边界。
- 用户已确认复用现有实例并同意创建 `vigor_workbench_test`、`vigor_workbench_app` 及本机钥匙串保管密码。实际创建尝试在读取腾讯云密钥文件前中止：`/Users/monk/Downloads/SecretKey.csv` 已不存在；没有创建云账号或数据库。尝试过程中生成的未使用钥匙串记录已立即删除。需用户重新提供密钥文件或可用的安全凭据路径后再试。
- 用户重新提供密钥后，已成功在既有 PostgreSQL 17 实例创建普通账号 `vigor_workbench_app` 和独立数据库 `vigor_workbench_test`（UTF8，所有者为该账号）。密码仅保存在本机 macOS 钥匙串，服务名 `vigor-workbench-postgres`，未进入项目、Git、普通文件或对话。
- 2026-08-07 连通性测试前发现该实例的公网入口状态为 `initing`，未返回主机/IP和端口，因此尚不能从本机 BFF 连接；未修改白名单、VPC、安全组或已有网络策略。后续只需在公网入口变为 `opened` 后，用该账号执行只读 `SELECT 1`，再配置 BFF 的 `DATABASE_URL`。
- 公网入口诊断已完成：实例网络信息中 `public` 记录为 `initing`，但没有地址、IP 或端口；近 7 天腾讯云操作审计没有 `OpenDBExtranetAccess`（开通实例公网地址）记录或相关错误。结论：公网访问未被实际开通或处于历史遗留的未完成初始化状态，不是 BFF、应用账号、数据库、白名单或安全组导致。修复动作是调用 `OpenDBExtranetAccess`，它会改变实例网络暴露面，必须先由用户单独确认；开通后仍需检查/配置最小化访问来源。

## 腾讯云临时联通与回收（2026-08-07）

- 用户已确认：可为本机验证临时开放现有 PostgreSQL，但来源必须仅限当前开发机，验证后立即关闭并移除规则。
- 已创建临时专用安全组并绑定到该实例；唯一入站规则仅允许当前开发机公网地址访问 TCP 5432。随后 `OpenDBExtranetAccess` 已成功使公网端点就绪。
- 数据库首次 TLS 握手显示实例未启用 SSL。因此没有发送明文数据库凭据，也没有执行初始化 SQL、写入业务数据或配置 `DATABASE_URL`。
- 已提交并最终核验 TLS 启用：`SSLEnabled=true`。此安全加固保留，以供后续通过私网或受控跳板机连接时使用。
- 已提交公网关闭，最终查询到公网状态为 `closed`。临时安全组的唯一入站规则已删除，当前入站规则数为 0；腾讯云 API 拒绝把实例的安全组集合直接设为空，因此该空规则安全组仍绑定在实例上，但不允许任何入站访问。
- 目前不应再次从本机通过公网连接数据库。下一步应选择一种长期安全路径：将 BFF 部署到同一 VPC/CloudBase 私网，或准备最小权限跳板机/SSH 隧道；然后使用 TLS、专用账号和 `database/init.sql` 初始化 `vigor_workbench_test`，并执行 BFF 的真实 PostgreSQL 冒烟测试。

## 压缩轮次 2｜人工执行（2026-08-07）

- 用户要求每次上下文压缩都必须先整理全部需求，并在同一组建立新对话继续。
- 本轮已采用锚定式增量交接：保留本文件已有的业务规则、文件轨迹、腾讯云状态及后续安全路径；未重新生成或丢弃早期决策。
- 当前环境已确认支持创建同目录续接对话；本对话即为由上一轮创建的续接对话。长期编号、索引和创建规则以 `000-project-memory.md` 与 `INDEX.md` 为准，后续从 `002` 开始递增。

## 001 私网 BFF 联通进展（2026-08-07）

## 001 CloudBase BFF 真实联通（2026-08-07，当前）

- 用户改为复用现有 CloudBase 环境，而非新建独立付费环境。当前环境在上海，已有销售提成资源；工作台严禁读取或修改其数据。
- CloudBase PostgreSQL 的 `ExecutePGSql` 管理 API 固定连接默认 `postgres` 库。因此已使用该默认库内的 `workbench` schema 隔离工作台数据；额外创建的 `vigor_workbench` 数据库不作为 CloudBase BFF 的运行时存储，不应在未确认前删除。
- 已创建/复核专用登录角色 `vigor_workbench_app`：可登录、无超级权限、无建库/建角色权限。随机密码仅在本机钥匙串服务 `cloudbase-vigor-workbench-postgres` 保存，未写入项目、Git、日志或对话。
- 已创建 `workbench.workbench_todos` 并插入 4 条工作台演示待办；表由专用角色拥有。没有读取、修改或删除销售提成 schema/数据。
- BFF 新增 `TODO_STORAGE=cloudbase-pg` 路径：`apps/bff/src/todos.service.ts` 通过官方 `tencentcloud-sdk-nodejs` 调用 `ExecutePGSql`，并指定专用 role；`config.ts`、`.env.example`、`docs/bff.md` 同步更新。CloudBase SQL API 返回列数组，适配器已完成列名和布尔值转换。
- 真实冒烟通过：`GET /api/health` 返回 `todoStorage=cloudbase-postgres`；`GET /api/todos` 返回 4 条；`PATCH /api/todos/todo-01` 设置完成成功，再设置未完成成功；最终读取确认状态已还原。TypeScript 编译成功。
- 下一步：用户需单独确认正式在现有 CloudBase 里部署 BFF/HTTP API。部署前需要选择 CloudBase 服务形态与最小权限运行时密钥方案；生产必须 `DEMO_MODE=false` 并接入 OIDC，禁止把 `X-Demo-Role` 用作生产身份。

- 已确认现有一台运行中的 Ubuntu 云主机与 PostgreSQL 位于同一 VPC；该主机的腾讯云自动化助手在线。
- 用户已明确确认后，PostgreSQL 安全组新增且仅新增一条私网入站规则：来源为该云主机所属安全组，协议 TCP、端口 5432。最终复核：入站规则数为 1、全部为 5432、无公网 CIDR；PostgreSQL 公网状态继续为 `closed`。
- 为本机临时测试创建过受限 SSH 隧道账户：密码锁定、仅允许新生成公钥、禁止交互终端/代理/X11、仅允许 PostgreSQL 目标转发。连接测试后该账户、进程、本机私钥、已知主机文件与临时证书文件均已清理；腾讯云自动化助手清理任务返回 `SUCCESS`。
- 通过该受限隧道确认 PostgreSQL TLS 可加密连接。腾讯云 API 的 `DescribeDBInstanceSSLConfig` 未返回 `CAUrl`；从服务端取得的链缺少信任根，因此 Node 严格验证返回 `unable to get issuer certificate`。没有执行 `database/init.sql`、没有写入测试库，也没有运行真实 BFF API；没有使用明文连接或关闭证书验证的变通方案。
- BFF 已补充正式 TLS 配置：`DATABASE_SSL=true` 时必须同时提供 `DATABASE_SSL_CA_PATH` 与 `DATABASE_SSL_SERVERNAME`，否则拒绝启动。变更文件：`apps/bff/src/config.ts`、`apps/bff/src/todos.service.ts`、`.env.example`、`docs/bff.md`；TypeScript 编译通过。
- 下一步：用户从腾讯云 PostgreSQL 控制台“数据安全 → SSL”下载 CA PEM（官方文档说明该下载流程），将其以受保护方式放到部署环境；然后重新建立私网受限通道，运行 `database/init.sql`，并验证 BFF `GET /api/health`、`GET /api/todos`、`PATCH /api/todos/:id`。生产部署应让 BFF 直接运行在此 VPC，而非依赖本机 SSH 隧道。
- 用户要求由助手自行下载 CA 后，控制台自动化两次超时；随后确认 `/Users/monk/Downloads/SecretKey.csv` 已不在本机，无法继续调用腾讯云 API 或在同 VPC 主机检查证书签发链。没有产生新的云端改动。需要重新提供密钥文件的安全路径，或在腾讯云控制台下载 CA PEM 后提供其本地路径。
- 用户随后重新提供 `SecretKey.csv`。助手通过同 VPC 云主机完成无凭据 TLS 握手检查：服务端证书签发者为 Tencent 区域专属 CA（`TencentDB ap-shanghai region CA`），证书没有 Authority Information Access 下载链接；公开检索未找到可验证的 CA 文件。腾讯云 API 仍未返回 `CAUrl`，控制台自动化仍超时。因此官方 CA PEM 只能从该实例控制台“数据安全 → SSL”的下载入口取得；没有采用第三方或猜测的证书文件。

## CVM 部署路线（2026-08-10，当前）

- 用户确认所说的“实例”为腾讯云 CVM，并要求直接使用它；工作台运行时路线改为 CVM，CloudBase 仅保留给既有应用。
- CVM 只读核验：Ubuntu 26.04，2 vCPU/4 GB、80 GB；约 61 GB 磁盘可用、约 1.9 GB 内存可用、6 GB swap；Docker 29.1.3 与 Compose 2.40.3 已安装；当前无 Docker 容器。
- 现有 Node 服务占用公网 3000，UFW 也放行 3000；不要停止、修改或关闭它。数据库、BFF 容器端口、反向代理控制台均不得公开；工作台应另建 Docker Compose 目录并只经 80/443 反向代理暴露。
- 仍缺少用户工作台域名/子域名、DNS 指向和可接受的内测认证方案。未安装软件、未修改主机、未部署容器、未修改防火墙或安全组。

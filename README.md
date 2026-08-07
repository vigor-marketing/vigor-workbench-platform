# Vigor 统一办公工作平台

首期工作平台为三个既有系统提供统一入口、待办中心、角色上下文和同域嵌入壳层。

## 已包含

- 销售、采购、财务三个部门入口，顺序固定；
- AI 销售陪练、产品编码器、销售提成三个模块；
- 待办中心的演示数据与完成状态切换；
- 演示角色切换，用来校验入口可见性；
- 各模块的嵌入地址、权限边界、故障与未配置状态；
- Nginx 同域反向代理示例及平台接入约束。

## 本地运行

```bash
cp .env.example .env
pnpm install
pnpm dev
```

本地开发默认不填写应用 URL，模块页会显示“等待网关地址配置”。只有当目标应用已由同一域名的 Nginx 代理后，才应在 `.env` 中填写 `/apps/{app-id}/`。

## 重要边界

- 工作台不直接连接、读取或写入任意业务系统数据库；
- 演示角色仅用于前端界面展示，不是安全控制；生产权限必须由 OIDC + 平台 BFF 校验；
- 禁止用 GitHub 地址或其他第三方网站作为 iframe 地址；
- 模块间数据使用 API、事件和平台映射表同步，业务主数据仍归属原模块。

详细架构与部署方式见 [docs/architecture.md](docs/architecture.md)、[docs/roles-and-access.md](docs/roles-and-access.md) 和 [docs/nginx.conf.example](docs/nginx.conf.example)。

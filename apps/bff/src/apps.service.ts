import { Injectable, OnModuleInit } from '@nestjs/common'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'
import type { Role } from './types.js'

type PlatformApp = { id: string; name: string; department: string; entryPath: string; roles: Role[] }

const apps: PlatformApp[] = [
  { id: 'sales-management', name: '销售管理', department: 'sales', entryPath: '/workspace/apps/sales-management', roles: ['general_manager', 'sales_vp', 'sales_manager', 'sales_team_lead', 'salesperson', 'project_coordinator', 'finance_manager', 'accountant'] },
  { id: 'knowledge-base', name: '企业知识库', department: 'sales-support', entryPath: '/apps/knowledge-base/', roles: ['general_manager', 'sales_vp', 'finance_vp', 'sales_manager', 'sales_team_lead', 'salesperson', 'project_coordinator', 'procurement_manager', 'procurement_team_lead', 'purchaser', 'quality_team', 'hr_director', 'admin_specialist', 'finance_manager', 'accountant', 'shipping_manager', 'shipping_operator', 'sales_support', 'market_team'] },
  { id: 'ai-sales-coach', name: 'AI 销售陪练', department: 'sales', entryPath: '/apps/ai-sales-coach/', roles: ['general_manager', 'sales_vp', 'sales_manager', 'sales_team_lead', 'salesperson', 'project_coordinator', 'sales_support', 'market_team'] },
  { id: 'product-encoder', name: '产品编码器', department: 'procurement', entryPath: '/apps/product-encoder/', roles: ['general_manager', 'sales_vp', 'finance_vp', 'procurement_manager', 'procurement_team_lead', 'purchaser', 'quality_team', 'sales_support', 'sales_manager', 'sales_team_lead', 'salesperson'] },
  { id: 'sales-commission', name: '销售提成', department: 'finance', entryPath: '/apps/sales-commission/', roles: ['general_manager', 'sales_vp', 'finance_vp', 'finance_manager', 'accountant', 'sales_manager', 'sales_team_lead'] },
]

const validRoles = new Set<Role>(['general_manager','sales_vp','finance_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','procurement_manager','procurement_team_lead','purchaser','quality_team','hr_director','admin_specialist','finance_manager','accountant','shipping_manager','shipping_operator','sales_support','market_team'])

@Injectable()
export class AppsService implements OnModuleInit {
  private grants: Record<string, Role[]> = Object.fromEntries(apps.map(app => [app.id, app.roles]))

  async onModuleInit() {
    try {
      const stored = JSON.parse(await readFile(config.appPermissionsFile, 'utf8')) as Record<string, Role[]>
      for (const app of apps) if (Array.isArray(stored[app.id])) this.grants[app.id] = stored[app.id].filter((role): role is Role => validRoles.has(role as Role))
    } catch { await this.persist() }
  }

  list(role: Role) { return apps.map(app => ({ ...app, roles: this.grants[app.id] ?? [], permitted: (this.grants[app.id] ?? []).includes(role) })) }
  all() { return apps.map(app => ({ ...app, roles: this.grants[app.id] ?? [] })) }

  async saveRoles(appId: string, roles: unknown) {
    if (!apps.some(app => app.id === appId)) throw new Error('应用不存在。')
    if (!Array.isArray(roles) || roles.some(role => typeof role !== 'string' || !validRoles.has(role as Role))) throw new Error('岗位配置无效。')
    this.grants[appId] = [...new Set(roles)] as Role[]
    await this.persist()
    return this.all().find(app => app.id === appId)
  }

  private async persist() {
    await mkdir(dirname(config.appPermissionsFile), { recursive: true })
    await writeFile(config.appPermissionsFile, JSON.stringify(this.grants, null, 2), { mode: 0o600 })
  }
}

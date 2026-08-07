import { Injectable } from '@nestjs/common'
import type { Role } from './types.js'

type PlatformApp = { id: string; name: string; department: string; entryPath: string; roles: Role[] }

const apps: PlatformApp[] = [
  { id: 'ai-sales-coach', name: 'AI 销售陪练', department: 'sales', entryPath: '/apps/ai-sales-coach/', roles: ['general_manager', 'sales_vp', 'sales_manager', 'salesperson'] },
  { id: 'product-encoder', name: '产品编码器', department: 'procurement', entryPath: '/apps/product-encoder/', roles: ['general_manager', 'sales_vp', 'finance_vp', 'procurement_manager', 'salesperson'] },
  { id: 'sales-commission', name: '销售提成', department: 'finance', entryPath: '/apps/sales-commission/', roles: ['general_manager', 'sales_vp', 'finance_vp', 'finance_manager'] },
]

@Injectable()
export class AppsService {
  list(role: Role) { return apps.map(app => ({ ...app, permitted: app.roles.includes(role) })) }
}

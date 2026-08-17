import type { AppDefinition, Role } from '../data/workbench'

export type DemoUser = {
  id: string
  username: string
  password: string
  displayName: string
  role: Role
  isAdmin?: boolean
  active?: boolean
}
export type PermissionMap = Record<AppDefinition['id'], Role[]>

const USERS_KEY = 'vigor.workbench.demo-users.v1'
const PERMISSIONS_KEY = 'vigor.workbench.permissions.v1'
const SESSION_KEY = 'vigor.workbench.session.v1'

export const defaultUsers: DemoUser[] = [
  { id: 'admin-001', username: 'admin', password: 'Vigor!Admin2026', displayName: '系统管理员', role: 'general_manager', isAdmin: true, active: true },
  { id: 'sales-001', username: 'sales.demo', password: 'Vigor!Sales2026', displayName: '销售员演示账号', role: 'salesperson', active: true },
  { id: 'purchasing-001', username: 'purchasing.demo', password: 'Vigor!Procurement2026', displayName: '采购员演示账号', role: 'purchaser', active: true },
  { id: 'finance-001', username: 'finance.demo', password: 'Vigor!Finance2026', displayName: '财务经理演示账号', role: 'finance_manager', active: true },
]

export const defaultPermissions: PermissionMap = {
  'sales-management': ['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson','project_coordinator'],
  'ai-sales-coach': ['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','sales_support'],
  'product-encoder': ['general_manager','sales_vp','finance_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','procurement_manager','procurement_team_lead','purchaser','quality_team','sales_support'],
  'sales-commission': ['general_manager','sales_vp','finance_vp','finance_manager','accountant'],
  'knowledge-base': ['general_manager','sales_vp','finance_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','procurement_manager','procurement_team_lead','purchaser','quality_team','hr_director','admin_specialist','finance_manager','accountant','shipping_manager','shipping_operator','sales_support','market_team'],
}

function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
export const getUsers = () => read<DemoUser[]>(USERS_KEY, defaultUsers)
export const getPermissions = () => read<PermissionMap>(PERMISSIONS_KEY, defaultPermissions)
export const getSession = () => read<DemoUser | null>(SESSION_KEY, null)
export const signIn = (username: string, password: string) => {
  const user = getUsers().find(item => item.username === username.trim() && item.password === password && item.active !== false)
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user || null
}
export const signOut = () => localStorage.removeItem(SESSION_KEY)
export const saveUsers = (users: DemoUser[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users))
export const savePermissions = (permissions: PermissionMap) => localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
export const isAllowed = (permissions: PermissionMap, role: Role, app: AppDefinition) => Boolean(permissions[app.id]?.includes(role))

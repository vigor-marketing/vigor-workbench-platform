export type Department = 'sales' | 'procurement' | 'finance'
export type Role = 'general_manager' | 'sales_vp' | 'finance_vp' | 'sales_manager' | 'salesperson' | 'procurement_manager' | 'finance_manager'

export type AppDefinition = {
  id: 'ai-sales-coach' | 'product-encoder' | 'sales-commission'
  name: string
  shortName: string
  department: Department
  description: string
  urlEnv: 'VITE_APP_AI_SALES_COACH_URL' | 'VITE_APP_PRODUCT_ENCODER_URL' | 'VITE_APP_SALES_COMMISSION_URL'
  access: Role[]
  actions: string[]
  state: 'ready' | 'configuring'
}

export type Todo = {
  id: string
  title: string
  source: string
  due: string
  priority: 'high' | 'medium' | 'normal'
  completed?: boolean
}

export const departments: Record<Department, { label: string; order: string; description: string }> = {
  sales: { label: '销售', order: '01', description: '客户、商机、报价、合同及回款协同' },
  procurement: { label: '采购', order: '02', description: '产品编码、采购协同与质量支持' },
  finance: { label: '财务', order: '03', description: '提成核算、经营数据及用印协同' },
}

export const apps: AppDefinition[] = [
  {
    id: 'ai-sales-coach',
    name: 'AI 销售陪练',
    shortName: '陪练',
    department: 'sales',
    description: '销售话术训练、复盘与能力洞察。',
    urlEnv: 'VITE_APP_AI_SALES_COACH_URL',
    access: ['general_manager', 'sales_vp', 'sales_manager', 'salesperson'],
    actions: ['进入训练室', '查看训练报告'],
    state: 'ready',
  },
  {
    id: 'product-encoder',
    name: '产品编码器',
    shortName: '编码',
    department: 'procurement',
    description: '统一产品编码查询与采购资料协同。',
    urlEnv: 'VITE_APP_PRODUCT_ENCODER_URL',
    access: ['general_manager', 'sales_vp', 'finance_vp', 'procurement_manager', 'salesperson'],
    actions: ['查询产品编码', '打开产品资料'],
    state: 'ready',
  },
  {
    id: 'sales-commission',
    name: '销售提成',
    shortName: '提成',
    department: 'finance',
    description: '销售提成查询、核算状态与经营数据入口。',
    urlEnv: 'VITE_APP_SALES_COMMISSION_URL',
    access: ['general_manager', 'sales_vp', 'finance_vp', 'finance_manager'],
    actions: ['查看核算周期', '查看提成明细'],
    state: 'configuring',
  },
]

export const roles: Record<Role, { label: string; scope: string; displayName: string }> = {
  general_manager: { label: '总经理', scope: '全部经营数据', displayName: '总经理' },
  sales_vp: { label: '分管销售副总', scope: '全部经营数据及销售明细', displayName: '销售总监' },
  finance_vp: { label: '分管财务副总', scope: '全部经营数据', displayName: '财务总监' },
  sales_manager: { label: '销售经理', scope: '本销售组数据', displayName: '销售一组组长' },
  salesperson: { label: '销售员', scope: '本人客户与协作项目', displayName: '陈晓' },
  procurement_manager: { label: '采购经理', scope: '本采购组数据', displayName: '采购一组组长' },
  finance_manager: { label: '财务经理', scope: '财务数据与用印审批', displayName: '财务经理' },
}

export const initialTodos: Todo[] = [
  { id: 'todo-01', title: '确认华东项目的技术支持安排', source: '跨部门计划', due: '今天 10:30', priority: 'high' },
  { id: 'todo-02', title: '审批客户报价 V2.1', source: '销售审批', due: '今天 14:00', priority: 'high' },
  { id: 'todo-03', title: '完成本周 AI 陪练复盘', source: 'AI 销售陪练', due: '明天', priority: 'medium' },
  { id: 'todo-04', title: '核对 7 月销售提成数据', source: '销售提成', due: '8 月 12 日', priority: 'normal' },
]

export function appUrl(app: AppDefinition): string | undefined {
  return import.meta.env[app.urlEnv]?.trim() || undefined
}

export function canAccess(role: Role, app: AppDefinition): boolean {
  return app.access.includes(role)
}

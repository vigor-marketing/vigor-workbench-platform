export type Department = 'sales' | 'procurement' | 'finance' | 'knowledge'
export type Role = 'general_manager' | 'sales_vp' | 'finance_vp' | 'sales_manager' | 'sales_team_lead' | 'salesperson' | 'project_coordinator' | 'procurement_manager' | 'procurement_team_lead' | 'purchaser' | 'quality_team' | 'hr_director' | 'admin_specialist' | 'finance_manager' | 'accountant' | 'shipping_manager' | 'shipping_operator' | 'sales_support' | 'market_team'
export type AppDefinition = { id: 'sales-management' | 'ai-sales-coach' | 'product-encoder' | 'sales-commission' | 'knowledge-base'; name: string; shortName: string; department: Department; description: string; urlEnv?: 'VITE_APP_AI_SALES_COACH_URL' | 'VITE_APP_PRODUCT_ENCODER_URL' | 'VITE_APP_SALES_COMMISSION_URL' | 'VITE_APP_KNOWLEDGE_BASE_URL'; access: Role[]; actions: string[]; state: 'ready' | 'configuring' }
export type Todo = { id: string; title: string; source: string; due: string; priority: 'high' | 'medium' | 'normal'; completed?: boolean }
export const departments: Record<Department, { label: string; order: string; description: string }> = { sales:{label:'销售',order:'01',description:'客户、商机、报价、合同及回款协同'}, procurement:{label:'采购',order:'02',description:'产品编码、采购协同与质量支持'}, finance:{label:'财务',order:'03',description:'提成核算、经营数据及用印协同'}, knowledge:{label:'知识库',order:'04',description:'企业资料沉淀、检索与知识服务'} }
export const roles: Record<Role, { label: string; scope: string; displayName: string }> = { general_manager:{label:'总经理',scope:'全部经营与管理数据',displayName:'总经理'}, sales_vp:{label:'分管销售副总',scope:'全部经营数据及销售明细',displayName:'销售总监'}, finance_vp:{label:'分管财务副总',scope:'全部经营数据及财务明细',displayName:'财务总监'}, sales_manager:{label:'销售经理',scope:'分管销售数据',displayName:'销售经理'}, sales_team_lead:{label:'销售组长',scope:'本销售组数据',displayName:'销售组长'}, salesperson:{label:'销售员',scope:'本人客户与协作项目',displayName:'销售员'}, project_coordinator:{label:'项目跟进员',scope:'所跟进项目与协作客户',displayName:'项目跟进员'}, procurement_manager:{label:'采购经理',scope:'采购部门数据',displayName:'采购经理'}, procurement_team_lead:{label:'采购组长',scope:'本采购组数据',displayName:'采购组长'}, purchaser:{label:'采购员',scope:'本人采购任务',displayName:'采购员'}, quality_team:{label:'质量组',scope:'质量与验收资料',displayName:'质量组'}, hr_director:{label:'人力总监',scope:'人力行政数据',displayName:'人力总监'}, admin_specialist:{label:'行政专员',scope:'行政协同资料',displayName:'行政专员'}, finance_manager:{label:'财务经理',scope:'财务数据与用印审批',displayName:'财务经理'}, accountant:{label:'会计',scope:'凭证、归档与用印执行',displayName:'会计'}, shipping_manager:{label:'船务经理',scope:'船务部门数据',displayName:'船务经理'}, shipping_operator:{label:'船务操作员',scope:'本人船务任务',displayName:'船务操作员'}, sales_support:{label:'销售支持组',scope:'技术支持、报价与研发资料',displayName:'销售支持'}, market_team:{label:'市场组',scope:'市场推广与线索资料',displayName:'市场专员'} }
export const apps: AppDefinition[] = [
{id:'sales-management',name:'销售管理',shortName:'销售',department:'sales',description:'客户、商机、报价、合同、回款与项目统一台账。',access:['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson','project_coordinator'],actions:['管理客户商机','处理报价合同'],state:'ready'},
{id:'ai-sales-coach',name:'AI 销售陪练',shortName:'陪练',department:'sales',description:'销售话术训练、复盘与能力洞察。',urlEnv:'VITE_APP_AI_SALES_COACH_URL',access:['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','sales_support'],actions:['进入训练室','查看训练报告'],state:'ready'},
{id:'product-encoder',name:'产品编码器',shortName:'编码',department:'procurement',description:'统一产品编码查询与采购资料协同。',urlEnv:'VITE_APP_PRODUCT_ENCODER_URL',access:['general_manager','sales_vp','finance_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','procurement_manager','procurement_team_lead','purchaser','quality_team','sales_support'],actions:['查询产品编码','打开产品资料'],state:'ready'},
{id:'sales-commission',name:'销售提成',shortName:'提成',department:'finance',description:'销售提成查询、核算状态与经营数据入口。',urlEnv:'VITE_APP_SALES_COMMISSION_URL',access:['general_manager','sales_vp','finance_vp','finance_manager','accountant'],actions:['查看核算周期','查看提成明细'],state:'ready'},
{id:'knowledge-base',name:'企业知识库',shortName:'知识库',department:'knowledge',description:'企业资料浏览、检索与知识沉淀入口。',urlEnv:'VITE_APP_KNOWLEDGE_BASE_URL',access:['general_manager','sales_vp','finance_vp','sales_manager','sales_team_lead','salesperson','project_coordinator','procurement_manager','procurement_team_lead','purchaser','quality_team','hr_director','admin_specialist','finance_manager','accountant','shipping_manager','shipping_operator','sales_support','market_team'],actions:['浏览知识资料','搜索已发布内容'],state:'ready'}]
export const initialTodos: Todo[] = [{id:'todo-01',title:'确认华东项目的技术支持安排',source:'跨部门计划',due:'今天 10:30',priority:'high'},{id:'todo-02',title:'审批客户报价 V2.1',source:'销售审批',due:'今天 14:00',priority:'high'},{id:'todo-03',title:'完成本周 AI 陪练复盘',source:'AI 销售陪练',due:'明天',priority:'medium'},{id:'todo-04',title:'核对 7 月销售提成数据',source:'销售提成',due:'8 月 12 日',priority:'normal'}]
export function appUrl(app: AppDefinition): string | undefined { return app.urlEnv ? import.meta.env[app.urlEnv]?.trim() || undefined : undefined }
export function canAccess(role: Role, app: AppDefinition): boolean { return app.access.includes(role) }

// 各部门强调色（组织架构图 / 账号与权限 共用，保证两页颜色一致）
export const DEPT_COLORS: Record<string, string> = {
  '总经理办公室': '#b45309',
  '人力总经办': '#0d9488',
  '销售部': '#2563eb',
  '采购部': '#16a34a',
  '销售支持组': '#7c3aed',
  '市场运营组': '#ea580c',
  '船务部': '#0891b2',
  '财务部': '#e11d48',
}

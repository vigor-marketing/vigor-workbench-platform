export type Role =
  | 'general_manager'
  | 'sales_vp'
  | 'finance_vp'
  | 'sales_manager'
  | 'salesperson'
  | 'procurement_manager'
  | 'finance_manager'

export type Actor = {
  id: string
  displayName: string
  role: Role
  organizationScope: string
}

export type TodoPriority = 'high' | 'medium' | 'normal'

export type Todo = {
  id: string
  title: string
  source: string
  dueAt: string
  priority: TodoPriority
  completed: boolean
  ownerId: string
}

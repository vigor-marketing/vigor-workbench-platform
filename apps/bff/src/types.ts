export type Role =
  | 'general_manager'
  | 'sales_vp'
  | 'finance_vp'
  | 'sales_manager'
  | 'salesperson'
  | 'procurement_manager'
  | 'finance_manager'
  | 'sales_team_lead' | 'project_coordinator'
  | 'procurement_team_lead' | 'purchaser' | 'quality_team'
  | 'hr_director' | 'admin_specialist' | 'accountant'
  | 'shipping_manager' | 'shipping_operator' | 'sales_support' | 'market_team'

export type Actor = {
  id: string
  displayName: string
  role: Role
  organizationScope: string
  isAdmin?: boolean
  teamId?: string
  teamName?: string
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
  overdue?: boolean
}
export type TodoEventInput = {
  eventId: string
  type: 'todo.created' | 'todo.completed' | 'todo.overdue'
  source: string
  todoId?: string
  title?: string
  dueAt?: string
  priority?: TodoPriority
}

import type { Role, Todo } from '../data/workbench'

type ApiTodo = {
  id: string
  title: string
  source: string
  dueAt: string
  priority: Todo['priority']
  completed: boolean
}

const apiBase = import.meta.env.VITE_PLATFORM_API_BASE?.replace(/\/$/, '') || '/api'

function headers(role: Role) {
  return { 'X-Demo-Role': role }
}

export async function fetchTodos(role: Role): Promise<Todo[]> {
  const response = await fetch(`${apiBase}/todos`, { headers: headers(role) })
  if (!response.ok) throw new Error(`待办读取失败（${response.status}）。`)
  const todos = await response.json() as ApiTodo[]
  return todos.map(todo => ({ ...todo, due: formatDue(todo.dueAt) }))
}

export async function updateTodo(role: Role, id: string, completed: boolean): Promise<Todo> {
  const response = await fetch(`${apiBase}/todos/${id}`, {
    method: 'PATCH',
    headers: { ...headers(role), 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  if (!response.ok) throw new Error(`待办更新失败（${response.status}）。`)
  const todo = await response.json() as ApiTodo
  return { ...todo, due: formatDue(todo.dueAt) }
}

function formatDue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '待确认时间'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

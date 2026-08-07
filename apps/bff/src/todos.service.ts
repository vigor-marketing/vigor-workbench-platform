import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Pool } from 'pg'
import { config } from './config.js'
import type { Actor, Todo } from './types.js'

const initialTodos: Todo[] = [
  { id: 'todo-01', title: '确认华东项目的技术支持安排', source: '跨部门计划', dueAt: '2026-08-07T10:30:00+08:00', priority: 'high', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-02', title: '审批客户报价 V2.1', source: '销售审批', dueAt: '2026-08-07T14:00:00+08:00', priority: 'high', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-03', title: '完成本周 AI 陪练复盘', source: 'AI 销售陪练', dueAt: '2026-08-08T18:00:00+08:00', priority: 'medium', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-04', title: '核对 7 月销售提成数据', source: '销售提成', dueAt: '2026-08-12T18:00:00+08:00', priority: 'normal', completed: false, ownerId: 'employee-chen' },
]

@Injectable()
export class TodosService implements OnModuleInit, OnModuleDestroy {
  private readonly memory = new Map(initialTodos.map(todo => [todo.id, todo]))
  private pool?: Pool

  async onModuleInit() {
    if (!config.databaseUrl) return
    this.pool = new Pool({ connectionString: config.databaseUrl })
    await this.pool.query('select 1')
  }

  async onModuleDestroy() { await this.pool?.end() }

  async list(actor: Actor): Promise<Todo[]> {
    if (!this.pool) return [...this.memory.values()].filter(todo => todo.ownerId === actor.id)
    const result = await this.pool.query<DbTodo>(
      'select id, title, source, due_at as "dueAt", priority, completed, owner_id as "ownerId" from workbench_todos where owner_id = $1 order by completed, due_at asc',
      [actor.id],
    )
    return result.rows.map(toTodo)
  }

  async setCompleted(actor: Actor, id: string, completed: boolean): Promise<Todo> {
    if (!this.pool) {
      const todo = this.memory.get(id)
      if (!todo || todo.ownerId !== actor.id) throw new NotFoundException('待办不存在或无权修改。')
      const updated = { ...todo, completed }
      this.memory.set(id, updated)
      return updated
    }
    const result = await this.pool.query<DbTodo>(
      'update workbench_todos set completed = $1, updated_at = now() where id = $2 and owner_id = $3 returning id, title, source, due_at as "dueAt", priority, completed, owner_id as "ownerId"',
      [completed, id, actor.id],
    )
    if (!result.rowCount) throw new NotFoundException('待办不存在或无权修改。')
    return toTodo(result.rows[0])
  }

  storageMode() { return this.pool ? 'postgres' : 'memory-demo' }
}

type DbTodo = Omit<Todo, 'dueAt'> & { dueAt: string | Date }

function toTodo(row: DbTodo): Todo {
  return { ...row, dueAt: new Date(row.dueAt).toISOString() }
}

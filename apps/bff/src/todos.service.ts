import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readFileSync as readTlsFileSync } from 'node:fs'
import { Pool } from 'pg'
import { config } from './config.js'
import type { Actor, Todo, TodoEventInput } from './types.js'

const initialTodos: Todo[] = [
  { id: 'todo-01', title: '确认华东项目的技术支持安排', source: '跨部门计划', dueAt: '2026-08-07T10:30:00+08:00', priority: 'high', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-02', title: '审批客户报价 V2.1', source: '销售审批', dueAt: '2026-08-07T14:00:00+08:00', priority: 'high', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-03', title: '完成本周 AI 陪练复盘', source: 'AI 销售陪练', dueAt: '2026-08-08T18:00:00+08:00', priority: 'medium', completed: false, ownerId: 'employee-chen' },
  { id: 'todo-04', title: '核对 7 月销售提成数据', source: '销售提成', dueAt: '2026-08-12T18:00:00+08:00', priority: 'normal', completed: false, ownerId: 'employee-chen' },
]

@Injectable()
export class TodosService implements OnModuleInit, OnModuleDestroy {
  private readonly memory = new Map(initialTodos.map(todo => [todo.id, todo]))
  private readonly handledEvents = new Set<string>()
  private pool?: Pool

  async onModuleInit() {
    if (config.todoStorage === 'file') { this.loadFileStore(); this.loadHandledEvents(); return }
    if (!config.databaseUrl) return
    const ssl = config.databaseSsl ? loadTlsConfig() : undefined
    this.pool = new Pool({ connectionString: config.databaseUrl, ssl })
    await this.pool.query('select 1')
  }
  async onModuleDestroy() { await this.pool?.end() }

  async list(actor: Actor): Promise<Todo[]> {
    if (!this.pool) return [...this.memory.values()].filter(todo => todo.ownerId === actor.id).sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueAt.localeCompare(b.dueAt))
    const result = await this.pool.query<DbTodo>('select id, title, source, due_at as "dueAt", priority, completed, owner_id as "ownerId" from workbench_todos where owner_id = $1 order by completed, due_at asc', [actor.id])
    return result.rows.map(toTodo)
  }

  async setCompleted(actor: Actor, id: string, completed: boolean): Promise<Todo> {
    if (!this.pool) {
      const todo = this.requireOwnedTodo(actor, id)
      const updated = { ...todo, completed }
      this.memory.set(id, updated)
      this.persistIfFile()
      this.writeAudit({ type: 'todo.completed.manual', todoId: id, actorId: actor.id, completed })
      return updated
    }
    const result = await this.pool.query<DbTodo>('update workbench_todos set completed = $1, updated_at = now() where id = $2 and owner_id = $3 returning id, title, source, due_at as "dueAt", priority, completed, owner_id as "ownerId"', [completed, id, actor.id])
    if (!result.rowCount) throw new NotFoundException('待办不存在或无权修改。')
    return toTodo(result.rows[0])
  }

  async ingest(actor: Actor, event: TodoEventInput) {
    if (this.handledEvents.has(event.eventId)) return { accepted: true, duplicate: true }
    if (this.pool) throw new BadRequestException('PostgreSQL 待办事件存储尚未启用。')
    if (event.type === 'todo.created') {
      if (!event.title?.trim() || !event.dueAt || !event.priority) throw new BadRequestException('创建待办需要 title、dueAt 和 priority。')
      if (Number.isNaN(new Date(event.dueAt).getTime())) throw new BadRequestException('dueAt 必须为有效 ISO 时间。')
      const todoId = event.todoId?.trim() || 'todo-' + event.eventId
      const existing = this.memory.get(todoId)
      if (existing) {
        this.handledEvents.add(event.eventId)
        this.writeAudit({ type: event.type, eventId: event.eventId, source: event.source, todoId, actorId: actor.id, duplicateTodo: true })
        return { accepted: true, duplicate: true, todo: existing }
      }
      const todo: Todo = { id: todoId, title: event.title.trim(), source: event.source.trim() || '业务事件', dueAt: new Date(event.dueAt).toISOString(), priority: event.priority, completed: false, ownerId: actor.id }
      this.memory.set(todo.id, todo)
      this.persistIfFile()
      this.handledEvents.add(event.eventId)
      this.writeAudit({ type: event.type, eventId: event.eventId, source: todo.source, todoId: todo.id, actorId: actor.id })
      return { accepted: true, duplicate: false, todo }
    }
    if (!event.todoId?.trim()) throw new BadRequestException('完成或逾期待办需要 todoId。')
    const todo = this.requireOwnedTodo(actor, event.todoId)
    const updated = event.type === 'todo.completed' ? { ...todo, completed: true } : { ...todo, overdue: true, priority: 'high' as const }
    this.memory.set(todo.id, updated)
    this.persistIfFile()
    this.handledEvents.add(event.eventId)
    this.writeAudit({ type: event.type, eventId: event.eventId, source: event.source.trim() || '业务事件', todoId: todo.id, actorId: actor.id })
    return { accepted: true, duplicate: false, todo: updated }
  }

  storageMode() { return this.pool ? 'postgres' : config.todoStorage === 'file' ? 'file' : 'memory-demo' }

  private requireOwnedTodo(actor: Actor, id: string) {
    const todo = this.memory.get(id)
    if (!todo || todo.ownerId !== actor.id) throw new NotFoundException('待办不存在或无权修改。')
    return todo
  }
  private loadFileStore() {
    mkdirSync(dirname(config.todoFile), { recursive: true })
    if (!existsSync(config.todoFile)) { this.persistFileStore(); return }
    const stored = JSON.parse(readFileSync(config.todoFile, 'utf8')) as Todo[]
    if (!Array.isArray(stored)) throw new Error('待办存储文件格式无效。')
    this.memory.clear()
    for (const todo of stored) this.memory.set(todo.id, todo)
  }
  private loadHandledEvents() {
    if (!existsSync(config.auditFile)) return
    for (const line of readFileSync(config.auditFile, 'utf8').split(String.fromCharCode(10))) {
      if (!line) continue
      try { const row = JSON.parse(line) as { eventId?: string }; if (row.eventId) this.handledEvents.add(row.eventId) } catch { /* Ignore malformed historical audit line. */ }
    }
  }
  private persistIfFile() { if (config.todoStorage === 'file') this.persistFileStore() }
  private persistFileStore() {
    mkdirSync(dirname(config.todoFile), { recursive: true })
    const temporary = config.todoFile + '.tmp'
    writeFileSync(temporary, JSON.stringify([...this.memory.values()], null, 2) + String.fromCharCode(10), { mode: 0o600 })
    renameSync(temporary, config.todoFile)
  }
  private writeAudit(event: Record<string, unknown>) {
    mkdirSync(dirname(config.auditFile), { recursive: true })
    appendFileSync(config.auditFile, JSON.stringify({ at: new Date().toISOString(), ...event }) + String.fromCharCode(10), { mode: 0o600 })
  }
}
function loadTlsConfig() {
  if (!config.databaseSslCaPath || !config.databaseSslServername) throw new Error('DATABASE_SSL=true 时必须设置 DATABASE_SSL_CA_PATH 和 DATABASE_SSL_SERVERNAME。')
  return { ca: readTlsFileSync(config.databaseSslCaPath, 'utf8'), rejectUnauthorized: true, servername: config.databaseSslServername }
}
type DbTodo = Omit<Todo, 'dueAt'> & { dueAt: string | Date }
function toTodo(row: DbTodo): Todo { return { ...row, dueAt: new Date(row.dueAt).toISOString() } }

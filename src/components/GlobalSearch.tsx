import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { getOrgTree } from '../lib/server-auth'
import { apps as allApps, departments, type AppDefinition, type Role, type Todo } from '../data/workbench'
import { isAllowed, type PermissionMap } from '../lib/demo-auth'

type MenuItem = { label: string; href: string; admin: boolean }
const MENU: MenuItem[] = [
  { label: '工作总览', href: '/', admin: false },
  { label: '我的待办', href: '/todos', admin: false },
  { label: '个人账号', href: '/account', admin: false },
  { label: '组织架构', href: '/admin/org-chart', admin: false },
  { label: '账号与权限', href: '/admin/permissions', admin: true },
  { label: '岗位与权限', href: '/admin/app-permissions', admin: true },
  { label: '服务与授权', href: '/admin/api-services', admin: true },
  { label: '接入设置', href: '/settings', admin: true },
]

type Person = { id: string; name: string; englishName: string; department: string; team: string; role: string }

type Result = { key: string; group: string; title: string; sub: string; href: string; icon: string }

// 高亮匹配词
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return <>{text.slice(0, idx)}<b>{text.slice(idx, idx + q.length)}</b>{text.slice(idx + q.length)}</>
}

function todoHref(todo: Todo) {
  if (todo.source.includes('审批')) return '/todos'
  if (todo.source.includes('陪练')) return '/workspace/apps/ai-sales-coach'
  if (todo.source.includes('提成')) return '/workspace/apps/sales-commission'
  return '/todos'
}

export function GlobalSearch({ todos, permissions, role, isAdmin }: { todos: Todo[]; permissions: PermissionMap; role: string; isAdmin: boolean }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [people, setPeople] = useState<Person[]>([])
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { void getOrgTree().then(tree => setPeople(tree.flatMap(d => d.teams.flatMap(t => t.persons.map(p => ({ id: p.id, name: p.name, englishName: p.englishName, department: d.department, team: t.team, role: p.role })))))).catch(() => {}) }, [])

  useEffect(() => {
    const onDocDown = (event: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  const q = query.trim().toLowerCase()

  const results = useMemo<Result[]>(() => {
    if (!q) return []
    const list: Result[] = []
    // 菜单跳转
    for (const item of MENU) {
      if (item.admin && !isAdmin) continue
      if (!item.label.toLowerCase().includes(q)) continue
      list.push({ key: 'menu-' + item.label, group: '菜单跳转', title: item.label, sub: '直接打开该页面', href: item.href, icon: 'arrow' })
    }
    // 待办事项
    let n = 0
    for (const todo of todos) {
      if (n >= 3) break
      if (!todo.title.toLowerCase().includes(q) && !todo.source.toLowerCase().includes(q)) continue
      n++
      list.push({ key: 'todo-' + todo.id, group: '待办事项', title: todo.title, sub: todo.source + ' · ' + todo.due, href: todoHref(todo), icon: 'check' })
    }
    // 应用模块
    const usable = allApps.filter(app => isAllowed(permissions, role as Role, app))
    n = 0
    for (const app of usable) {
      if (n >= 3) break
      if (!app.name.toLowerCase().includes(q) && !app.description.toLowerCase().includes(q)) continue
      n++
      list.push({ key: 'app-' + app.id, group: '应用模块', title: app.name, sub: departmentsOf(app) + ' · ' + app.description, href: '/workspace/apps/' + app.id, icon: 'external' })
    }
    // 人员
    n = 0
    for (const p of people) {
      if (n >= 3) break
      if (!p.name.toLowerCase().includes(q) && !p.englishName.toLowerCase().includes(q) && !p.department.toLowerCase().includes(q) && !p.role.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) continue
      n++
      list.push({ key: 'person-' + p.id, group: '人员', title: p.name, sub: p.englishName + ' · ' + p.department + (p.team !== p.department ? ' / ' + p.team : ''), href: '/admin/org-chart', icon: 'user' })
    }
    return list
  }, [q, todos, permissions, role, isAdmin, people])

  const go = (item: Result) => { setOpen(false); setQuery(''); setActive(-1); navigate(item.href) }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return }
    if (!results.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(a => (a + 1) % results.length) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(a => (a <= 0 ? results.length - 1 : a - 1)) }
    else if (event.key === 'Enter') { event.preventDefault(); if (active >= 0 && results[active]) go(results[active]) }
  }

  const groups: { group: string; items: Result[] }[] = []
  for (const item of results) { const g = groups.find(x => x.group === item.group); if (g) g.items.push(item); else groups.push({ group: item.group, items: [item] }) }

  return <div className="global-search" ref={wrapRef}>
    <div className="global-search-box">
      <Icon name="search" size={14} />
      <input ref={inputRef} value={query} placeholder="搜索待办、应用、人员…" onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1) }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} aria-label="全局搜索" />
      {query && <button type="button" className="global-search-clear" aria-label="清空" onClick={() => { setQuery(''); inputRef.current?.focus() }}>✕</button>}
    </div>
    {open && q && <div className="global-search-drop" role="listbox">
      {groups.map(g => <div className="global-search-group" key={g.group}>
        <div className="global-search-group-label">{g.group}</div>
        {g.items.map((item, gi) => {
          const idx = results.indexOf(item)
          return <button type="button" key={item.key} role="option" aria-selected={idx === active} className={'global-search-item' + (idx === active ? ' active' : '')} onMouseEnter={() => setActive(idx)} onClick={() => go(item)}>
            <i><Icon name={item.icon as any} size={14} /></i>
            <span><b><Highlight text={item.title} query={q} /></b><small><Highlight text={item.sub} query={q} /></small></span>
            <em>↵</em>
          </button>
        })}
      </div>)}
      {!groups.length && <div className="global-search-empty">没有匹配「{query}」的结果</div>}
    </div>}
  </div>
}

function departmentsOf(app: AppDefinition) { return departments[app.department].label }

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

type View = { level: 1 } | { level: 2; department: string } | { level: 3; department: string; team: string }

type Editor =
  | { kind: 'department'; mode: 'add' }
  | { kind: 'department'; mode: 'edit'; oldName: string }
  | { kind: 'team'; mode: 'add'; department: string }
  | { kind: 'team'; mode: 'edit'; department: string; oldTeam: string }
  | { kind: 'person'; mode: 'add'; department: string; team: string }
  | { kind: 'person'; mode: 'edit'; id: string }

export function OrgChartPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [view, setView] = useState<View>({ level: 1 })
  const [editor, setEditor] = useState<Editor | null>(null)
  const [form, setForm] = useState({ department: '', team: '', role: '成员', name: '', englishName: '' })
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/org/tree', { credentials: 'include' })
      if (!r.ok) throw new Error('加载组织架构失败，请刷新重试。')
      setTree(await r.json() as OrgDeptNode[])
    } catch (e) { setMessage(e instanceof Error ? e.message : '加载失败') }
  }, [])
  useEffect(() => { void load() }, [load])

  const allPersons = useMemo(() => tree.flatMap(d => d.teams.flatMap(t => t.persons)), [tree])
  const total = allPersons.length
  const curDeptName = view.level === 2 || view.level === 3 ? view.department : undefined
  const currentDept = curDeptName ? tree.find(d => d.department === curDeptName) : undefined
  const currentTeam = view.level === 3 ? currentDept?.teams.find(t => t.team === view.team) : undefined

  if (currentUser.isAdmin !== true) {
    return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可维护组织架构</h2></div></section>
  }

  const openEditor = (ed: Editor) => {
    setEditor(ed)
    if (ed.kind === 'department') setForm({ ...form, department: ed.mode === 'edit' ? ed.oldName : '' })
    else if (ed.kind === 'team') setForm({ ...form, department: ed.department, team: ed.mode === 'edit' ? ed.oldTeam : '' })
    else if (ed.kind === 'person' && ed.mode === 'add') setForm({ department: ed.department, team: ed.team, role: '成员', name: '', englishName: '' })
    else if (ed.kind === 'person' && ed.mode === 'edit') {
      const p = allPersons.find(x => x.id === ed.id)
      setForm(p ? { department: p.department, team: p.team, role: p.role, name: p.name, englishName: p.englishName } : form)
    }
    setMessage('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const send = async (url: string, method: string, body?: object) => {
      const r = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({})))?.message) || '操作失败。')
    }
    setMessage('正在保存…')
    try {
      if (editor.kind === 'department') {
        if (editor.mode === 'add') await send('/api/org/departments', 'POST', { name: form.department })
        else await send(`/api/org/departments/${encodeURIComponent(editor.oldName)}`, 'PUT', { name: form.department })
      } else if (editor.kind === 'team') {
        if (editor.mode === 'add') await send('/api/org/teams', 'POST', { department: form.department, team: form.team })
        else await send(`/api/org/teams/${encodeURIComponent(editor.oldTeam)}`, 'PUT', { department: form.department, team: form.team })
      } else if (editor.kind === 'person') {
        const body = { department: form.department, team: form.team, role: form.role, name: form.name, englishName: form.englishName }
        if (editor.mode === 'add') await send('/api/org/persons', 'POST', body)
        else await send(`/api/org/persons/${editor.id}`, 'PUT', body)
      }
      setMessage('已保存。'); setEditor(null); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '保存失败') }
  }

  const doDelete = async (url: string, label: string, extraConfirm = '') => {
    const resetToRoot = view.level !== 1 && view.department === label
    if (!window.confirm(`删除${extraConfirm}「${label}」？此操作不可恢复。`)) return
    try {
      const r = await fetch(url, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({})))?.message) || '删除失败。')
      setMessage(`已删除「${label}」。`); await load()
      if (resetToRoot) setView({ level: 1 })
    } catch (e) { setMessage(e instanceof Error ? e.message : '删除失败') }
  }

  const editorTitle = editor ? editor.kind === 'department' ? (editor.mode === 'add' ? '新增部门' : '编辑部门') : editor.kind === 'team' ? (editor.mode === 'add' ? '新增二级部门' : '编辑二级部门') : (editor.mode === 'add' ? '新增人员' : '编辑人员') : ''
  const departments = tree.map(d => d.department)
  const headerAction = view.level === 1
    ? { label: '新增部门', ed: { kind: 'department' as const, mode: 'add' as const } }
    : view.level === 2
    ? { label: '新增二级部门', ed: { kind: 'team' as const, mode: 'add' as const, department: view.department } }
    : { label: '新增人员', ed: { kind: 'person' as const, mode: 'add' as const, department: view.department, team: view.team } }

  const crumbDept = view.level === 2 || view.level === 3 ? view.department : undefined
  const crumbTeam = view.level === 3 ? view.team : undefined

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门，点卡片逐级打开</p></div>
      <button type="button" className="primary-button" onClick={() => openEditor(headerAction.ed)}>{headerAction.label}</button>
    </div>

    {message && <p className="org-chart-message" role="status">{message}</p>}

    <div className="org-breadcrumb">
      <button type="button" onClick={() => setView({ level: 1 })}>组织架构</button>
      {crumbDept && <><Icon name="arrow" size={12} /><button type="button" onClick={() => setView({ level: 2, department: crumbDept })}>{crumbDept}</button></>}
      {crumbTeam && <><Icon name="arrow" size={12} /><b>{crumbTeam}</b></>}
    </div>

    {view.level === 1 && <div className="module-grid">
      {tree.map(d => <div className="module-card" key={d.department}>
        <div className="module-card-main" onClick={() => setView({ level: 2, department: d.department })}>
          <span className="module-name">{d.department}</span>
          <span className="module-count">{d.teams.reduce((m, t) => m + t.persons.length, 0)} 人 · {d.teams.length} 组</span>
        </div>
        <span className="module-actions">
          <button type="button" onClick={() => openEditor({ kind: 'team', mode: 'add', department: d.department })}>＋组</button>
          <button type="button" onClick={() => openEditor({ kind: 'department', mode: 'edit', oldName: d.department })}>编辑</button>
          <button type="button" className="danger" onClick={() => void doDelete(`/api/org/departments/${encodeURIComponent(d.department)}?force=true`, d.department, `部门，其下 ${d.teams.reduce((m, t) => m + t.persons.length, 0)} 人将一并`)}>删除</button>
        </span>
      </div>)}
      {tree.length === 0 && <div className="org-empty">暂无部门，点右上角「新增部门」创建。</div>}
    </div>}

    {view.level === 2 && currentDept && <div className="module-grid">
      {currentDept.teams.map(t => <div className="module-card sub" key={t.team}>
        <div className="module-card-main" onClick={() => setView({ level: 3, department: currentDept.department, team: t.team })}>
          <span className="module-name">{t.team}</span>
          <span className="module-count">{t.persons.length} 人</span>
        </div>
        <span className="module-actions">
          <button type="button" onClick={() => openEditor({ kind: 'person', mode: 'add', department: currentDept.department, team: t.team })}>＋人员</button>
          <button type="button" onClick={() => openEditor({ kind: 'team', mode: 'edit', department: currentDept.department, oldTeam: t.team })}>编辑</button>
          <button type="button" className="danger" onClick={() => void doDelete(`/api/org/teams?department=${encodeURIComponent(currentDept.department)}&team=${encodeURIComponent(t.team)}&force=true`, t.team, `二级部门，其下 ${t.persons.length} 人将一并`)}>删除</button>
        </span>
      </div>)}
      {currentDept.teams.length === 0 && <div className="org-empty">暂无二级部门，点右上角「新增二级部门」创建。</div>}
    </div>}

    {view.level === 3 && currentDept && currentTeam && <div className="org-people-card">
      {currentTeam.persons.map(p => <div className="org-person" key={p.id}>
        <span className="org-dot" />
        <span className="org-person-name">{p.name}</span>
        <span className="org-person-meta">{p.englishName}{p.role ? ' · ' + p.role : ''}</span>
        <span className="org-person-actions">
          <button type="button" onClick={() => openEditor({ kind: 'person', mode: 'edit', id: p.id })}>编辑</button>
          <button type="button" className="danger" onClick={() => void doDelete(`/api/org/persons/${p.id}`, p.name)}>删除</button>
        </span>
      </div>)}
      {currentTeam.persons.length === 0 && <div className="org-empty">暂无人员，点右上角「新增人员」添加。</div>}
    </div>}

    {editor && <div className="org-modal-backdrop" onClick={() => setEditor(null)}>
      <form className="org-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>{editorTitle}</h3>
        <div className="org-modal-fields">
          {editor.kind === 'department' && <label>部门名称<input autoFocus required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label>}
          {editor.kind === 'team' && <>
            <label>所属部门<input required value={form.department} list="org-dept-list" onChange={e => setForm({ ...form, department: e.target.value })} /></label>
            <label>二级部门名称<input autoFocus required value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></label>
          </>}
          {editor.kind === 'person' && <>
            <label>姓名<input autoFocus required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>英文名<input required value={form.englishName} onChange={e => setForm({ ...form, englishName: e.target.value })} /></label>
            <label>部门<input required value={form.department} list="org-dept-list" onChange={e => setForm({ ...form, department: e.target.value })} /></label>
            <label>二级部门<input required value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></label>
            <label>组织角色<input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></label>
          </>}
          <datalist id="org-dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist>
        </div>
        <div className="org-modal-actions">
          <button type="submit" className="primary-button">保存</button>
          <button type="button" onClick={() => setEditor(null)}>取消</button>
        </div>
      </form>
    </div>}
  </section>
}

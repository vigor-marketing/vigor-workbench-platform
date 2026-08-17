import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

type Editor =
  | { kind: 'department'; mode: 'add' }
  | { kind: 'department'; mode: 'edit'; oldName: string }
  | { kind: 'team'; mode: 'add'; department: string }
  | { kind: 'team'; mode: 'edit'; department: string; oldTeam: string }
  | { kind: 'person'; mode: 'add'; department: string; team: string }
  | { kind: 'person'; mode: 'edit'; id: string }

export function OrgChartPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set())
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set())
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

  if (currentUser.isAdmin !== true) {
    return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可维护组织架构</h2></div></section>
  }

  const toggleDept = (name: string) => setOpenDepts(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  const toggleTeam = (key: string) => setOpenTeams(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

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

  const removeDept = async (d: OrgDeptNode) => {
    const count = d.teams.reduce((m, t) => m + t.persons.length, 0)
    if (!window.confirm(`删除部门「${d.department}」${count ? `，其下 ${count} 人将一并删除` : ''}？此操作不可恢复。`)) return
    try {
      const r = await fetch(`/api/org/departments/${encodeURIComponent(d.department)}?force=true`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({})))?.message) || '删除失败。')
      setMessage(`已删除「${d.department}」。`); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '删除失败') }
  }
  const removeTeam = async (d: OrgDeptNode, team: string) => {
    const t = d.teams.find(x => x.team === team); const count = t?.persons.length ?? 0
    if (!window.confirm(`删除二级部门「${team}」${count ? `，其下 ${count} 人将一并删除` : ''}？此操作不可恢复。`)) return
    try {
      const r = await fetch(`/api/org/teams?department=${encodeURIComponent(d.department)}&team=${encodeURIComponent(team)}&force=true`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({})))?.message) || '删除失败。')
      setMessage(`已删除「${team}」。`); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '删除失败') }
  }
  const removePerson = async (p: OrgPerson) => {
    if (!window.confirm(`确定从组织架构删除「${p.name}」？`)) return
    try {
      const r = await fetch(`/api/org/persons/${p.id}`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error('删除失败。')
      setMessage(`已删除「${p.name}」。`); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '删除失败') }
  }

  const editorTitle = editor ? editor.kind === 'department' ? (editor.mode === 'add' ? '新增部门' : '编辑部门') : editor.kind === 'team' ? (editor.mode === 'add' ? '新增二级部门' : '编辑二级部门') : (editor.mode === 'add' ? '新增人员' : '编辑人员') : ''
  const departments = tree.map(d => d.department)

  return <section className="org-chart-page">
    <header className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门。点击部门/二级部门展开查看与修改，结果即时供选择器与 API 调用。</p></div>
      <button type="button" className="primary-button" onClick={() => openEditor({ kind: 'department', mode: 'add' })}>新增部门 <Icon name="arrow" /></button>
    </header>

    {message && <p className="org-chart-message" role="status">{message}</p>}

    <div className="org-chart">
      {tree.map(d => {
        const open = openDepts.has(d.department)
        const count = d.teams.reduce((m, t) => m + t.persons.length, 0)
        return <div className={'org-card' + (open ? ' open' : '')} key={d.department}>
          <button type="button" className="org-card-head" onClick={() => toggleDept(d.department)} aria-expanded={open}>
            <span className="org-card-mark">{d.department.slice(0, 1)}</span>
            <span className="org-card-title">{d.department}</span>
            <span className="org-card-count">{count} 人</span>
            <span className={'org-chevron' + (open ? ' open' : '')}><Icon name="arrow" size={14} /></span>
          </button>
          <div className="org-card-body">
            <div className="org-card-tools">
              <button type="button" onClick={() => openEditor({ kind: 'team', mode: 'add', department: d.department })}>+ 二级部门</button>
              <button type="button" onClick={() => openEditor({ kind: 'department', mode: 'edit', oldName: d.department })}>编辑</button>
              <button type="button" className="danger" onClick={() => void removeDept(d)}>删除</button>
            </div>
            {d.teams.map(t => {
              const key = d.department + '|' + t.team
              const tOpen = openTeams.has(key)
              return <div className={'org-team' + (tOpen ? ' open' : '')} key={key}>
                <button type="button" className="org-team-head" onClick={() => toggleTeam(key)} aria-expanded={tOpen}>
                  <span className="org-team-name">{t.team}</span>
                  <span className="org-card-count">{t.persons.length} 人</span>
                  <span className={'org-chevron' + (tOpen ? ' open' : '')}><Icon name="arrow" size={12} /></span>
                </button>
                <div className="org-team-body">
                  <div className="org-card-tools">
                    <button type="button" onClick={() => openEditor({ kind: 'person', mode: 'add', department: d.department, team: t.team })}>+ 人员</button>
                    <button type="button" onClick={() => openEditor({ kind: 'team', mode: 'edit', department: d.department, oldTeam: t.team })}>编辑</button>
                    <button type="button" className="danger" onClick={() => void removeTeam(d, t.team)}>删除</button>
                  </div>
                  {t.persons.map(p => <div className="org-person-row" key={p.id}>
                    <span className="org-avatar">{p.name.slice(0, 1)}</span>
                    <span className="org-person-main"><b>{p.name}</b><small>{p.englishName}{p.role ? ' · ' + p.role : ''}</small></span>
                    <span className="org-person-row-actions">
                      <button type="button" onClick={() => openEditor({ kind: 'person', mode: 'edit', id: p.id })}>编辑</button>
                      <button type="button" className="danger" onClick={() => void removePerson(p)}>删除</button>
                    </span>
                  </div>)}
                  {t.persons.length === 0 && <p className="org-empty">暂无人员，点上方「+ 人员」添加。</p>}
                </div>
              </div>
            })}
            {d.teams.length === 0 && <p className="org-empty">暂无二级部门，点上方「+ 二级部门」创建。</p>}
          </div>
        </div>
      })}
      {tree.length === 0 && <div className="org-picker-empty"><p>暂无部门，点右上角「新增部门」创建。</p></div>}
    </div>

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

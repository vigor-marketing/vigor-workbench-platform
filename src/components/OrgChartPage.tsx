import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeam = { team: string; persons: OrgPerson[] }
type OrgDept = { department: string; teams: OrgTeam[] }

const emptyForm = { department: '', team: '', role: '成员', name: '', englishName: '' }

export function OrgChartPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  const [tree, setTree] = useState<OrgDept[]>([])
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/org/tree', { credentials: 'include' })
      if (!r.ok) throw new Error('加载组织架构失败，请刷新重试。')
      setTree(await r.json() as OrgDept[])
    } catch (e) { setMessage(e instanceof Error ? e.message : '加载失败') }
  }, [])

  useEffect(() => { void load() }, [load])

  if (currentUser.isAdmin !== true) {
    return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可维护组织架构</h2></div></section>
  }

  const openAdd = () => { setIsNew(true); setEditingId(null); setForm(emptyForm); setMessage('') }
  const openEdit = (p: OrgPerson) => { setIsNew(false); setEditingId(p.id); setForm({ department: p.department, team: p.team, role: p.role, name: p.name, englishName: p.englishName }); setMessage('') }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const url = editingId ? `/api/org/persons/${editingId}` : '/api/org/persons'
    const method = editingId ? 'PUT' : 'POST'
    setMessage('正在保存…')
    try {
      const r = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!r.ok) throw new Error(((await r.json().catch(() => ({})))?.message) || '保存失败。')
      setMessage('已保存。'); setEditingId(null); setIsNew(false); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '保存失败') }
  }

  const remove = async (p: OrgPerson) => {
    if (!window.confirm(`确定从组织架构删除「${p.name}」？`)) return
    try {
      const r = await fetch(`/api/org/persons/${p.id}`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error('删除失败。')
      setMessage(`已删除「${p.name}」。`); await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : '删除失败') }
  }

  const total = tree.reduce((n, d) => n + d.teams.reduce((m, t) => m + t.persons.length, 0), 0)
  const departments = tree.map(d => d.department)

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门。维护结果即时供组织选择器与各程序 API 调用。</p></div>
      <button type="button" className="primary-button" onClick={openAdd}>新增人员 <Icon name="arrow" /></button>
    </div>
    {message && <p className="org-chart-message" role="status">{message}</p>}

    <div className="org-chart-grid">
      {tree.map(d => <section className="org-chart-card" key={d.department}>
        <header className="org-chart-card-head"><h2>{d.department}</h2><span>{d.teams.reduce((m, t) => m + t.persons.length, 0)} 人</span></header>
        {d.teams.map(t => <div className="org-chart-team" key={t.team}>
          {d.teams.length > 1 && <h3>{t.team}</h3>}
          {t.persons.map(p => <div className="org-chart-person" key={p.id}>
            <span className="org-avatar">{p.name.slice(0, 1)}</span>
            <div className="org-person-main"><b>{p.name}</b><small>{p.englishName}{p.role ? ' · ' + p.role : ''}</small></div>
            <div className="org-chart-person-actions">
              <button type="button" onClick={() => openEdit(p)}>编辑</button>
              <button type="button" className="danger" onClick={() => void remove(p)}>删除</button>
            </div>
          </div>)}
        </div>)}
      </section>)}
      {tree.length === 0 && <div className="org-picker-empty"><p>暂无人员数据。</p></div>}
    </div>

    {(editingId || isNew) && <form className="org-chart-editor" onSubmit={submit}>
      <h3>{isNew ? '新增人员' : '编辑人员'}</h3>
      <div className="org-chart-fields">
        <label>姓名<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>英文名<input required value={form.englishName} onChange={e => setForm({ ...form, englishName: e.target.value })} /></label>
        <label>部门<input required value={form.department} list="org-dept-list" onChange={e => setForm({ ...form, department: e.target.value })} /></label>
        <datalist id="org-dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist>
        <label>团队<input required value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></label>
        <label>组织角色<input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></label>
      </div>
      <div className="org-chart-editor-actions">
        <button type="submit" className="primary-button">保存</button>
        <button type="button" onClick={() => { setEditingId(null); setIsNew(false) }}>取消</button>
      </div>
    </form>}
  </section>
}

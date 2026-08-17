import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeam = { team: string; persons: OrgPerson[] }
type OrgDept = { department: string; teams: OrgTeam[] }

export function OrgPickerPage() {
  const [params] = useSearchParams()
  const mode: 'single' | 'multi' = params.get('mode') === 'multi' ? 'multi' : 'single'
  const title = params.get('title') || '选择人员'
  const token = params.get('token') || ''
  const [tree, setTree] = useState<OrgDept[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'group' | 'flat'>('group')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/org/tree', { credentials: 'include', headers: token ? { 'X-Picker-Token': token } : {} })
      .then(resp => { if (!resp.ok) throw new Error('未登录或无权访问组织数据'); return resp.json() as Promise<OrgDept[]> })
      .then(setTree)
      .catch(err => setError(err instanceof Error ? err.message : '加载失败'))
  }, [token])

  const allPersons = useMemo(() => tree.flatMap(d => d.teams.flatMap(t => t.persons)), [tree])
  const q = query.trim().toLowerCase()
  const match = (p: OrgPerson) => !q || p.name.toLowerCase().includes(q) || p.englishName.toLowerCase().includes(q) || p.department.includes(q) || p.team.includes(q) || p.role.includes(q)

  const groups = useMemo(() => {
    const gs: { label: string; dept: string; persons: OrgPerson[] }[] = []
    for (const d of tree) for (const t of d.teams) {
      const persons = t.persons.filter(match)
      if (persons.length) gs.push({ label: t.team, dept: d.department, persons })
    }
    return gs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, query])

  const flat = useMemo(() => allPersons.filter(match).sort((a, b) => a.englishName.localeCompare(b.englishName)), [allPersons, query])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (mode === 'single') { next.clear(); next.add(id) }
      else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const groupAll = (ids: string[]) => ids.length > 0 && ids.every(id => selected.has(id))
  const toggleGroup = (persons: OrgPerson[]) => {
    const ids = persons.map(p => p.id); const on = !groupAll(ids)
    setSelected(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next })
  }
  const setGroup = (persons: OrgPerson[], on: boolean) => {
    const ids = persons.map(p => p.id)
    setSelected(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next })
  }
  const selectAll = () => setSelected(new Set(flat.map(p => p.id)))
  const clearAll = () => setSelected(new Set())

  const selectedPersons = allPersons.filter(p => selected.has(p.id))
  const close = () => { if (window.opener) window.close(); else setError('') }
  const confirm = () => {
    const result = { type: 'vigor.org.picker.result', mode, persons: selectedPersons }
    if (window.opener) { window.opener.postMessage(result, '*'); window.close() }
    else setError('选择结果：\n' + JSON.stringify(result, null, 2))
  }

  const renderPerson = (p: OrgPerson) => {
    const on = selected.has(p.id)
    return <button type="button" className={'org-person' + (on ? ' selected' : '')} key={p.id} onClick={() => toggle(p.id)}>
      <span className={'org-check' + (mode === 'single' ? ' radio' : '')}>{on ? <Icon name="check" size={13} /> : null}</span>
      <span className="org-person-name">{p.name}</span>
      <span className="org-person-en">{p.englishName}</span>
      {p.role && <span className="org-person-role">{p.role}</span>}
    </button>
  }

  return <section className="org-picker">
    <header className="org-picker-head">
      <h1>{title}</h1>
      <span className="org-picker-selected">{selected.size} 人已选</span>
      <button type="button" className="org-picker-close" onClick={close} aria-label="关闭">✕</button>
    </header>

    <div className="org-picker-tabs">
      <button type="button" className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>按分组</button>
      <button type="button" className={tab === 'flat' ? 'active' : ''} onClick={() => setTab('flat')}>按姓名</button>
    </div>

    <div className="org-picker-search">
      <Icon name="search" size={15} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="按员工姓名、账号、部门模糊查询" autoFocus />
    </div>

    {mode === 'multi' && <div className="org-picker-bulk">
      <span className="org-picker-hint">ps:点击分组可全选/清空组内员工</span>
      <div className="org-picker-bulk-btns">
        <button type="button" onClick={selectAll}>全选</button>
        <button type="button" onClick={clearAll}>清空所有</button>
      </div>
    </div>}

    {error && <p className="org-picker-error" role="status">{error}</p>}

    <div className="org-picker-list">
      {tab === 'group' ? groups.map(g => {
        const ids = g.persons.map(p => p.id); const all = groupAll(ids)
        return <div className="org-group" key={g.dept + '|' + g.label}>
          <div className="org-group-head" onClick={() => mode === 'multi' && toggleGroup(g.persons)}>
            <span className={'org-check' + (all ? ' checked' : '')}>{all ? <Icon name="check" size={12} /> : null}</span>
            <span className="org-group-name">{g.label}</span>
            {g.dept !== g.label && <span className="org-group-dept">{g.dept}</span>}
            <span className="org-group-count">{g.persons.length}</span>
            {mode === 'multi' && <span className="org-group-actions" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => setGroup(g.persons, true)}>全选本组</button>
              <button type="button" onClick={() => setGroup(g.persons, false)}>清空本组</button>
            </span>}
          </div>
          <div className="org-group-body">{g.persons.map(renderPerson)}</div>
        </div>
      }) : <div className="org-flat-list">{flat.map(renderPerson)}</div>}
      {(tab === 'group' ? groups.length : flat.length) === 0 && <div className="org-picker-empty"><Icon name="search" size={22} /><p>{query ? '没有匹配的员工。' : '暂无人员数据。'}</p></div>}
    </div>

    <footer className="org-picker-foot">
      <span>{selected.size} 人已选</span>
      <div className="org-picker-foot-btns">
        <button type="button" className="org-btn-primary" disabled={selected.size === 0} onClick={confirm}>确定</button>
        <button type="button" className="org-btn-plain" onClick={close}>关闭</button>
      </div>
    </footer>
  </section>
}

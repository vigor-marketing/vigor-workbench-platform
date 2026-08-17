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
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/org/tree', { credentials: 'include', headers: token ? { 'X-Picker-Token': token } : {} })
      .then(resp => { if (!resp.ok) throw new Error('未登录或无权访问组织数据'); return resp.json() as Promise<OrgDept[]> })
      .then(setTree)
      .catch(err => setError(err instanceof Error ? err.message : '加载失败'))
  }, [token])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (mode === 'single') { next.clear(); next.add(id) }
      else if (next.has(id)) { next.delete(id) }
      else { next.add(id) }
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tree
    return tree.map(d => ({
      ...d,
      teams: d.teams.map(t => ({
        ...t,
        persons: t.persons.filter(p =>
          p.name.toLowerCase().includes(q) || p.englishName.toLowerCase().includes(q) ||
          p.department.includes(q) || p.team.includes(q) || p.role.includes(q),
        ),
      })).filter(t => t.persons.length > 0),
    })).filter(d => d.teams.length > 0)
  }, [tree, query])

  const flat = useMemo(() => filtered.flatMap(d => d.teams.flatMap(t => t.persons)), [filtered])
  const allFlat = useMemo(() => tree.flatMap(d => d.teams.flatMap(t => t.persons)), [tree])
  const selectedPersons = useMemo(() => allFlat.filter(p => selected.has(p.id)), [allFlat, selected])

  // 批量选择（多选模式）
  const deptIds = (d: OrgDept) => d.teams.flatMap(t => t.persons.map(p => p.id))
  const deptAllSelected = (d: OrgDept) => { const ids = deptIds(d); return ids.length > 0 && ids.every(id => selected.has(id)) }
  const toggleDepartment = (d: OrgDept) => {
    const ids = deptIds(d); const on = !deptAllSelected(d)
    setSelected(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next })
  }
  const setDepartment = (d: OrgDept, on: boolean) => {
    const ids = deptIds(d)
    setSelected(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next })
  }
  const selectAll = () => setSelected(new Set(flat.map(p => p.id)))
  const clearAll = () => setSelected(new Set())

  const confirm = () => {
    const result = { type: 'vigor.org.picker.result', mode, persons: selectedPersons }
    if (window.opener) {
      window.opener.postMessage(result, '*')
      window.close()
    } else {
      setError('选择结果：\n' + JSON.stringify(result, null, 2))
    }
  }

  const total = allFlat.length

  return <section className="org-picker">
    <header className="org-picker-head">
      <div>
        <p className="eyebrow">ORG PICKER · {mode === 'single' ? '单选' : '多选'}</p>
        <h1>{title}</h1>
        <p className="subtle">共 {total} 人 · 已选 {selected.size} 人</p>
      </div>
      <button type="button" className="plain-action" onClick={() => window.opener ? window.close() : setError('')}><Icon name="external" size={16} />取消</button>
    </header>

    <div className="org-picker-search">
      <Icon name="search" size={16} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="按姓名 / 英文名 / 部门 / 团队 / 角色模糊查询" autoFocus />
    </div>

    {mode === 'multi' && <div className="org-picker-bulk">
      <span className="org-picker-hint">ps:点击部门可全选/清空部门下员工</span>
      <div className="org-picker-bulk-btns">
        <button type="button" onClick={selectAll}>全选</button>
        <button type="button" onClick={clearAll}>清空所有</button>
      </div>
    </div>}

    {error && <p className="org-picker-error" role="status">{error}</p>}

    <div className="org-picker-list">
      {filtered.map(d => {
        const ds = deptAllSelected(d)
        return <div className="org-dept" key={d.department}>
          <button type="button" className={'org-dept-title' + (ds ? ' all-selected' : '')} onClick={() => mode === 'multi' && toggleDepartment(d)}>
            <span className="org-dept-caret">{ds ? <Icon name="check" size={12} /> : null}</span>
            {d.department}
            <span className="org-dept-count">{d.teams.reduce((n, t) => n + t.persons.length, 0)}</span>
            {mode === 'multi' && <span className="org-dept-actions" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => setDepartment(d, true)}>全选本部门</button>
              <button type="button" onClick={() => setDepartment(d, false)}>清空本部门</button>
            </span>}
          </button>
          {d.teams.map(t => <div className="org-team" key={t.team}>
            {d.teams.length > 1 && <div className="org-team-title">{t.team}</div>}
            {t.persons.map(p => {
              const on = selected.has(p.id)
              return <button type="button" key={p.id} className={'org-person' + (on ? ' selected' : '')} onClick={() => toggle(p.id)}>
                <span className={'org-check' + (mode === 'single' ? ' radio' : '')}>{on ? <Icon name="check" size={13} /> : null}</span>
                <span className="org-avatar">{p.name.slice(0, 1)}</span>
                <span className="org-person-main"><b>{p.name}</b><small>{p.englishName}</small></span>
                <span className="org-person-meta">{p.role}{p.team !== p.department ? ' · ' + p.team : ''}</span>
              </button>
            })}
          </div>)}
        </div>
      })}
      {filtered.length === 0 && <div className="org-picker-empty"><Icon name="search" size={22} /><p>{query ? '没有匹配的人员。' : '暂无人员数据。'}</p></div>}
    </div>

    <footer className="org-picker-foot">
      <span>{selected.size} 人已选</span>
      <button type="button" className="primary-button" disabled={selected.size === 0} onClick={confirm}>确定 <Icon name="arrow" /></button>
    </footer>
  </section>
}

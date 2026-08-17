import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

type View = { level: 1 } | { level: 2; department: string } | { level: 3; department: string; team: string }

// 组织架构页：纯展示，逐级打开（部门 → 二级部门 → 人员）。维护请通过账号与权限。
export function OrgChartPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  if (currentUser.isAdmin !== true) {
    return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可查看组织架构</h2></div></section>
  }
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [view, setView] = useState<View>({ level: 1 })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/org/tree', { credentials: 'include' })
      if (!r.ok) throw new Error('加载组织架构失败，请刷新重试。')
      setTree(await r.json() as OrgDeptNode[])
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败') }
  }, [])
  useEffect(() => { void load() }, [load])

  const total = useMemo(() => tree.reduce((n, d) => n + d.teams.reduce((m, t) => m + t.persons.length, 0), 0), [tree])
  const curDeptName = view.level === 2 || view.level === 3 ? view.department : undefined
  const currentDept = curDeptName ? tree.find(d => d.department === curDeptName) : undefined
  const crumbTeam = view.level === 3 ? view.team : undefined

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门 · 只读展示，点卡片逐级打开</p></div>
    </div>
    {error && <p className="org-chart-message" role="status">{error}</p>}

    <div className="org-breadcrumb">
      <button type="button" onClick={() => setView({ level: 1 })}>组织架构</button>
      {curDeptName && <><Icon name="arrow" size={12} /><button type="button" onClick={() => setView({ level: 2, department: curDeptName })}>{curDeptName}</button></>}
      {crumbTeam && <><Icon name="arrow" size={12} /><b>{crumbTeam}</b></>}
    </div>

    {view.level === 1 && <div className="module-grid">
      {tree.map(d => <button type="button" className="module-card" key={d.department} onClick={() => setView({ level: 2, department: d.department })}>
        <span className="module-name">{d.department}</span>
        <span className="module-count">{d.teams.reduce((m, t) => m + t.persons.length, 0)} 人 · {d.teams.length} 组</span>
      </button>)}
      {tree.length === 0 && <div className="org-empty">暂无部门。</div>}
    </div>}

    {view.level === 2 && currentDept && <div className="module-grid">
      {currentDept.teams.map(t => <button type="button" className="module-card sub" key={t.team} onClick={() => setView({ level: 3, department: currentDept.department, team: t.team })}>
        <span className="module-name">{t.team}</span>
        <span className="module-count">{t.persons.length} 人</span>
      </button>)}
      {currentDept.teams.length === 0 && <div className="org-empty">暂无二级部门。</div>}
    </div>}

    {view.level === 3 && currentDept && (() => {
      const team = currentDept.teams.find(t => t.team === view.team)
      return <div className="org-people-card">
        {team?.persons.map(p => <div className="org-person" key={p.id}>
          <span className="org-dot" />
          <span className="org-person-name">{p.name}</span>
          <span className="org-person-meta">{p.englishName}{p.role ? ' · ' + p.role : ''}</span>
        </div>)}
        {(!team || team.persons.length === 0) && <div className="org-empty">暂无人员。</div>}
      </div>
    })()}
  </section>
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

// 组织架构图：经典连线树（总经理办公室 → 部门 → 二级部门 → 人员），只读展示
export function OrgChartPage({ currentUser }: { currentUser: { isAdmin?: boolean } }) {
  const [tree, setTree] = useState<OrgDeptNode[]>([])
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
  const leadership = tree.find(d => d.department === '总经理办公室')
  const departments = tree.filter(d => d.department !== '总经理办公室')

  if (currentUser.isAdmin !== true) {
    return <section className="page"><div className="state-card"><Icon name="lock" size={28} /><h2>仅管理员可查看组织架构</h2></div></section>
  }

  const renderPerson = (p: OrgPerson) => (
    <li key={p.id}>
      <div className="org-node-box">
        <div className="org-card-node person">
          <span className="org-person-avatar">{p.name.slice(0, 1)}</span>
          <b>{p.name}</b>
          <small>{p.englishName}</small>
          <em>{p.role}</em>
        </div>
      </div>
    </li>
  )
  const renderTeam = (t: OrgTeamNode, dept: string) => (
    <li key={dept + '|' + t.team}>
      <div className="org-node-box">
        <div className="org-card-node team"><b>{t.team}</b><small>{t.persons.length} 人</small></div>
      </div>
      <ul>{t.persons.map(renderPerson)}</ul>
    </li>
  )
  const renderDept = (d: OrgDeptNode) => {
    const count = d.teams.reduce((m, t) => m + t.persons.length, 0)
    const hasSubTeams = d.teams.length > 1 || (d.teams[0] && d.teams[0].team !== d.department)
    return (
      <li key={d.department}>
        <div className="org-node-box">
          <div className="org-card-node dept"><b>{d.department}</b><small>{count} 人</small></div>
        </div>
        {hasSubTeams ? <ul>{d.teams.map(t => renderTeam(t, d.department))}</ul> : <ul>{d.teams[0]?.persons.map(renderPerson) ?? []}</ul>}
      </li>
    )
  }

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门 · 只读展示</p></div>
    </div>
    {error && <p className="org-chart-message" role="status">{error}</p>}
    <div className="org-chart-canvas">
      <ul className="org-tree">
        <li>
          <div className="org-node-box">
            <div className="org-card-node root">
              <b>总经理办公室</b>
              <div className="org-root-leads">
                {(leadership?.teams[0]?.persons ?? []).map(p => <span key={p.id}>{p.name} · {p.role.replace(/部门负责人\/管理岗\/?/, '')}</span>)}
              </div>
            </div>
          </div>
          <ul>{departments.map(renderDept)}</ul>
        </li>
      </ul>
    </div>
  </section>
}

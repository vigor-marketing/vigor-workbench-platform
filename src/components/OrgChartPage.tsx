import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { getServerUsers } from '../lib/server-auth'
import { DEPT_COLORS } from '../data/workbench'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }


// 组织架构图（竖向）：根节点=总经理 → 部门区块（负责人头像 + 强调色）→ 团队分组 → 人员
export function OrgChartPage() {
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, users] = await Promise.all([fetch('/api/org/tree', { credentials: 'include' }), getServerUsers().catch(() => [])])
      if (!r.ok) throw new Error('加载组织架构失败，请刷新重试。')
      setTree(await r.json() as OrgDeptNode[])
      setAccounts(users as any[])
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败') }
  }, [])
  const accountOf = (personId: string) => accounts.find(u => u.username === personId)
  useEffect(() => { void load() }, [load])

  const total = useMemo(() => tree.reduce((n, d) => n + d.teams.reduce((m, t) => m + t.persons.length, 0), 0), [tree])
  const gm = useMemo(() => {
    const office = tree.find(d => d.department === '总经理办公室')
    return (office?.teams[0]?.persons ?? []).find(p => p.role.includes('总经理') && !p.role.includes('副总'))
  }, [tree])

  const headsOf = (d: OrgDeptNode) => {
    const heads: OrgPerson[] = []
    for (const t of d.teams) {
      const lead = t.persons.find(p => /经理|总监|总经理|副总/.test(p.role)) ?? t.persons[0]
      if (lead && !heads.some(h => h.id === lead.id)) heads.push(lead)
    }
    return heads
  }

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门 · 只读展示</p></div>
    </div>
    {error && <p className="org-chart-message" role="status">{error}</p>}

    <div className="org-chart-vertical">
      {gm && <div className="org-gm-node">
        <span className="org-gm-avatar">{gm.name.slice(0, 1)}</span>
        <div className="org-gm-main"><b>{gm.name}</b><small>{gm.role.replace(/部门负责人\/管理岗\/?/, '')}</small></div>
        <span className="org-gm-tag">总经理</span>
      </div>}

      {tree.map(d => {
        const count = d.teams.reduce((m, t) => m + t.persons.length, 0)
        const color = DEPT_COLORS[d.department] || '#15202c'
        const heads = headsOf(d)
        return <section className="org-dept-block" key={d.department} style={{ borderTop: `3px solid ${color}` }}>
          <header className="org-dept-block-head">
            <span className="org-dept-mark" style={{ background: color }}>{d.department.slice(0, 1)}</span>
            <h2>{d.department}</h2>
            {heads.length > 0 && <div className="org-dept-heads">{heads.map(h => (
              <span className="org-head-chip" key={h.id} title={`${h.name} · ${h.role}`}><i style={{ background: color }}>{h.name.slice(0, 1)}</i>{h.name}{accountOf(h.id)?.departmentHead && <em className="org-head-account">主管</em>}</span>
            ))}</div>}
            <small>{count} 人</small>
          </header>
          <div className="org-dept-block-body">
            {d.teams.map(t => (
              <div className="org-team-group" key={t.team}>
                {d.teams.length > 1 && <div className="org-team-group-title">{t.team} · {t.persons.length} 人</div>}
                <div className="org-person-chips">
                  {t.persons.filter(p => p.id !== gm?.id).map(p => (
                    <div className="org-person-chip" key={p.id}>
                      <span className="org-person-avatar">{p.name.slice(0, 1)}</span>
                      <div className="org-person-chip-main"><b>{p.name}</b><small>{p.englishName}{p.role ? ' · ' + p.role : ''}</small>
                        {(accountOf(p.id)?.departmentHead || accountOf(p.id)?.isAdmin) && <span className="org-person-marks">{accountOf(p.id)?.departmentHead && <em className="head">主管</em>}{accountOf(p.id)?.isAdmin && <em className="admin">管理员</em>}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      })}
    </div>
  </section>
}

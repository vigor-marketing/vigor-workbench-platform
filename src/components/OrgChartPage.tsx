import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }

// 组织架构图：竖向布局（根节点 → 部门区块 → 团队分组 → 人员卡片），只读展示
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

  return <section className="page org-chart-page">
    <div className="page-heading">
      <div><h1>组织架构</h1><p>共 {total} 人 · {tree.length} 个部门 · 只读展示</p></div>
    </div>
    {error && <p className="org-chart-message" role="status">{error}</p>}

    <div className="org-chart-vertical">
      <div className="org-root-card">
        <div className="org-root-title"><span className="org-root-mark">总</span><b>总经理办公室</b></div>
        <div className="org-root-leads">
          {(leadership?.teams[0]?.persons ?? []).map(p => <span key={p.id}><i>{p.name.slice(0, 1)}</i>{p.name} · {p.role.replace(/部门负责人\/管理岗\/?/, '')}</span>)}
        </div>
      </div>

      {departments.map(d => {
        const count = d.teams.reduce((m, t) => m + t.persons.length, 0)
        return <section className="org-dept-block" key={d.department}>
          <header className="org-dept-block-head">
            <span className="org-dept-mark">{d.department.slice(0, 1)}</span>
            <h2>{d.department}</h2>
            <small>{count} 人</small>
          </header>
          <div className="org-dept-block-body">
            {d.teams.map(t => (
              <div className="org-team-group" key={t.team}>
                {d.teams.length > 1 && <div className="org-team-group-title">{t.team} · {t.persons.length} 人</div>}
                <div className="org-person-chips">
                  {t.persons.map(p => (
                    <div className="org-person-chip" key={p.id}>
                      <span className="org-person-avatar">{p.name.slice(0, 1)}</span>
                      <div className="org-person-chip-main"><b>{p.name}</b><small>{p.englishName}{p.role ? ' · ' + p.role : ''}</small></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {d.teams.length === 0 && <div className="org-empty">暂无二级部门。</div>}
          </div>
        </section>
      })}
    </div>
  </section>
}

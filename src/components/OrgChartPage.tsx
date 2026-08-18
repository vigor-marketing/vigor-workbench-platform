import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { getAccountFields, getServerUsers, type AccountFields } from '../lib/server-auth'
import { DEPT_COLORS, roles, type Role } from '../data/workbench'

type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
type OrgTeamNode = { team: string; persons: OrgPerson[] }
type OrgDeptNode = { department: string; teams: OrgTeamNode[] }


// 组织架构图（竖向）：根节点=总经理 → 部门区块（负责人头像 + 强调色）→ 团队分组 → 人员
export function OrgChartPage() {
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [fields, setFields] = useState<AccountFields | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, f, u] = await Promise.all([fetch('/api/org/tree', { credentials: 'include' }), getAccountFields().catch(() => null), getServerUsers().catch(() => [])])
      if (!r.ok) throw new Error('加载组织架构失败，请刷新重试。')
      setTree(await r.json() as OrgDeptNode[])
      setFields(f); setAccounts(u as any[])
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败') }
  }, [])
  // 岗位显示与账号权限保持一致（以账号为准）：账号岗位ID → 改名覆盖 → 内置标签 → 原样
  const roleText = (role: string) => {
    if (!role) return ''
    if (fields?.roleLabels?.[role]) return fields.roleLabels[role]
    return roles[role as Role]?.label ?? role
  }
  // 人员岗位优先取账号角色（保证组织架构与账号权限两页映射一致），无账号时回退组织岗位
  const personRole = (personId: string, orgRole: string) => {
    const acc = accounts.find(u => u.username === personId)
    if (acc?.role) return roleText(acc.role)
    if (!orgRole) return ''
    for (const [id, item] of Object.entries(roles)) if (item.label === orgRole) return fields?.roleLabels?.[id] ?? item.label
    return orgRole
  }
  useEffect(() => { void load() }, [load])

  const total = useMemo(() => tree.reduce((n, d) => n + d.teams.reduce((m, t) => m + t.persons.length, 0), 0), [tree])
  const gm = useMemo(() => {
    const office = tree.find(d => d.department === '总经理办公室')
    return (office?.teams[0]?.persons ?? []).find(p => p.role.includes('总经理') && !p.role.includes('副总'))
  }, [tree])

  // 负责人优先：岗位含 经理/负责人/管理岗 的人员排在小组第一位
  const headRank = (role: string) => (/经理|总监|总经理|副总|负责人|管理岗/.test(role || '') ? 1 : 0)
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
        <div className="org-gm-main"><b>{gm.name}</b><small>{personRole(gm.id, gm.role).replace(/部门负责人\/管理岗\/?/, '')}</small></div>
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
              <span className="org-head-chip" key={h.id} title={`${h.name} · ${personRole(h.id, h.role)}`}><i style={{ background: color }}>{h.name.slice(0, 1)}</i>{h.name}</span>
            ))}</div>}
            <small>{count} 人</small>
          </header>
          <div className="org-dept-block-body">
            {d.teams.map(t => (
              <div className="org-team-group" key={t.team}>
                {d.teams.length > 1 && <div className="org-team-group-title">{t.team} · {t.persons.length} 人</div>}
                <div className="org-person-chips">
                  {t.persons.filter(p => p.id !== gm?.id).sort((a, b) => headRank(b.role) - headRank(a.role)).map(p => (
                    <div className="org-person-chip" key={p.id}>
                      <span className="org-person-avatar">{p.name.slice(0, 1)}</span>
                      <div className="org-person-chip-main"><b>{p.name}</b><small>{p.englishName}{personRole(p.id, p.role) ? ' · ' + personRole(p.id, p.role) : ''}</small></div>
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

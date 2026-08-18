import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getAccountFields, saveAccountFields, type AccountFields } from '../lib/server-auth'
import { DEPT_COLORS, roles, type Role } from '../data/workbench'

type Rename = { type: 'department' | 'team' | 'role'; from: string; to: string; department?: string }
type View = 'depts' | 'teams' | 'roles' | 'heads'

// 管理「账号 新增/修改」弹窗里的字段选项（部门/小组/岗位/部门主管岗位），每张表单独保存
export function AccountFieldsPage({ onSaved }: { onSaved?: () => void }) {
  const [base, setBase] = useState<AccountFields | null>(null)
  const [view, setView] = useState<View>('depts')
  const [depts, setDepts] = useState<string[]>([])
  const [teams, setTeams] = useState<Record<string, string[]>>({})
  const [customRoles, setCustomRoles] = useState<string[]>([])
  const [heads, setHeads] = useState<Record<string, string>>({})
  const [renames, setRenames] = useState<Rename[]>([])
  const [dirty, setDirty] = useState<Record<View, boolean>>({ depts: false, teams: false, roles: false, heads: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deptForTeams, setDeptForTeams] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newRole, setNewRole] = useState('')

  const load = async () => {
    try {
      const f = await getAccountFields()
      setBase(f); setDepts(f.departments); setTeams(f.teams); setCustomRoles(f.customRoles); setHeads(f.headRoles)
      setDeptForTeams(f.departments[0] ?? '')
      setRenames([]); setDirty({ depts: false, teams: false, roles: false, heads: false })
    } catch { setError('加载失败，请重新登录后再试。') }
  }
  useEffect(() => { void load() }, [])

  const builtinRoles = Object.entries(roles)
  const allRoleOptions = [...builtinRoles.map(([id, item]) => ({ value: id, label: item.label })), ...customRoles.map(r => ({ value: r, label: r }))]
  const accent = (dept: string) => DEPT_COLORS[dept] || '#15202c'
  const touch = (k: View) => { setSuccess(''); setDirty(d => ({ ...d, [k]: true })) }

  const renamesOf = (k: View) => renames.filter(r => (k === 'depts' && r.type === 'department') || (k === 'teams' && r.type === 'team') || (k === 'roles' && r.type === 'role'))

  const saveTable = async (k: View) => {
    if (!base) return
    const tableRenames = renamesOf(k)
    try {
      await saveAccountFields({ departments: depts, teams, customRoles, headRoles: heads, renames: tableRenames })
      setSuccess(k === 'depts' ? '部门选项已保存。' : k === 'teams' ? '小组选项已保存。' : k === 'roles' ? '岗位选项已保存。' : '主管规则已保存。')
      setError('')
      setRenames([]); setDirty({ depts: false, teams: false, roles: false, heads: false })
      onSaved?.()
      await load()
    } catch (e) { setSuccess(''); setError(e instanceof Error ? e.message : '保存失败。') }
  }
  const resetTable = (k: View) => {
    if (!base) return
    if (k === 'depts') { setDepts(base.departments); setRenames(renames.filter(r => r.type !== 'department')) }
    else if (k === 'teams') { setTeams(base.teams); setRenames(renames.filter(r => r.type !== 'team')) }
    else if (k === 'roles') { setCustomRoles(base.customRoles); setRenames(renames.filter(r => r.type !== 'role')) }
    else { setHeads(base.headRoles) }
    setDirty(d => ({ ...d, [k]: false }))
  }

  const renameDept = (from: string) => {
    const to = window.prompt('重命名部门为：', from)?.trim()
    if (!to || to === from) return
    setDepts(depts.map(d => d === from ? to : d))
    setTeams(prev => { const n = { ...prev }; if (n[from]) { n[to] = n[from]; delete n[from] } return n })
    setHeads(prev => { const n = { ...prev }; if (n[from]) { n[to] = n[from]; delete n[from] } return n })
    setRenames([...renames, { type: 'department', from, to }]); touch('depts')
  }
  const removeDept = (name: string) => {
    if (!window.confirm(`从账号字段中移除部门「${name}」？`)) return
    setDepts(depts.filter(d => d !== name))
    setTeams(prev => { const n = { ...prev }; delete n[name]; return n })
    setHeads(prev => { const n = { ...prev }; delete n[name]; return n })
    touch('depts')
  }
  const submitDept = (event: FormEvent) => { event.preventDefault(); if (!newDept.trim()) return; setDepts([...depts, newDept.trim()]); setNewDept(''); touch('depts') }

  const renameTeam = (dept: string, from: string) => {
    const to = window.prompt('重命名小组为：', from)?.trim()
    if (!to || to === from) return
    setTeams({ ...teams, [dept]: (teams[dept] ?? []).map(t => t === from ? to : t) })
    setRenames([...renames, { type: 'team', department: dept, from, to }]); touch('teams')
  }
  const removeTeam = (dept: string, team: string) => { setTeams({ ...teams, [dept]: (teams[dept] ?? []).filter(t => t !== team) }); touch('teams') }
  const submitTeam = (event: FormEvent) => { event.preventDefault(); if (!newTeam.trim()) return; setTeams({ ...teams, [deptForTeams]: [...(teams[deptForTeams] ?? []), newTeam.trim()] }); setNewTeam(''); touch('teams') }

  const renameRole = (from: string) => {
    const to = window.prompt('重命名岗位为：', from)?.trim()
    if (!to || to === from) return
    setCustomRoles(customRoles.map(r => r === from ? to : r))
    setRenames([...renames, { type: 'role', from, to }]); touch('roles')
  }
  const removeRole = (name: string) => { setCustomRoles(customRoles.filter(r => r !== name)); touch('roles') }
  const submitRole = (event: FormEvent) => {
    event.preventDefault()
    const n = newRole.trim()
    if (!n) return
    if (builtinRoles.some(([id]) => id === n) || builtinRoles.some(([, item]) => item.label === n)) { setError('该岗位已是系统内置岗位。'); return }
    setCustomRoles([...customRoles, n]); setNewRole(''); touch('roles')
  }

  const setHead = (dept: string, role: string) => { setHeads({ ...heads, [dept]: role }); touch('heads') }

  if (!base) return <div className="org-manage-loading"><p>加载中…</p></div>

  const actionBar = (k: View, label: string) => (
    <div className="org-manage-bar">
      {dirty[k] && <em className="org-manage-dirty">有未保存修改</em>}
      <span className="org-manage-jump-spacer" />
      <button type="button" className="text-action" onClick={() => resetTable(k)}>放弃本表修改</button>
      <button type="button" className="primary-button" onClick={() => void saveTable(k)}>保存{label}</button>
    </div>
  )

  return <div className="account-fields-wrap">
    {error && <p className="account-feedback" role="status">{error}</p>}
    {success && <p className="account-feedback success" role="status">{success}</p>}

    <div className="api-tabs org-manage-subtabs">
      <button type="button" className={view === 'depts' ? 'active' : ''} onClick={() => setView('depts')}>部门</button>
      <button type="button" className={view === 'teams' ? 'active' : ''} onClick={() => setView('teams')}>小组</button>
      <button type="button" className={view === 'roles' ? 'active' : ''} onClick={() => setView('roles')}>岗位</button>
      <button type="button" className={view === 'heads' ? 'active' : ''} onClick={() => setView('heads')}>主管规则</button>
    </div>

    {view === 'depts' && <>
      {actionBar('depts', '部门')}
      <section className="org-manage-section">
        <h2 className="org-manage-sub">部门选项</h2>
        <form className="org-manage-add" onSubmit={submitDept}>
          <input required value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="新部门选项，如 海外事业部" />
          <button type="submit" className="primary-button">添加部门</button>
        </form>
        <div className="org-manage-list">
          {depts.map(d => (
            <div className="org-manage-row" key={d}>
              <span className="org-manage-mark" style={{ background: accent(d) }}>{d.slice(0, 1)}</span>
              <span className="org-manage-name"><b>{d}</b><small>{(teams[d] ?? []).length} 个小组 · 主管岗位：{roleLabelOf(heads[d])}</small></span>
              <span className="org-manage-actions">
                <button type="button" onClick={() => renameDept(d)}>重命名</button>
                <button type="button" className="danger" onClick={() => removeDept(d)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>}

    {view === 'teams' && <>
      {actionBar('teams', '小组')}
      <section className="org-manage-section">
        <h2 className="org-manage-sub">小组选项（按部门）</h2>
        <label className="org-manage-dept-select">部门<select value={deptForTeams} onChange={e => setDeptForTeams(e.target.value)}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
        <form className="org-manage-add" onSubmit={submitTeam}>
          <input required value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="新小组选项，如 V6(新星组)" />
          <button type="submit" className="primary-button">添加小组</button>
        </form>
        <div className="org-manage-list">
          {(teams[deptForTeams] ?? []).map(t => (
            <div className="org-manage-row" key={t}>
              <span className="org-manage-mark" style={{ background: accent(deptForTeams) }}>{t.slice(0, 1)}</span>
              <span className="org-manage-name"><b>{t}</b><small>{deptForTeams}</small></span>
              <span className="org-manage-actions">
                <button type="button" onClick={() => renameTeam(deptForTeams, t)}>重命名</button>
                <button type="button" className="danger" onClick={() => removeTeam(deptForTeams, t)}>删除</button>
              </span>
            </div>
          ))}
          {!(teams[deptForTeams] ?? []).length && <p className="org-empty">该部门暂无小组选项。</p>}
        </div>
      </section>
    </>}

    {view === 'roles' && <>
      {actionBar('roles', '岗位')}
      <section className="org-manage-section">
        <h2 className="org-manage-sub">岗位选项</h2>
        <form className="org-manage-add" onSubmit={submitRole}>
          <input required value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="新岗位选项，如 培训专员" />
          <button type="submit" className="primary-button">添加岗位</button>
        </form>
        <div className="org-manage-list">
          {builtinRoles.map(([id, item]) => (
            <div className="org-manage-row" key={id}>
              <span className="org-manage-mark" style={{ background: '#15202c' }}>{item.label.slice(0, 1)}</span>
              <span className="org-manage-name"><b>{item.label}</b><small>系统内置岗位</small></span>
              <span className="org-manage-actions" />
            </div>
          ))}
          {customRoles.map(r => (
            <div className="org-manage-row" key={r}>
              <span className="org-manage-mark" style={{ background: '#61798a' }}>{r.slice(0, 1)}</span>
              <span className="org-manage-name"><b>{r}</b><small>自定义岗位</small></span>
              <span className="org-manage-actions">
                <button type="button" onClick={() => renameRole(r)}>重命名</button>
                <button type="button" className="danger" onClick={() => removeRole(r)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>}

    {view === 'heads' && <>
      {actionBar('heads', '主管规则')}
      <section className="org-manage-section">
        <h2 className="org-manage-sub">部门主管岗位规则</h2>
        <p className="org-manage-tip">每个部门选择一个岗位，选择该岗位的账号即视为该部门主管（在账号弹窗中可勾选「部门主管」）。</p>
        <div className="org-manage-list">
          {depts.map(d => (
            <div className="org-manage-row" key={d}>
              <span className="org-manage-mark" style={{ background: accent(d) }}>{d.slice(0, 1)}</span>
              <span className="org-manage-name"><b>{d}</b></span>
              <select className="org-manage-head-select" value={heads[d] ?? ''} onChange={e => setHead(d, e.target.value)}>
                <option value="">（不设主管）</option>
                {allRoleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </>}
  </div>
}

function roleLabelOf(role?: string) { return role ? (roles[role as Role]?.label ?? role) : '（不设主管）' }

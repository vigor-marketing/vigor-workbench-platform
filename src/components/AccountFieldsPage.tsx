import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addAccountFieldRole, addAccountFieldTeam, getAccountFields, saveAccountFields, type AccountFields } from '../lib/server-auth'
import { DEPT_COLORS, roles, type Role } from '../data/workbench'

// 管理「账号 新增/修改」弹窗里的字段选项（部门/小组/岗位/部门主管岗位），独立于组织架构人员数据
export function AccountFieldsPage() {
  const [fields, setFields] = useState<AccountFields | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [renames, setRenames] = useState<{ type: 'department' | 'team' | 'role'; from: string; to: string; department?: string }[]>([])
  const [deptForTeams, setDeptForTeams] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newRole, setNewRole] = useState('')
  const [dirty, setDirty] = useState(false)

  const load = async () => {
    try { const f = await getAccountFields(); setFields(f); setDeptForTeams(f.departments[0] ?? ''); setRenames([]); setDirty(false) }
    catch { setError('加载失败，请重新登录后再试。') }
  }
  useEffect(() => { void load() }, [])

  const builtinRoles = Object.entries(roles)
  const allRoleOptions = useMemoRoleOptions(fields)

  const accent = (dept: string) => DEPT_COLORS[dept] || '#15202c'
  const touch = () => setDirty(true)

  const renameDept = (from: string) => {
    const to = window.prompt('重命名部门为：', from)?.trim()
    if (!to || to === from || !fields) return
    const next = { ...fields, departments: fields.departments.map(d => d === from ? to : d), teams: { ...fields.teams }, headRoles: { ...fields.headRoles } }
    if (next.teams[from]) { next.teams[to] = next.teams[from]; delete next.teams[from] }
    if (next.headRoles[from]) { next.headRoles[to] = next.headRoles[from]; delete next.headRoles[from] }
    setFields(next); setRenames([...renames, { type: 'department', from, to }]); touch()
  }
  const renameTeam = (dept: string, from: string) => {
    const to = window.prompt('重命名小组为：', from)?.trim()
    if (!to || to === from || !fields) return
    const list = (fields.teams[dept] ?? []).map(t => t === from ? to : t)
    setFields({ ...fields, teams: { ...fields.teams, [dept]: list } })
    setRenames([...renames, { type: 'team', department: dept, from, to }]); touch()
  }
  const renameRole = (from: string) => {
    const to = window.prompt('重命名岗位为：', from)?.trim()
    if (!to || to === from || !fields) return
    setFields({ ...fields, customRoles: fields.customRoles.map(r => r === from ? to : r) })
    setRenames([...renames, { type: 'role', from, to }]); touch()
  }
  const removeDept = (name: string) => {
    if (!fields || !window.confirm(`从账号字段中移除部门「${name}」？`)) return
    const teams = { ...fields.teams }; delete teams[name]
    const headRoles = { ...fields.headRoles }; delete headRoles[name]
    setFields({ ...fields, departments: fields.departments.filter(d => d !== name), teams, headRoles }); touch()
  }
  const removeTeam = (dept: string, team: string) => {
    if (!fields) return
    setFields({ ...fields, teams: { ...fields.teams, [dept]: (fields.teams[dept] ?? []).filter(t => t !== team) } }); touch()
  }
  const removeRole = (name: string) => {
    if (!fields) return
    setFields({ ...fields, customRoles: fields.customRoles.filter(r => r !== name) }); touch()
  }

  const submitDept = (event: FormEvent) => {
    event.preventDefault()
    if (!fields || !newDept.trim()) return
    setFields({ ...fields, departments: [...fields.departments, newDept.trim()] }); setNewDept(''); touch()
  }
  const submitTeam = (event: FormEvent) => {
    event.preventDefault()
    if (!fields || !newTeam.trim()) return
    setFields({ ...fields, teams: { ...fields.teams, [deptForTeams]: [...(fields.teams[deptForTeams] ?? []), newTeam.trim()] } }); setNewTeam(''); touch()
  }
  const submitRole = (event: FormEvent) => {
    event.preventDefault()
    if (!fields || !newRole.trim()) return
    if (roles[newRole.trim() as Role]) { setError('该岗位已是系统内置岗位。'); return }
    setFields({ ...fields, customRoles: [...fields.customRoles, newRole.trim()] }); setNewRole(''); touch()
  }

  const save = async () => {
    if (!fields) return
    try {
      await saveAccountFields({ departments: fields.departments, teams: fields.teams, customRoles: fields.customRoles, headRoles: fields.headRoles, renames })
      setSuccess('已保存：账号 新增/修改 弹窗的字段选项与部门主管规则已更新，关联账号已同步。')
      setError(''); await load()
    } catch (e) { setSuccess(''); setError(e instanceof Error ? e.message : '保存失败。') }
  }

  if (!fields) return <div className="org-manage-loading"><p>加载中…</p></div>

  const jumpTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return <div className="account-fields-wrap">
    <div className="org-manage-jump">
      <span className="org-manage-jump-label">快捷跳转</span>
      <button type="button" onClick={() => jumpTo('af-depts')}>部门</button>
      <button type="button" onClick={() => jumpTo('af-teams')}>小组</button>
      <button type="button" onClick={() => jumpTo('af-roles')}>岗位</button>
      <button type="button" onClick={() => jumpTo('af-heads')}>主管规则</button>
      <span className="org-manage-jump-spacer" />
      {dirty && <em className="org-manage-dirty">有未保存修改</em>}
      <button type="button" className="text-action" onClick={() => void load()}>放弃并刷新</button>
      <button type="button" className="primary-button" onClick={() => void save()}>保存全部修改</button>
    </div>
    {error && <p className="account-feedback" role="status">{error}</p>}
    {success && <p className="account-feedback success" role="status">{success}</p>}

    <section className="org-manage-section" id="af-depts">
      <h2 className="org-manage-sub">部门选项</h2>
      <form className="org-manage-add" onSubmit={submitDept}>
        <input required value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="新部门选项，如 海外事业部" />
        <button type="submit" className="primary-button">添加部门</button>
      </form>
      <div className="org-manage-list">
        {fields.departments.map(d => (
          <div className="org-manage-row" key={d}>
            <span className="org-manage-mark" style={{ background: accent(d) }}>{d.slice(0, 1)}</span>
            <span className="org-manage-name"><b>{d}</b><small>{(fields.teams[d] ?? []).length} 个小组 · 主管岗位：{roleLabelOf(fields.headRoles[d])}</small></span>
            <span className="org-manage-actions">
              <button type="button" onClick={() => renameDept(d)}>重命名</button>
              <button type="button" className="danger" onClick={() => removeDept(d)}>删除</button>
            </span>
          </div>
        ))}
      </div>
    </section>

    <section className="org-manage-section" id="af-teams">
      <h2 className="org-manage-sub">小组选项（按部门）</h2>
      <label className="org-manage-dept-select">部门<select value={deptForTeams} onChange={e => setDeptForTeams(e.target.value)}>{fields.departments.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
      <form className="org-manage-add" onSubmit={submitTeam}>
        <input required value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="新小组选项，如 V6(新星组)" />
        <button type="submit" className="primary-button">添加小组</button>
      </form>
      <div className="org-manage-list">
        {(fields.teams[deptForTeams] ?? []).map(t => (
          <div className="org-manage-row" key={t}>
            <span className="org-manage-mark" style={{ background: accent(deptForTeams) }}>{t.slice(0, 1)}</span>
            <span className="org-manage-name"><b>{t}</b><small>{deptForTeams}</small></span>
            <span className="org-manage-actions">
              <button type="button" onClick={() => renameTeam(deptForTeams, t)}>重命名</button>
              <button type="button" className="danger" onClick={() => removeTeam(deptForTeams, t)}>删除</button>
            </span>
          </div>
        ))}
        {!(fields.teams[deptForTeams] ?? []).length && <p className="org-empty">该部门暂无小组选项。</p>}
      </div>
    </section>

    <section className="org-manage-section" id="af-roles">
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
        {fields.customRoles.map(r => (
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

    <section className="org-manage-section" id="af-heads">
      <h2 className="org-manage-sub">部门主管岗位规则</h2>
      <p className="org-manage-tip">每个部门选择一个岗位，选择该岗位的账号即视为该部门主管（在账号弹窗中可勾选「部门主管」）。</p>
      <div className="org-manage-list">
        {fields.departments.map(d => (
          <div className="org-manage-row" key={d}>
            <span className="org-manage-mark" style={{ background: accent(d) }}>{d.slice(0, 1)}</span>
            <span className="org-manage-name"><b>{d}</b></span>
            <select className="org-manage-head-select" value={fields.headRoles[d] ?? ''} onChange={e => { setFields({ ...fields, headRoles: { ...fields.headRoles, [d]: e.target.value } }); touch() }}>
              <option value="">（不设主管）</option>
              {allRoleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  </div>
}

function roleLabelOf(role?: string) { return role ? (roles[role as Role]?.label ?? role) : '（不设主管）' }

function useMemoRoleOptions(fields: AccountFields | null) {
  const builtin = Object.entries(roles).map(([id, item]) => ({ value: id, label: item.label }))
  const custom = (fields?.customRoles ?? []).map(r => ({ value: r, label: r }))
  return [...builtin, ...custom]
}

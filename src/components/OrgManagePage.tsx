import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from './Icon'
import { addOrgTeam, addServerRole, deleteOrgDepartment, deleteOrgTeam, deleteServerRole, getOrgTree, getServerRoles, getServerUsers, renameOrgDepartment, renameOrgTeam, renameServerRole, type OrgDeptNode } from '../lib/server-auth'
import { DEPT_COLORS, roles, type Role } from '../data/workbench'

const DEPT_ORDER = ['总经理办公室', '人力总经办', '销售部', '采购部', '销售支持组', '市场运营组', '船务部', '财务部']
const deptRank = (name: string) => { const i = DEPT_ORDER.indexOf(name); return i === -1 ? DEPT_ORDER.length : i }

type Tab = 'departments' | 'teams' | 'roles'
type Editing = { type: 'dept'; name: string } | { type: 'team'; department: string; name: string } | { type: 'role'; name: string } | null

export function OrgManagePage() {
  const [tab, setTab] = useState<Tab>('departments')
  const [tree, setTree] = useState<OrgDeptNode[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [storeRoles, setStoreRoles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newDept, setNewDept] = useState('')
  const [teamDept, setTeamDept] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newRole, setNewRole] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [editValue, setEditValue] = useState('')

  const refresh = async () => {
    try {
      const [t, u, r] = await Promise.all([getOrgTree(), getServerUsers(), getServerRoles()])
      setTree(t); setUsers(u); setStoreRoles(r)
    } catch { setError('加载失败，请重新登录后再试。') }
  }
  useEffect(() => { void refresh() }, [])

  const sortedDepts = [...tree].sort((a, b) => deptRank(a.department) - deptRank(b.department))
  const currentDept = teamDept || sortedDepts[0]?.department || ''
  const deptNode = (name: string) => tree.find(d => d.department === name)
  const deptPersons = (name: string) => deptNode(name)?.teams.reduce((m, t) => m + t.persons.length, 0) ?? 0
  const deptAccounts = (name: string) => users.filter(u => u.department === name).length
  const teamAccounts = (department: string, team: string) => users.filter(u => u.department === department && u.teamName === team).length
  const roleAccounts = (role: string) => users.filter(u => u.role === role).length

  const builtinRoles = Object.entries(roles)
  const customRoleSet = new Set<string>(storeRoles)
  for (const u of users) if (u.role && !roles[u.role as Role]) customRoleSet.add(u.role)
  const customRoles = [...customRoleSet].sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const flash = (err: string, ok = '') => { setError(err); setSuccess(ok) }
  const fail = (error: unknown, fallback: string) => flash(error instanceof Error ? error.message : fallback)

  const submitDept = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/org/departments', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: newDept }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message ?? '新增部门失败。')
      setNewDept(''); flash('', '部门已创建。'); await refresh()
    } catch (error) { fail(error, '新增部门失败。') }
  }
  const submitTeam = async (event: FormEvent) => {
    event.preventDefault()
    try { await addOrgTeam(currentDept, newTeam); setNewTeam(''); flash('', '小组已创建。'); await refresh() }
    catch (error) { fail(error, '新增小组失败。') }
  }
  const submitRole = async (event: FormEvent) => {
    event.preventDefault()
    try { await addServerRole(newRole); setNewRole(''); flash('', '岗位已创建，可在账号新建/编辑中选择。'); await refresh() }
    catch (error) { fail(error, '新增岗位失败。') }
  }

  const beginEdit = (target: NonNullable<Editing>, currentValue: string) => { setEditing(target); setEditValue(currentValue) }
  const commitEdit = async () => {
    if (!editing) return
    const value = editValue.trim()
    if (!value) { flash('名称不能为空。'); return }
    try {
      if (editing.type === 'dept') { await renameOrgDepartment(editing.name, value); flash('', '部门已重命名，关联账号已同步更新。') }
      else if (editing.type === 'team') { await renameOrgTeam(editing.department, editing.name, value); flash('', '小组已重命名，关联账号已同步更新。') }
      else { await renameServerRole(editing.name, value); flash('', '岗位已重命名，关联账号已同步更新。') }
      setEditing(null); await refresh()
    } catch (error) { fail(error, '重命名失败。') }
  }

  const removeDept = async (name: string) => {
    if (!window.confirm(`确定删除部门「${name}」？`)) return
    try { await deleteOrgDepartment(name); flash('', '部门已删除。'); await refresh() }
    catch (error) { fail(error, '删除失败。') }
  }
  const removeTeam = async (department: string, team: string) => {
    if (!window.confirm(`确定删除小组「${team}」？`)) return
    try { await deleteOrgTeam(department, team); flash('', '小组已删除。'); await refresh() }
    catch (error) { fail(error, '删除失败。') }
  }
  const removeRole = async (name: string) => {
    if (!window.confirm(`确定删除岗位「${name}」？`)) return
    try { await deleteServerRole(name); flash('', '岗位已删除。'); await refresh() }
    catch (error) { fail(error, '删除失败。') }
  }

  const accent = (dept: string) => DEPT_COLORS[dept] || '#15202c'

  return <section className="page org-manage-page">
    <div className="page-heading">
      <div><h1>组织管理</h1><p>统一维护部门、小组与岗位；删除受账号关联保护，重命名会同步更新账号。</p></div>
      <div className="page-heading-actions"><button type="button" className="text-action" onClick={() => void refresh()}>刷新数据</button></div>
    </div>
    {error && <p className="account-feedback" role="status">{error}</p>}
    {success && <p className="account-feedback success" role="status">{success}</p>}

    <div className="api-tabs">
      <button type="button" className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>部门</button>
      <button type="button" className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>小组</button>
      <button type="button" className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}>岗位</button>
    </div>

    {tab === 'departments' && <section className="org-manage-section">
      <form className="org-manage-add" onSubmit={submitDept}>
        <input required value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="新部门名称，如 海外事业部" />
        <button type="submit" className="primary-button">新增部门</button>
      </form>
      <div className="org-manage-list">
        {sortedDepts.map(d => {
          const persons = deptPersons(d.department); const accounts = deptAccounts(d.department)
          return <div className="org-manage-row" key={d.department}>
            <span className="org-manage-mark" style={{ background: accent(d.department) }}>{d.department.slice(0, 1)}</span>
            {editing?.type === 'dept' && editing.name === d.department
              ? <span className="org-manage-edit"><input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} /><button type="button" onClick={() => void commitEdit()}>保存</button><button type="button" onClick={() => setEditing(null)}>取消</button></span>
              : <span className="org-manage-name">{d.department}<small>{d.teams.length} 个小组</small></span>}
            <span className="org-manage-meta"><em>{persons} 人</em><em>{accounts} 个账号</em></span>
            <span className="org-manage-actions">
              <button type="button" onClick={() => beginEdit({ type: 'dept', name: d.department }, d.department)}>重命名</button>
              <button type="button" className="danger" onClick={() => void removeDept(d.department)}>删除</button>
            </span>
          </div>
        })}
        {!sortedDepts.length && <p className="org-empty">暂无部门。</p>}
      </div>
    </section>}

    {tab === 'teams' && <section className="org-manage-section">
      <label className="org-manage-dept-select">部门<select value={currentDept} onChange={e => setTeamDept(e.target.value)}>{sortedDepts.map(d => <option key={d.department} value={d.department}>{d.department}</option>)}</select></label>
      <form className="org-manage-add" onSubmit={submitTeam}>
        <input required value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="新小组名称，如 V6(新星组)" />
        <button type="submit" className="primary-button">新增小组</button>
      </form>
      <div className="org-manage-list">
        {(deptNode(currentDept)?.teams ?? []).map(t => {
          const accounts = teamAccounts(currentDept, t.team)
          return <div className="org-manage-row" key={t.team}>
            <span className="org-manage-mark" style={{ background: accent(currentDept) }}>{t.team.slice(0, 1)}</span>
            {editing?.type === 'team' && editing.name === t.team && editing.department === currentDept
              ? <span className="org-manage-edit"><input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} /><button type="button" onClick={() => void commitEdit()}>保存</button><button type="button" onClick={() => setEditing(null)}>取消</button></span>
              : <span className="org-manage-name">{t.team}<small>{t.persons.length} 人</small></span>}
            <span className="org-manage-meta"><em>{accounts} 个账号</em></span>
            <span className="org-manage-actions">
              <button type="button" onClick={() => beginEdit({ type: 'team', department: currentDept, name: t.team }, t.team)}>重命名</button>
              <button type="button" className="danger" onClick={() => void removeTeam(currentDept, t.team)}>删除</button>
            </span>
          </div>
        })}
        {!(deptNode(currentDept)?.teams?.length) && <p className="org-empty">该部门暂无小组。</p>}
      </div>
    </section>}

    {tab === 'roles' && <section className="org-manage-section">
      <form className="org-manage-add" onSubmit={submitRole}>
        <input required value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="新岗位名称，如 培训专员" />
        <button type="submit" className="primary-button">新增岗位</button>
      </form>
      <div className="org-manage-list">
        {builtinRoles.map(([id, item]) => (
          <div className="org-manage-row" key={id}>
            <span className="org-manage-mark" style={{ background: '#15202c' }}>{item.label.slice(0, 1)}</span>
            <span className="org-manage-name">{item.label}<small>系统内置岗位</small></span>
            <span className="org-manage-meta"><em>{roleAccounts(id)} 个账号</em></span>
            <span className="org-manage-actions" />
          </div>
        ))}
        {customRoles.map(name => {
          const inStore = storeRoles.includes(name); const count = roleAccounts(name)
          return <div className="org-manage-row" key={name}>
            <span className="org-manage-mark" style={{ background: '#61798a' }}>{name.slice(0, 1)}</span>
            {editing?.type === 'role' && editing.name === name
              ? <span className="org-manage-edit"><input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} /><button type="button" onClick={() => void commitEdit()}>保存</button><button type="button" onClick={() => setEditing(null)}>取消</button></span>
              : <span className="org-manage-name">{name}<small>{inStore ? '自定义岗位' : '账号中使用的岗位'}</small></span>}
            <span className="org-manage-meta"><em>{count} 个账号</em></span>
            <span className="org-manage-actions">
              {inStore && <>
                <button type="button" onClick={() => beginEdit({ type: 'role', name }, name)}>重命名</button>
                <button type="button" className="danger" onClick={() => void removeRole(name)}>删除</button>
              </>}
            </span>
          </div>
        })}
      </div>
    </section>}
  </section>
}

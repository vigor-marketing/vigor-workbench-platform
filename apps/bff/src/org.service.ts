import { Injectable, OnModuleInit } from '@nestjs/common'
import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'

// 树结构：部门 → 二级部门(团队) → 人员
export type OrgPerson = { id: string; role: string; name: string; englishName: string }
export type OrgTeam = { name: string; persons: OrgPerson[] }
export type OrgDepartment = { name: string; teams: OrgTeam[] }
export type OrgData = { version: number; departments: OrgDepartment[] }

// 对外返回：人员携带 department/team 便于扁平化调用
export type PublicOrgPerson = OrgPerson & { department: string; team: string }
export type OrgTeamNode = { team: string; persons: PublicOrgPerson[] }
export type OrgDepartmentNode = { department: string; teams: OrgTeamNode[] }
export type OrgPersonInput = { department?: string; team?: string; role?: string; name?: string; englishName?: string }

const seedFlat: PublicOrgPerson[] = [
  { id: 'judy', department: '船务部', team: '船务部', role: '部门负责人/管理岗', name: '吴琼', englishName: 'Judy' },
  { id: 'yvonne', department: '船务部', team: '船务部', role: '成员', name: '袁晔', englishName: 'Yvonne' },
  { id: 'yolo', department: '船务部', team: '船务部', role: '成员', name: '李垚', englishName: 'Yolo' },
  { id: 'maeve', department: '船务部', team: '船务部', role: '成员', name: '覃红梅', englishName: 'Maeve' },
  { id: 'amy', department: '财务部', team: '财务部', role: '部门负责人/管理岗', name: '周倩', englishName: 'Amy' },
  { id: 'hazel', department: '财务部', team: '财务部', role: '成员', name: '周花', englishName: 'Hazel' },
  { id: 'zora', department: '财务部', team: '财务部', role: '成员', name: '张奋学', englishName: 'Zora' },
  { id: 'shane', department: '采购部', team: '质量组', role: '部门负责人/管理岗', name: '徐振兴', englishName: 'Shane' },
  { id: 'andy', department: '采购部', team: '质量组', role: '成员', name: '张刚刚', englishName: 'Andy' },
  { id: 'hunter', department: '采购部', team: '质量组', role: '成员', name: '王冕', englishName: 'Hunter' },
  { id: 'charles', department: '采购部', team: '采购二组', role: '部门负责人/管理岗', name: '张朋', englishName: 'Charles' },
  { id: 'luna', department: '采购部', team: '采购二组', role: '成员', name: '张娟霞', englishName: 'Luna' },
  { id: 'tony', department: '采购部', team: '采购二组', role: '成员', name: '张睿', englishName: 'Tony' },
  { id: 'cooper', department: '采购部', team: '采购二组', role: '成员', name: '秦鸿基', englishName: 'Cooper' },
  { id: 'cayla', department: '销售部', team: 'V1(飓风之眼)', role: '部门负责人/管理岗', name: '杨璨羽', englishName: 'Cayla' },
  { id: 'terri', department: '销售部', team: 'V1(飓风之眼)', role: '成员', name: '陈欣悦', englishName: 'Terri' },
  { id: 'carol', department: '销售部', team: 'V1(飓风之眼)', role: '成员', name: '薛宁', englishName: 'Carol' },
  { id: 'helen', department: '销售部', team: 'V1(飓风之眼)', role: '成员', name: '韩哲', englishName: 'Helen' },
  { id: 'aviva', department: '销售部', team: 'V1(飓风之眼)', role: '成员', name: '鲁萱', englishName: 'Aviva' },
  { id: 'echo', department: '销售部', team: 'V1(飓风之眼)', role: '成员', name: '首倩茹', englishName: 'Echo' },
  { id: 'monk', department: '市场运营组', team: '市场运营组', role: '部门负责人/管理岗', name: '陈炳屾', englishName: 'Monk' },
  { id: 'robin', department: '销售支持组', team: '销售支持组', role: '部门负责人/管理岗', name: '张菲', englishName: 'Robin' },
  { id: 'garen', department: '销售支持组', team: '销售支持组', role: '成员', name: '刘斌', englishName: 'Garen' },
  { id: 'ryan', department: '销售部', team: 'V5(钢铁战士)', role: '部门负责人/管理岗', name: '李瑞', englishName: 'Ryan' },
  { id: 'mary', department: '销售部', team: 'V5(钢铁战士)', role: '成员', name: '吴佩', englishName: 'Mary' },
  { id: 'vic', department: '销售部', team: 'V5(钢铁战士)', role: '成员', name: '燕维君', englishName: 'Vic' },
  { id: 'joseph', department: '销售部', team: 'V3(环球猎单)', role: '部门负责人/管理岗', name: '杨超', englishName: 'Joseph' },
  { id: 'yolanda', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '张亚洁', englishName: 'Yolanda' },
  { id: 'loria', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '金美溢', englishName: 'Loria' },
  { id: 'joe', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '崔姣', englishName: 'Joe' },
  { id: 'jerric', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '胡家桦', englishName: 'Jerric' },
  { id: 'shelin', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '邵相楠', englishName: 'Shelin' },
  { id: 'vera', department: '销售部', team: 'V3(环球猎单)', role: '成员', name: '林望望', englishName: 'Vera' },
  { id: 'lehman', department: '销售部', team: 'V4(V5王牌)', role: '部门负责人/管理岗', name: '常雷明', englishName: 'Lehman' },
  { id: 'laurel', department: '销售部', team: 'V4(V5王牌)', role: '成员', name: '王烜', englishName: 'Laurel' },
  { id: 'irene', department: '销售部', team: 'V4(V5王牌)', role: '成员', name: '李海瑞', englishName: 'Irene' },
  { id: 'aaryn', department: '销售部', team: 'V4(V5王牌)', role: '成员', name: '俞安然', englishName: 'Aaryn' },
  { id: 'hailey', department: '销售部', team: 'V2(增长引擎)', role: '部门负责人/管理岗', name: '王旭梅', englishName: 'Hailey' },
  { id: 'kevin', department: '销售部', team: 'V2(增长引擎)', role: '成员', name: '徐越', englishName: 'Kevin' },
  { id: 'celeste', department: '销售部', team: 'V2(增长引擎)', role: '成员', name: '车欣芋', englishName: 'Celeste' },
  { id: 'rita', department: '采购部', team: '采购一组', role: '部门负责人/管理岗', name: '乔婷', englishName: 'Rita' },
  { id: 'ruby', department: '采购部', team: '采购一组', role: '成员', name: '杨一', englishName: 'Ruby' },
  { id: 'grace', department: '人力总经办', team: '人力总经办', role: '成员', name: '刘杨杨', englishName: 'Grace' },
  { id: 'miya', department: '人力总经办', team: '人力总经办', role: '成员', name: '张朦', englishName: 'Miya' },
  { id: 'frances', department: '人力总经办', team: '人力总经办', role: '成员', name: '刘欣卓', englishName: 'Frances' },
  { id: 'lester', department: '人力总经办', team: '人力总经办', role: '部门负责人/管理岗/人事总监', name: '沈磊', englishName: 'Lester' },
  { id: 'leo', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/财务副总经理', name: '张亮', englishName: 'Leo' },
  { id: 'joppa', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/销售副总经理', name: '谭静', englishName: 'Joppa' },
  { id: 'erica', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/总经理', name: '呼延松', englishName: 'Erica' },
]

// 与账号权限一致的岗位集合（与 auth/前端 roles 标签一致）
const VALID_ROLE_LABELS = new Set(['总经理', '分管销售副总', '分管财务副总', '销售经理', '销售组长', '销售员', '项目跟进员', '采购经理', '采购组长', '采购员', '质量组', '人力总监', '行政专员', '财务经理', '会计', '船务经理', '船务操作员', '销售支持组', '市场组'])

// 旧组织角色 → 账号权限岗位；已是合法岗位则原样返回
function remapRole(department: string, team: string, oldRole: string): string {
  const r = oldRole || ''
  if (VALID_ROLE_LABELS.has(r)) return r
  const lead = r.includes('负责人') || r.includes('管理岗')
  if (department === '总经理办公室') {
    if (r.includes('销售副总')) return '分管销售副总'
    if (r.includes('财务副总')) return '分管财务副总'
    return '总经理'
  }
  if (department === '采购部') { if (team.includes('质量')) return '质量组'; return lead ? '采购经理' : '采购员' }
  if (department === '销售部') return lead ? '销售经理' : '销售员'
  const pair: Record<string, [string, string]> = {
    '船务部': ['船务经理', '船务操作员'], '财务部': ['财务经理', '会计'],
    '市场运营组': ['市场组', '市场组'], '销售支持组': ['销售支持组', '销售支持组'],
    '人力总经办': ['人力总监', '行政专员'],
  }
  const hit = pair[department]
  if (hit) return lead ? hit[0] : hit[1]
  return r
}

function flatToNested(flat: PublicOrgPerson[]): OrgDepartment[] {
  const order: string[] = []
  const map = new Map<string, { name: string; teamOrder: string[]; teams: Map<string, OrgPerson[]> }>()
  for (const p of flat) {
    let d = map.get(p.department)
    if (!d) { d = { name: p.department, teamOrder: [], teams: new Map() }; map.set(p.department, d); order.push(p.department) }
    let t = d.teams.get(p.team)
    if (!t) { t = []; d.teams.set(p.team, t); d.teamOrder.push(p.team) }
    t.push({ id: p.id, role: p.role, name: p.name, englishName: p.englishName })
  }
  return order.map(name => { const d = map.get(name)!; return { name, teams: d.teamOrder.map(t => ({ name: t, persons: d.teams.get(t)! })) } })
}

// 全平台统一的部门展示顺序（组织架构图、选择器、外部 API 均按此排序）
const DEPT_ORDER = ['总经理办公室', '人力总经办', '销售部', '采购部', '销售支持组', '市场运营组', '船务部', '财务部']
const deptRank = (name: string) => { const i = DEPT_ORDER.indexOf(name); return i === -1 ? DEPT_ORDER.length : i }
const teamRank = (dept: string, team: string) => {
  if (dept === '销售部') { const m = team.match(/V(\d+)/); if (m) return Number(m[1]) }
  if (dept === '采购部') { if (team.includes('一组') || team.includes('一单元')) return 1; if (team.includes('二组') || team.includes('二单元')) return 2; if (team.includes('质量')) return 3 }
  return 99
}

@Injectable()
export class OrgService implements OnModuleInit {
  private data: OrgData = { version: 2, departments: [] }

  async onModuleInit() {
    try {
      const stored = JSON.parse(await readFile(config.orgFile, 'utf8'))
      if (Array.isArray(stored)) {
        // v1：平铺人员 → 树结构 + 岗位统一
        this.data = { version: 2, departments: flatToNested(stored.map(p => ({ ...p, role: remapRole(p.department, p.team, p.role) }))) }
        await this.persist()
        return
      }
      if (stored && Array.isArray(stored.departments) && stored.departments.length) {
        this.data = stored
        if (this.remapLoaded()) await this.persist()
        return
      }
    } catch { /* 首次运行 */ }
    this.data = { version: 2, departments: flatToNested(seedFlat.map(p => ({ ...p, role: remapRole(p.department, p.team, p.role) }))) }
    await this.persist()
  }

  private remapLoaded(): boolean {
    let changed = false
    for (const d of this.data.departments) for (const t of d.teams) for (const p of t.persons) {
      const next = remapRole(d.name, t.name, p.role)
      if (next !== p.role) { p.role = next; changed = true }
    }
    return changed
  }

  private async persist() {
    await mkdir(dirname(config.orgFile), { recursive: true })
    await writeFile(config.orgFile, JSON.stringify(this.data, null, 2), { mode: 0o600 })
  }

  private findPerson(id: string): { d: OrgDepartment; t: OrgTeam; p: OrgPerson } | null {
    for (const d of this.data.departments) for (const t of d.teams) { const p = t.persons.find(x => x.id === id); if (p) return { d, t, p } }
    return null
  }
  private makeId(englishName: string): string {
    const base = (englishName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID().slice(0, 8)
    const taken = () => { for (const d of this.data.departments) for (const t of d.teams) if (t.persons.some(p => p.id === base)) return true; return false }
    let id = base, n = 2
    while (taken()) id = `${base}-${n++}`
    return id
  }
  private toPublic(p: OrgPerson, d: OrgDepartment, t: OrgTeam): PublicOrgPerson { return { ...p, department: d.name, team: t.name } }

  // ---- 读取 ----
  tree(): OrgDepartmentNode[] {
    return [...this.data.departments]
      .sort((a, b) => deptRank(a.name) - deptRank(b.name))
      .map(d => ({ department: d.name, teams: [...d.teams].sort((x, y) => teamRank(d.name, x.name) - teamRank(d.name, y.name)).map(t => ({ team: t.name, persons: t.persons.map(p => this.toPublic(p, d, t)) })) }))
  }
  list(): PublicOrgPerson[] {
    return [...this.data.departments].sort((a, b) => deptRank(a.name) - deptRank(b.name)).flatMap(d => d.teams.flatMap(t => t.persons.map(p => this.toPublic(p, d, t))))
  }
  departments(): string[] { return [...this.data.departments].sort((a, b) => deptRank(a.name) - deptRank(b.name)).map(d => d.name) }

  // ---- 部门 CRUD ----
  async addDepartment(name: string) { const n = name?.trim(); if (!n) throw new Error('部门名称必填。'); if (this.data.departments.some(d => d.name === n)) throw new Error('部门已存在。'); this.data.departments.push({ name: n, teams: [] }); await this.persist(); return { ok: true } }
  async renameDepartment(oldName: string, newName: string) { const n = newName?.trim(); if (!n) throw new Error('部门名称必填。'); const d = this.data.departments.find(x => x.name === oldName); if (!d) throw new Error('部门不存在。'); if (this.data.departments.some(x => x.name === n && x !== d)) throw new Error('部门已存在。'); d.name = n; await this.persist(); return { ok: true } }
  async deleteDepartment(name: string, force = false) { const d = this.data.departments.find(x => x.name === name); if (!d) throw new Error('部门不存在。'); const count = d.teams.reduce((m, t) => m + t.persons.length, 0); if (count > 0 && !force) throw new Error(`该部门下有 ${count} 人，删除需确认（force=true）。`); this.data.departments = this.data.departments.filter(x => x !== d); await this.persist(); return { ok: true } }

  // ---- 二级部门 CRUD ----
  async addTeam(department: string, team: string) { const t = team?.trim(); if (!t) throw new Error('二级部门名称必填。'); const d = this.data.departments.find(x => x.name === department?.trim()); if (!d) throw new Error('部门不存在。'); if (d.teams.some(x => x.name === t)) throw new Error('二级部门已存在。'); d.teams.push({ name: t, persons: [] }); await this.persist(); return { ok: true } }
  async renameTeam(department: string, oldTeam: string, newTeam: string) { const t = newTeam?.trim(); if (!t) throw new Error('二级部门名称必填。'); const d = this.data.departments.find(x => x.name === department?.trim()); if (!d) throw new Error('部门不存在。'); const tm = d.teams.find(x => x.name === oldTeam); if (!tm) throw new Error('二级部门不存在。'); if (d.teams.some(x => x.name === t && x !== tm)) throw new Error('二级部门已存在。'); tm.name = t; await this.persist(); return { ok: true } }
  async deleteTeam(department: string, team: string, force = false) { const d = this.data.departments.find(x => x.name === department?.trim()); if (!d) throw new Error('部门不存在。'); const tm = d.teams.find(x => x.name === team?.trim()); if (!tm) throw new Error('二级部门不存在。'); const count = tm.persons.length; if (count > 0 && !force) throw new Error(`该二级部门下有 ${count} 人，删除需确认（force=true）。`); d.teams = d.teams.filter(x => x !== tm); await this.persist(); return { ok: true } }

  // ---- 人员 CRUD ----
  async addPerson(input: OrgPersonInput): Promise<PublicOrgPerson> {
    const { department, team, role, name, englishName } = input
    if (!department?.trim() || !team?.trim() || !role?.trim() || !name?.trim() || !englishName?.trim()) throw new Error('部门、二级部门、角色、姓名、英文名均必填。')
    if (!VALID_ROLE_LABELS.has(role.trim())) throw new Error('角色必须为有效岗位（与账号权限一致）。')
    const d = this.data.departments.find(x => x.name === department.trim())
    if (!d) throw new Error('部门不存在，请先创建部门。')
    let t = d.teams.find(x => x.name === team.trim())
    if (!t) { t = { name: team.trim(), persons: [] }; d.teams.push(t) }
    const p: OrgPerson = { id: this.makeId(englishName), role: role.trim(), name: name.trim(), englishName: englishName.trim() }
    t.persons.push(p)
    await this.persist()
    return this.toPublic(p, d, t)
  }
  async updatePerson(id: string, input: OrgPersonInput): Promise<PublicOrgPerson> {
    const f = this.findPerson(id); if (!f) throw new Error('人员不存在。')
    const { department, team, role, name, englishName } = input
    if (name?.trim()) f.p.name = name.trim()
    if (englishName?.trim()) f.p.englishName = englishName.trim()
    if (role?.trim()) f.p.role = role.trim()
    if (department?.trim() && team?.trim() && (department.trim() !== f.d.name || team.trim() !== f.t.name)) {
      f.t.persons = f.t.persons.filter(x => x !== f.p)
      const nd = this.data.departments.find(x => x.name === department.trim())
      if (!nd) throw new Error('目标部门不存在。')
      let nt = nd.teams.find(x => x.name === team.trim())
      if (!nt) { nt = { name: team.trim(), persons: [] }; nd.teams.push(nt) }
      nt.persons.push(f.p)
      await this.persist()
      return this.toPublic(f.p, nd, nt)
    }
    await this.persist()
    return this.toPublic(f.p, f.d, f.t)
  }
  async deletePerson(id: string): Promise<{ ok: true }> {
    const f = this.findPerson(id); if (!f) throw new Error('人员不存在。')
    f.t.persons = f.t.persons.filter(x => x !== f.p)
    await this.persist()
    return { ok: true }
  }
}

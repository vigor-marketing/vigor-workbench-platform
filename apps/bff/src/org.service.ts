import { Injectable, OnModuleInit } from '@nestjs/common'
import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'

export type OrgPerson = { id: string; department: string; team: string; role: string; name: string; englishName: string }
export type OrgTeamNode = { team: string; persons: OrgPerson[] }
export type OrgDepartmentNode = { department: string; teams: OrgTeamNode[] }
export type OrgPersonInput = { department?: string; team?: string; role?: string; name?: string; englishName?: string }

const seedPersons: OrgPerson[] = [
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
  { id: 'charles', department: '采购部', team: '采购二单元', role: '部门负责人/管理岗', name: '张朋', englishName: 'Charles' },
  { id: 'luna', department: '采购部', team: '采购二单元', role: '成员', name: '张娟霞', englishName: 'Luna' },
  { id: 'tony', department: '采购部', team: '采购二单元', role: '成员', name: '张睿', englishName: 'Tony' },
  { id: 'cooper', department: '采购部', team: '采购二单元', role: '成员', name: '秦鸿基', englishName: 'Cooper' },
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
  { id: 'rita', department: '采购部', team: '采购一单元', role: '部门负责人/管理岗', name: '乔婷', englishName: 'Rita' },
  { id: 'ruby', department: '采购部', team: '采购一单元', role: '成员', name: '杨一', englishName: 'Ruby' },
  { id: 'grace', department: '人力总经办', team: '人力总经办', role: '成员', name: '刘杨杨', englishName: 'Grace' },
  { id: 'miya', department: '人力总经办', team: '人力总经办', role: '成员', name: '张朦', englishName: 'Miya' },
  { id: 'frances', department: '人力总经办', team: '人力总经办', role: '成员', name: '刘欣卓', englishName: 'Frances' },
  { id: 'lester', department: '人力总经办', team: '人力总经办', role: '部门负责人/管理岗/人事总监', name: '沈磊', englishName: 'Lester' },
  { id: 'leo', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/财务副总经理', name: '张亮', englishName: 'Leo' },
  { id: 'joppa', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/销售副总经理', name: '谭静', englishName: 'Joppa' },
  { id: 'erica', department: '总经理办公室', team: '总经理办公室', role: '部门负责人/管理岗/总经理', name: '呼延松', englishName: 'Erica' },
]

@Injectable()
export class OrgService implements OnModuleInit {
  private persons: OrgPerson[] = []

  async onModuleInit() {
    try {
      const stored = JSON.parse(await readFile(config.orgFile, 'utf8'))
      if (Array.isArray(stored) && stored.length) { this.persons = stored; return }
    } catch { /* 首次运行或文件损坏时用种子数据 */ }
    this.persons = seedPersons
    await this.persist()
  }

  private async persist() {
    await mkdir(dirname(config.orgFile), { recursive: true })
    await writeFile(config.orgFile, JSON.stringify(this.persons, null, 2), { mode: 0o600 })
  }

  list(): OrgPerson[] { return this.persons }

  tree(): OrgDepartmentNode[] {
    const order: string[] = []
    const map = new Map<string, { department: string; teamOrder: string[]; teams: Map<string, OrgPerson[]> }>()
    for (const p of this.persons) {
      let d = map.get(p.department)
      if (!d) { d = { department: p.department, teamOrder: [], teams: new Map() }; map.set(p.department, d); order.push(p.department) }
      let t = d.teams.get(p.team)
      if (!t) { t = []; d.teams.set(p.team, t); d.teamOrder.push(p.team) }
      t.push(p)
    }
    return order.map(dep => {
      const d = map.get(dep)!
      return { department: dep, teams: d.teamOrder.map(t => ({ team: t, persons: d.teams.get(t)! })) }
    })
  }

  departments(): string[] { return [...new Set(this.persons.map(p => p.department))] }

  private makeId(englishName: string): string {
    const base = (englishName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID().slice(0, 8)
    let id = base, n = 2
    while (this.persons.some(p => p.id === id)) id = `${base}-${n++}`
    return id
  }

  async addPerson(input: OrgPersonInput): Promise<OrgPerson> {
    const { department, team, role, name, englishName } = input
    if (!department?.trim() || !team?.trim() || !role?.trim() || !name?.trim() || !englishName?.trim()) throw new Error('部门、团队、角色、姓名、英文名均必填。')
    const person: OrgPerson = { id: this.makeId(englishName), department: department.trim(), team: team.trim(), role: role.trim(), name: name.trim(), englishName: englishName.trim() }
    this.persons.push(person)
    await this.persist()
    return person
  }

  async updatePerson(id: string, input: OrgPersonInput): Promise<OrgPerson> {
    const idx = this.persons.findIndex(p => p.id === id)
    if (idx < 0) throw new Error('人员不存在。')
    const next: OrgPerson = { ...this.persons[idx] }
    for (const key of ['department', 'team', 'role', 'name', 'englishName'] as const) {
      const v = input[key]?.trim()
      if (v) next[key] = v
    }
    if (!next.name || !next.englishName) throw new Error('姓名与英文名不能为空。')
    this.persons[idx] = next
    await this.persist()
    return next
  }

  async deletePerson(id: string): Promise<{ ok: true }> {
    const before = this.persons.length
    this.persons = this.persons.filter(p => p.id !== id)
    if (this.persons.length === before) throw new Error('人员不存在。')
    await this.persist()
    return { ok: true }
  }
}

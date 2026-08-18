import { Injectable } from '@nestjs/common'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'

// 账号「新增/修改」弹窗的字段选项（部门/小组/岗位/部门主管岗位），独立于组织架构人员数据（org.json）
export type AccountFields = {
  version: 1
  departments: string[]
  teams: Record<string, string[]>
  customRoles: string[]
  headRoles: Record<string, string>
}

const DEFAULT_DEPARTMENTS = ['总经理办公室', '人力总经办', '销售部', '采购部', '销售支持组', '市场运营组', '船务部', '财务部']
const DEFAULT_TEAMS: Record<string, string[]> = {
  '总经理办公室': ['总经理办公室'],
  '人力总经办': ['人力总经办'],
  '销售部': ['V1(飓风之眼)', 'V2(增长引擎)', 'V3(环球猎单)', 'V4(V5王牌)', 'V5(钢铁战士)'],
  '采购部': ['质量组', '采购一单元', '采购二单元'],
  '销售支持组': ['销售支持组'],
  '市场运营组': ['市场运营组'],
  '船务部': ['船务部'],
  '财务部': ['财务部'],
}
const DEFAULT_HEAD_ROLES: Record<string, string> = {
  '总经理办公室': 'general_manager',
  '人力总经办': 'hr_director',
  '销售部': 'sales_manager',
  '采购部': 'procurement_manager',
  '销售支持组': '销售支持组组长',
  '市场运营组': '市场运营组组长',
  '船务部': 'shipping_manager',
  '财务部': 'finance_manager',
}

@Injectable()
export class AccountFieldsService {
  private cache: AccountFields | null = null

  private async load(): Promise<AccountFields> {
    if (this.cache) return this.cache
    try {
      const stored = JSON.parse(await readFile(config.accountFieldsFile, 'utf8'))
      if (stored && Array.isArray(stored.departments)) {
        this.cache = { version: 1, departments: stored.departments, teams: stored.teams ?? {}, customRoles: stored.customRoles ?? [], headRoles: stored.headRoles ?? {} }
        return this.cache
      }
    } catch { /* 首次运行 */ }
    this.cache = await this.seed()
    await this.persist()
    return this.cache
  }

  // 与组织架构一致的组排序：销售 V1–V5；采购 一组/二组/质量组
  const teamRank = (dept: string, team: string): number => {
    if (dept === '销售部') { const m = team.match(/V(\d+)/); if (m) return Number(m[1]) }
    if (dept === '采购部') { if (team.includes('一组') || team.includes('一单元')) return 1; if (team.includes('二组') || team.includes('二单元')) return 2; if (team.includes('质量')) return 3 }
    return 99
  }
  private sortTeams(dept: string, teams: string[]): string[] {
    return [...teams].sort((a, b) => teamRank(dept, a) - teamRank(dept, b))
  }

  // 首次初始化：从组织架构(org.json)迁移
  private async seed(): Promise<AccountFields> {
    const departments = [...DEFAULT_DEPARTMENTS]
    const teams: Record<string, string[]> = { ...DEFAULT_TEAMS }
    let customRoles: string[] = []
    try {
      const org = JSON.parse(await readFile(config.orgFile, 'utf8'))
      if (Array.isArray(org?.departments)) {
        for (const d of org.departments as { name: string; teams?: { name: string }[] }[]) {
          if (!departments.includes(d.name)) departments.push(d.name)
          teams[d.name] = this.sortTeams(d.name, (d.teams ?? []).map((t: { name: string }) => t.name))
        }
      }
    } catch { /* org 不可用时用默认 */ }
    return { version: 1, departments, teams, customRoles, headRoles: { ...DEFAULT_HEAD_ROLES } }
  }

  private async persist() {
    const data = await this.load()
    await mkdir(dirname(config.accountFieldsFile), { recursive: true })
    await writeFile(config.accountFieldsFile, JSON.stringify(data, null, 2), { mode: 0o600 })
  }

  async get(): Promise<AccountFields> { return this.load() }

  async save(input: { departments?: string[]; teams?: Record<string, string[]>; customRoles?: string[]; headRoles?: Record<string, string> }): Promise<AccountFields> {
    const current = await this.load()
    const departments = (input.departments ?? current.departments).map(x => String(x).trim()).filter(Boolean)
    if (!departments.length) throw new Error('至少需要一个部门选项。')
    if (new Set(departments).size !== departments.length) throw new Error('部门选项不能重复。')
    const teams: Record<string, string[]> = {}
    for (const dept of departments) {
      const list = (input.teams?.[dept] ?? current.teams?.[dept] ?? []).map(x => String(x).trim()).filter(Boolean)
      if (new Set(list).size !== list.length) throw new Error(`部门「${dept}」的小组选项不能重复。`)
      teams[dept] = this.sortTeams(dept, list)
    }
    const customRoles = (input.customRoles ?? current.customRoles).map(x => String(x).trim()).filter(Boolean)
    if (new Set(customRoles).size !== customRoles.length) throw new Error('岗位选项不能重复。')
    if (customRoles.some(r => r.length > 40)) throw new Error('岗位名称过长（最多 40 字）。')
    const headRoles: Record<string, string> = {}
    for (const dept of departments) {
      const role = (input.headRoles?.[dept] ?? current.headRoles?.[dept] ?? '').trim()
      if (role) headRoles[dept] = role
    }
    this.cache = { version: 1, departments, teams, customRoles, headRoles }
    await this.persist()
    return this.cache
  }

  async addTeam(department: string, team: string) {
    const t = team?.trim()
    if (!t) throw new Error('小组名称必填。')
    const current = await this.load()
    if (!current.departments.includes(department?.trim())) throw new Error('部门选项不存在。')
    if ((current.teams[department] ?? []).includes(t)) throw new Error('小组已存在。')
    current.teams[department] = [...(current.teams[department] ?? []), t]
    await this.persist()
    return { ok: true }
  }

  async addRole(name: string) {
    const n = name?.trim()
    if (!n) throw new Error('岗位名称必填。')
    if (n.length > 40) throw new Error('岗位名称过长（最多 40 字）。')
    const current = await this.load()
    if (current.customRoles.includes(n)) throw new Error('岗位已存在。')
    current.customRoles.push(n)
    await this.persist()
    return { ok: true }
  }
}

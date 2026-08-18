import { Injectable } from '@nestjs/common'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'

type RoleStore = { version: 1; roles: string[] }

// 自定义岗位（内置 19 个岗位之外的岗位名称）
@Injectable()
export class RolesService {
  private cache: RoleStore | null = null

  private async load(): Promise<RoleStore> {
    if (this.cache) return this.cache
    try { this.cache = JSON.parse(await readFile(config.roleFile, 'utf8')) } catch { this.cache = { version: 1, roles: [] } }
    return this.cache!
  }

  private async persist() {
    const data = await this.load()
    await mkdir(dirname(config.roleFile), { recursive: true })
    await writeFile(config.roleFile, JSON.stringify(data, null, 2), { mode: 0o600 })
  }

  async list(): Promise<string[]> { return (await this.load()).roles }

  async add(name: string) {
    const n = name?.trim()
    if (!n) throw new Error('岗位名称必填。')
    if (n.length > 40) throw new Error('岗位名称过长（最多 40 字）。')
    const store = await this.load()
    if (store.roles.includes(n)) throw new Error('岗位已存在。')
    store.roles.push(n)
    await this.persist()
    return { ok: true }
  }

  async rename(oldName: string, newName: string) {
    const n = newName?.trim()
    if (!n) throw new Error('岗位名称必填。')
    const store = await this.load()
    if (!store.roles.includes(oldName)) throw new Error('岗位不存在。')
    if (store.roles.includes(n)) throw new Error('岗位已存在。')
    store.roles[store.roles.indexOf(oldName)] = n
    await this.persist()
    return { ok: true }
  }

  async remove(name: string) {
    const store = await this.load()
    const idx = store.roles.indexOf(name)
    if (idx < 0) throw new Error('岗位不存在。')
    store.roles.splice(idx, 1)
    await this.persist()
    return { ok: true }
  }
}

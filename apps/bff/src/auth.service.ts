import { Injectable, UnauthorizedException } from '@nestjs/common'
import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'
import type { Actor, Role } from './types.js'

type UserRecord = { id:string; username:string; displayName:string; role:string; isAdmin:boolean; passwordHash:string; disabled?:boolean; teamId?:string; teamName?:string; department?:string; departmentHead?:boolean }
type UserStore = { version:1; users:UserRecord[] }
type PublicUser = Actor & { username: string; disabled: boolean }
const roles: Record<Role, Pick<Actor,'displayName'|'organizationScope'>> = {
 general_manager:{displayName:'总经理',organizationScope:'全部经营数据'}, sales_vp:{displayName:'销售总监',organizationScope:'全部经营数据及销售明细'}, finance_vp:{displayName:'财务总监',organizationScope:'全部经营数据'}, sales_manager:{displayName:'销售一组组长',organizationScope:'本销售组数据'}, salesperson:{displayName:'销售员',organizationScope:'本人客户与协作项目'}, procurement_manager:{displayName:'采购一组组长',organizationScope:'本采购组数据'}, finance_manager:{displayName:'财务经理',organizationScope:'财务数据与用印审批'}, sales_team_lead:{displayName:'销售组长',organizationScope:'本销售组数据'}, project_coordinator:{displayName:'项目跟进员',organizationScope:'所跟进项目与协作客户'}, procurement_team_lead:{displayName:'采购组长',organizationScope:'本采购组数据'}, purchaser:{displayName:'采购员',organizationScope:'本人采购任务'}, quality_team:{displayName:'质量组',organizationScope:'质量与验收资料'}, hr_director:{displayName:'人力总监',organizationScope:'人力行政数据'}, admin_specialist:{displayName:'行政专员',organizationScope:'行政协同资料'}, accountant:{displayName:'会计',organizationScope:'凭证、归档与用印执行'}, shipping_manager:{displayName:'船务经理',organizationScope:'船务部门数据'}, shipping_operator:{displayName:'船务操作员',organizationScope:'本人船务任务'}, sales_support:{displayName:'销售支持',organizationScope:'技术支持、报价与研发资料'}, market_team:{displayName:'市场专员',organizationScope:'市场推广与线索资料'}
}
const hash=(password:string,salt=crypto.randomBytes(16).toString('base64url'))=>salt+':'+crypto.pbkdf2Sync(password,salt,210000,32,'sha256').toString('base64url')
const matches=(password:string,stored:string)=>{const [salt,value]=stored.split(':');if(!salt||!value)return false;const a=Buffer.from(value),b=Buffer.from(hash(password,salt).split(':')[1]);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
@Injectable()
export class AuthService {
 private cache:UserStore|null=null
 private secret(){return config.authSecret || config.bridgeSecret}
 private async load(){if(this.cache)return this.cache;try{this.cache=JSON.parse(await readFile(config.userFile,'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;if(!config.bootstrapAdminPassword||config.bootstrapAdminPassword.length<12)throw new Error('首次初始化需要通过安全环境配置提供至少 12 位的管理员密码。');this.cache={version:1,users:[{id:'admin',username:'admin',displayName:'管理员',role:'general_manager',isAdmin:true,passwordHash:hash(config.bootstrapAdminPassword)}]};await this.persist()}return this.cache!}
 private async persist(){const data=await this.load();await mkdir(dirname(config.userFile),{recursive:true});await writeFile(config.userFile,JSON.stringify(data,null,2),{mode:0o600})}
 async login(username:string,password:string){const store=await this.load(),user=store.users.find(item=>item.username===username&&!item.disabled);if(!user||!matches(password,user.passwordHash))throw new UnauthorizedException('账号或密码不正确。');return {user:this.publicUser(user),token:this.issue(user)}}
   async actorFromRequest(cookie?: string, authorization?: string) {
    const cookieToken = cookie?.match(/(?:^|;\s*)vigor_session=([^;]+)/)?.[1]
    const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
    if (!cookieToken && !bearerToken) throw new UnauthorizedException('请先登录。')
    return this.fromToken(decodeURIComponent(cookieToken || bearerToken || ''))
  }

  async fromToken(token:string){const [head,payload,signature]=token.split('.');if(!head||!payload||!signature||this.secret().length<32)throw new UnauthorizedException('登录已失效。');const expected=crypto.createHmac('sha256',this.secret()).update(head+'.'+payload).digest('base64url');const a=Buffer.from(signature),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new UnauthorizedException('登录已失效。');let data:any;try{data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{throw new UnauthorizedException('登录已失效。')}if(data.exp<Math.floor(Date.now()/1000))throw new UnauthorizedException('登录已过期。');const user=(await this.load()).users.find(item=>item.id===data.sub&&!item.disabled);if(!user)throw new UnauthorizedException('账号不可用。');return this.publicUser(user)}
 publicUser(user:UserRecord): PublicUser { return {id:user.id,username:user.username,displayName:user.displayName,role:user.role as Role,isAdmin:user.isAdmin,organizationScope:roles[user.role as Role]?.organizationScope ?? '按管理员配置的岗位范围访问',teamId:user.teamId,teamName:user.teamName,department:user.department,departmentHead:user.departmentHead===true,disabled:user.disabled===true}}
 private issue(user:UserRecord){if(this.secret().length<32)throw new UnauthorizedException('服务端会话密钥未配置。');const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({sub:user.id,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+28800})).toString('base64url');return head+'.'+payload+'.'+crypto.createHmac('sha256',this.secret()).update(head+'.'+payload).digest('base64url')}

  async listUsers() {
    return (await this.load()).users.map(user => this.publicUser(user))
  }

  async saveUser(input: { id?: string; username?: string; displayName?: string; role?: string; isAdmin?: boolean; password?: string; disabled?: boolean; teamId?: string; teamName?: string; department?: string; departmentHead?: boolean }) {
    const store = await this.load()
    const username = input.username?.trim()
    const displayName = input.displayName?.trim()
    const role = input.role?.trim()
    if (!username || !displayName || !role || role.length > 40) throw new UnauthorizedException('账号信息或岗位无效。')
    const department = input.department?.trim() || undefined
    const teamName = input.teamName?.trim() || undefined
    // 销售小组 ID 不再手工填写：销售部小组按 V{n} 自动推导（保持销售数据隔离），其余部门无需 ID
    const salesNo = department === '销售部' ? teamName?.match(/V(\d+)/)?.[1] : undefined
    const teamId = input.teamId?.trim() || (salesNo ? `sales-v${salesNo}` : undefined)
    let user = input.id ? store.users.find(item => item.id === input.id) : store.users.find(item => item.username === username)
    if (user) {
      if (user.username !== username && store.users.some(item => item.username === username)) throw new UnauthorizedException('账号已存在。')
      user.username = username; user.displayName = displayName; user.role = role; user.isAdmin = input.isAdmin === true; user.disabled = input.disabled === true; user.teamId = teamId; user.teamName = teamName; user.department = department; user.departmentHead = input.departmentHead === true
      if (input.password) { if (input.password.length < 8) throw new UnauthorizedException('密码至少需要 8 位。'); user.passwordHash = hash(input.password) }
    } else {
      if (!input.password || input.password.length < 8) throw new UnauthorizedException('新账号密码至少需要 8 位。')
      user = { id: crypto.randomUUID(), username, displayName, role, isAdmin: input.isAdmin === true, disabled: input.disabled === true, teamId, teamName, department, departmentHead: input.departmentHead === true, passwordHash: hash(input.password) }
      store.users.push(user)
    }
    await this.persist()
    return this.publicUser(user)
  }

  async deleteUser(id: string) {
    const store = await this.load()
    const idx = store.users.findIndex(item => item.id === id)
    if (idx < 0) throw new Error('账号不存在。')
    store.users.splice(idx, 1)
    await this.persist()
    return { ok: true }
  }

  async changePassword(actorId: string, currentPassword: string, nextPassword: string) {
    if (nextPassword.length < 8) throw new UnauthorizedException('新密码至少需要 8 位。')
    const user = (await this.load()).users.find(item => item.id === actorId)
    if (!user || !matches(currentPassword, user.passwordHash)) throw new UnauthorizedException('当前密码不正确。')
    user.passwordHash = hash(nextPassword)
    await this.persist()
    return { ok: true }
  }

  // ---- 组织结构级联（部门/小组/岗位重命名时同步更新账号） ----
  async renameDepartment(oldName: string, newName: string) {
    const store = await this.load(); let changed = 0
    for (const u of store.users) if (u.department === oldName) { u.department = newName; changed++ }
    if (changed) await this.persist()
    return { ok: true, changed }
  }
  async renameTeam(department: string, oldTeam: string, newTeam: string) {
    const store = await this.load(); let changed = 0
    for (const u of store.users) if (u.department === department && u.teamName === oldTeam) { u.teamName = newTeam; changed++ }
    if (changed) await this.persist()
    return { ok: true, changed }
  }
  async renameRole(oldRole: string, newRole: string) {
    const store = await this.load(); let changed = 0
    for (const u of store.users) if (u.role === oldRole) { u.role = newRole; changed++ }
    if (changed) await this.persist()
    return { ok: true, changed }
  }
  async countDepartmentUsers(department: string) { return (await this.load()).users.filter(u => u.department === department).length }
  async countTeamUsers(department: string, team: string) { return (await this.load()).users.filter(u => u.department === department && u.teamName === team).length }
  async countRoleUsers(role: string) { return (await this.load()).users.filter(u => u.role === role).length }

}

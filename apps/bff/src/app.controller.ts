import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, HttpException, Param, Patch, Post, Put, Res, UnauthorizedException } from '@nestjs/common'
import crypto from 'node:crypto'
import { config } from './config.js'
import { AppsService } from './apps.service.js'
import { IdentityService } from './identity.service.js'
import { TodosService } from './todos.service.js'
import { IntegrationsService, type ServiceInput } from './integrations.service.js'
import { AuthService } from './auth.service.js'
import { SalesService } from './sales.service.js'
import { OrgService, type OrgPersonInput } from './org.service.js'
import type { TodoEventInput } from './types.js'

@Controller()
export class AppController {
  constructor(private readonly identity: IdentityService, private readonly apps: AppsService, private readonly todos: TodosService, private readonly integrations: IntegrationsService, private readonly auth: AuthService, private readonly sales: SalesService, private readonly org: OrgService) {}

  @Get('health') health() { return { status: 'ok', todoStorage: this.todos.storageMode() } }

  @Post('auth/login')
  async login(@Body() body: { username?: string; password?: string }, @Res({ passthrough: true }) response: any) {
    if (!body?.username || !body?.password) throw new BadRequestException('请输入账号和密码。')
    const result = await this.auth.login(body.username, body.password)
    response.cookie('vigor_session', result.token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 8 * 60 * 60 * 1000 })
    return { user: result.user }
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: any) {
    response.clearCookie('vigor_session', { httpOnly: true, sameSite: 'lax', secure: false, path: '/' })
    return { ok: true }
  }

  @Get('auth/session')
  async session(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { return { user: await this.auth.actorFromRequest(cookie, authorization) } }
  @Get('me')
  async me(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { return this.auth.actorFromRequest(cookie, authorization) }
  @Get('apps')
  async appsForActor(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { const actor = await this.auth.actorFromRequest(cookie, authorization); return this.apps.list(actor.role) }
  @Get('todos')
  async todosForActor(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { return this.todos.list(await this.auth.actorFromRequest(cookie, authorization)) }

  @Patch('todos/:id')
  async updateTodo(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { completed?: boolean }) {
    if (typeof body?.completed !== 'boolean') throw new BadRequestException('completed 必须为布尔值。')
    return this.todos.setCompleted(await this.auth.actorFromRequest(cookie, authorization), id, body.completed)
  }

  @Post('auth/bridge')
  async bridge(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { appId?: string }) {
    if (body?.appId !== 'ai-sales-coach') throw new BadRequestException('不支持的桥接应用。')
    const actor = await this.auth.actorFromRequest(cookie, authorization)
    if (!this.apps.list(actor.role).some(app => app.id === body.appId)) throw new ForbiddenException('当前岗位无权访问该应用。')
    return this.identity.issueBridgeToken({ id: actor.id, username: actor.username, displayName: actor.displayName, role: actor.role, isAdmin: actor.isAdmin === true, appId: body.appId })
  }

  private async admin(cookie?: string, authorization?: string) { const actor = await this.auth.actorFromRequest(cookie, authorization); if (!actor.isAdmin) throw new ForbiddenException('仅管理员可管理服务与授权。'); return actor }
  @Get('admin/api-services')
  async listApiServices(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { await this.admin(cookie, authorization); return this.integrations.list() }
  @Put('admin/api-services/:serviceId')
  async saveApiService(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('serviceId') serviceId: string, @Body() body?: ServiceInput) { await this.admin(cookie, authorization); return this.integrations.saveService(serviceId, body ?? {}).catch(error => { throw new BadRequestException(error.message) }) }
  @Delete('admin/api-services/:serviceId')
  async removeApiService(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('serviceId') serviceId: string) { await this.admin(cookie, authorization); return this.integrations.removeService(serviceId).catch(error => { throw new BadRequestException(error.message) }) }
  @Get('admin/app-grants/:appId')
  async appGrants(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('appId') appId: string) { await this.admin(cookie, authorization); return this.integrations.grants(appId) }
  @Put('admin/app-grants/:appId')
  async saveAppGrants(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('appId') appId: string, @Body() body?: { serviceIds?: string[] }) { await this.admin(cookie, authorization); return this.integrations.saveGrants(appId, body ?? {}).catch(error => { throw new BadRequestException(error.message) }) }

  @Get('admin/app-permissions')
  async listAppPermissions(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { await this.admin(cookie, authorization); return this.apps.all() }

  @Put('admin/app-permissions/:appId')
  async saveAppPermissions(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('appId') appId: string, @Body() body?: { roles?: string[] }) {
    await this.admin(cookie, authorization)
    return this.apps.saveRoles(appId, body?.roles).catch(error => { throw new BadRequestException(error.message) })
  }

  @Get('admin/users')
  async listUsers(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { await this.admin(cookie, authorization); return this.auth.listUsers() }

  @Put('admin/users/:id')
  async saveUser(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { username?: string; displayName?: string; role?: string; isAdmin?: boolean; password?: string; disabled?: boolean; teamId?: string; teamName?: string }) {
    await this.admin(cookie, authorization)
    return this.auth.saveUser({ ...body, id, role: body?.role as any }).catch(error => { throw new BadRequestException(error.message) })
  }

  @Post('admin/users')
  async createUser(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { username?: string; displayName?: string; role?: string; isAdmin?: boolean; password?: string; disabled?: boolean; teamId?: string; teamName?: string }) {
    await this.admin(cookie, authorization)
    return this.auth.saveUser({ ...body, role: body?.role as any }).catch(error => { throw new BadRequestException(error.message) })
  }

  @Post('auth/change-password')
  async changePassword(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { currentPassword?: string; nextPassword?: string }) {
    if (!body?.currentPassword || !body?.nextPassword) throw new BadRequestException('请输入当前密码和新密码。')
    const actor = await this.auth.actorFromRequest(cookie, authorization)
    return this.auth.changePassword(actor.id, body.currentPassword, body.nextPassword)
  }

  @Get('sales/overview')
  async salesOverview(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { return this.sales.snapshot(await this.auth.actorFromRequest(cookie, authorization)) }

  @Post('sales/clients')
  async createSalesClient(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { name?: string; source?: 'exhibition'|'website'|'platform'|'referral' }) { return this.sales.createClient(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/opportunities')
  async createSalesOpportunity(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { clientId?: string; title?: string; amount?: number }) { return this.sales.createOpportunity(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/quotes')
  async createSalesQuote(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { opportunityId?: string; amount?: number; currency?: string; validUntil?: string }) { return this.sales.createQuote(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/quotes/:id/submit')
  async submitSalesQuote(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string) { return this.sales.submitQuote(await this.auth.actorFromRequest(cookie, authorization), id) }

  @Post('sales/quotes/:id/approval')
  async approveSalesQuote(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { approved?: boolean; note?: string }) { if (typeof body?.approved !== 'boolean') throw new BadRequestException('请指定审批结论。'); return this.sales.approveQuote(await this.auth.actorFromRequest(cookie, authorization), id, body.approved, body.note) }

  @Post('sales/contracts')
  async createSalesContract(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { quoteId?: string; title?: string }) { return this.sales.createContract(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/contracts/:id/ci-confirmation')
  async confirmSalesContractCi(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string) { return this.sales.confirmCi(await this.auth.actorFromRequest(cookie, authorization), id) }

  @Post('sales/contracts/:id/seal-applications')
  async requestSalesContractSeal(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { reason?: string }) { return this.sales.requestSeal(await this.auth.actorFromRequest(cookie, authorization), id, body ?? {}) }

  @Post('sales/seal-applications/:id/review')
  async reviewSalesContractSeal(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { approved?: boolean; note?: string }) { return this.sales.reviewSeal(await this.auth.actorFromRequest(cookie, authorization), id, body ?? {}) }

  @Post('sales/seal-applications/:id/execute')
  async executeSalesContractSeal(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { note?: string }) { return this.sales.executeSeal(await this.auth.actorFromRequest(cookie, authorization), id, body ?? {}) }

  @Post('sales/contracts/:id/archives/electronic')
  async registerElectronicContractArchive(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { fileName?: string; version?: string; locationRef?: string }) { return this.sales.registerElectronicArchive(await this.auth.actorFromRequest(cookie, authorization), id, body ?? {}) }

  @Post('sales/contracts/:id/archives/paper')
  async registerPaperContractArchive(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body?: { archiveNumber?: string; location?: string }) { return this.sales.registerPaperArchive(await this.auth.actorFromRequest(cookie, authorization), id, body ?? {}) }

  @Post('sales/payments')
  async recordSalesPayment(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { contractId?: string; amount?: number; receivedAt?: string }) { return this.sales.recordPayment(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/projects')
  async createSalesProject(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: { contractId?: string; coordinatorId?: string; coordinatorName?: string }) { return this.sales.createProject(await this.auth.actorFromRequest(cookie, authorization), body ?? {}) }

  @Post('sales/:entity/:id/team-transfer')
  async transferSalesTeam(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('entity') entity: string, @Param('id') id: string, @Body() body?: { teamId?: string; teamName?: string; note?: string }) { return this.sales.transferTeam(await this.auth.actorFromRequest(cookie, authorization), entity, id, body ?? {}) }

  // 组织选择器令牌：外部程序可凭 X-Picker-Token（或 query token）访问 org 数据，无需工作台会话。
  private async requireOrgAccess(cookie: string | undefined, authorization: string | undefined, pickerToken?: string) {
    try {
      await this.auth.actorFromRequest(cookie, authorization)
      return
    } catch {
      if (config.orgPickerToken && pickerToken) {
        const a = Buffer.from(config.orgPickerToken)
        const b = Buffer.from(pickerToken)
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) return
      }
      throw new UnauthorizedException('请先登录，或提供有效的选择器令牌。')
    }
  }

  // 内测隔离入口：先走真实会话；无会话时仅在 DEMO_MODE=true 下回退到 X-Demo-Role。
  // 生产（DEMO_MODE=false）时 actorFromDemoRole 会抛 401，隔离入口自动失效。
  private async actorOrDemo(cookie: string | undefined, authorization: string | undefined, demoRole: string | undefined) {
    try {
      return await this.auth.actorFromRequest(cookie, authorization)
    } catch (error) {
      // 内测隔离入口：仅当显式携带 X-Demo-Role 且 DEMO_MODE=true 时才回退；否则沿用原 401。
      if (!demoRole) throw error
      return this.identity.actorFromDemoRole(demoRole)
    }
  }

  @Get('internal/app-context/:appId')
  async appContext(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Headers('x-demo-role') demoRole: string | undefined, @Param('appId') appId: string, @Res({ passthrough: true }) response: any) {
    const actor = await this.actorOrDemo(cookie, authorization, demoRole)
    if (!this.apps.list(actor.role).some(app => app.id === appId && app.permitted)) throw new ForbiddenException('当前岗位无权访问该应用。')
    response.header('X-Workbench-Admin', actor.isAdmin === true ? 'true' : 'false')
    return { ok: true }
  }

  @Get('internal/app-access/:appId')
  async appAccess(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Headers('x-demo-role') demoRole: string | undefined, @Param('appId') appId: string) {
    const actor = await this.actorOrDemo(cookie, authorization, demoRole)
    if (!this.apps.list(actor.role).some(app => app.id === appId && app.permitted)) throw new ForbiddenException('当前岗位无权访问该应用。')
    return { ok: true }
  }

  @Get('apps/:appId/api-services')
  async appApiServices(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('appId') appId: string) { const actor = await this.auth.actorFromRequest(cookie, authorization); if (!this.apps.list(actor.role).some(app => app.id === appId)) throw new ForbiddenException('当前岗位无权访问该应用。'); return this.integrations.authorizedForApp(appId) }
  @Post('apps/:appId/ai/chat/completions')
  async aiChatCompletion(@Param('appId') appId: string, @Headers('x-workbench-app-id') caller: string | undefined, @Headers('x-workbench-app-secret') headerSecret: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: unknown) { const appSecret = headerSecret || (authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined); if ((caller && caller !== appId) || !appSecret || !this.identity.verifyAppProxySecret(appId, appSecret)) throw new ForbiddenException('应用身份验证失败。'); const result = await this.integrations.proxyChatCompletion(appId, body).catch(error => { throw new BadRequestException(error.message) }); if (result.status < 200 || result.status >= 300) throw new HttpException(result.body as object, result.status); return result.body }
  @Get('org/tree')
  async orgTree(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string, @Headers('x-picker-token') pickerToken?: string) { await this.requireOrgAccess(cookie, authorization, pickerToken); return this.org.tree() }
  @Get('org/persons')
  async orgPersons(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string, @Headers('x-picker-token') pickerToken?: string) { await this.requireOrgAccess(cookie, authorization, pickerToken); return this.org.list() }
  @Get('org/departments')
  async orgDepartments(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string, @Headers('x-picker-token') pickerToken?: string) { await this.requireOrgAccess(cookie, authorization, pickerToken); return this.org.departments() }

  @Post('org/persons')
  async createOrgPerson(@Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string, @Body() body?: OrgPersonInput) { await this.admin(cookie, authorization); return this.org.addPerson(body ?? {}).catch(error => { throw new BadRequestException(error.message) }) }
  @Put('org/persons/:id')
  async updateOrgPerson(@Param('id') id: string, @Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string, @Body() body?: OrgPersonInput) { await this.admin(cookie, authorization); return this.org.updatePerson(id, body ?? {}).catch(error => { throw new BadRequestException(error.message) }) }
  @Delete('org/persons/:id')
  async deleteOrgPerson(@Param('id') id: string, @Headers('cookie') cookie?: string, @Headers('authorization') authorization?: string) { await this.admin(cookie, authorization); return this.org.deletePerson(id).catch(error => { throw new BadRequestException(error.message) }) }

  @Post('events')
  async ingestEvent(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body?: TodoEventInput) { if (!body?.eventId?.trim() || !body?.type || typeof body.source !== 'string') throw new BadRequestException('事件需要 eventId、type 和 source。'); if (!['todo.created', 'todo.completed', 'todo.overdue'].includes(body.type)) throw new BadRequestException('不支持的事件类型。'); return this.todos.ingest(await this.auth.actorFromRequest(cookie, authorization), body) }
}

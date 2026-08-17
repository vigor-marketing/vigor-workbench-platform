import { BadRequestException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from './config.js'
import type { Actor, Role } from './types.js'

type Source = 'exhibition' | 'website' | 'platform' | 'referral'
type TeamOwned = { teamId: string; teamName: string }
type Client = TeamOwned & { id: string; code: string; name: string; source: Source; ownerId: string; ownerName: string; createdAt: string }
type Opportunity = TeamOwned & { id: string; code: string; clientId: string; title: string; amount?: number; ownerId: string; ownerName: string; stage: 'new'|'quoted'|'contracted'|'lost'; createdAt: string }
type Quote = TeamOwned & { id: string; code: string; version: number; opportunityId: string; clientId: string; amount: number; currency: string; validUntil: string; status: 'draft'|'submitted'|'approved'|'rejected'; createdBy: string; createdName: string; createdByRole?: Role; submittedAt?: string; approvedAt?: string; approvedBy?: string; approvedByRole?: Role; formalNumber?: string; audit: { at: string; action: string; by: string; note?: string }[] }
type Contract = TeamOwned & { id: string; code: string; quoteId: string; clientId: string; title: string; status: 'draft'|'approved'|'signed'; ciConfirmed: boolean; createdBy: string; createdAt: string; sealStatus?: 'pending_finance'|'rejected'|'pending_seal'|'sealed'; sealedAt?: string; sealedBy?: string }
type Payment = TeamOwned & { id: string; code: string; contractId: string; amount: number; receivedAt: string; recordedBy: string }
type Project = TeamOwned & { id: string; code: string; contractId: string; coordinatorId: string; coordinatorName: string; status: 'active'|'completed'; createdAt: string }
type SealApplication = TeamOwned & { id: string; contractId: string; status: 'pending_finance'|'rejected'|'pending_seal'|'sealed'; requestedAt: string; requestedBy: string; requestedByName: string; reason?: string; reviewedAt?: string; reviewedBy?: string; reviewNote?: string; sealedAt?: string; sealedBy?: string; sealNote?: string; audit: { at: string; action: string; by: string; note?: string }[] }
type ContractArchive = TeamOwned & { id: string; contractId: string; electronic?: { fileName: string; version: string; locationRef: string; registeredAt: string; registeredBy: string }; paper?: { archiveNumber: string; location: string; registeredAt: string; registeredBy: string }; audit: { at: string; action: string; by: string; note?: string }[] }
type SalesEntity = 'clients'|'opportunities'|'quotes'|'contracts'|'payments'|'projects'
type TeamTransfer = { at: string; entity: SalesEntity; recordId: string; fromTeamId: string; fromTeamName: string; toTeamId: string; toTeamName: string; byId: string; byName: string; note?: string }
type SalesStore = { version: 4; counters: Record<string, number>; clients: Client[]; opportunities: Opportunity[]; quotes: Quote[]; contracts: Contract[]; payments: Payment[]; projects: Project[]; sealApplications: SealApplication[]; contractArchives: ContractArchive[]; teamTransfers: TeamTransfer[] }

const operationalRoles = new Set<Role>(['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson','project_coordinator'])
const salesRoles = new Set<Role>([...operationalRoles, 'finance_manager', 'accountant'])
const globalManagers = new Set<Role>(['general_manager','sales_vp','sales_manager'])
const quoteCreators = new Set<Role>(['general_manager','sales_vp','sales_manager','sales_team_lead','salesperson'])
const legacyTeam = { teamId: 'sales-team-1', teamName: '销售一组' }
const entities = new Set<SalesEntity>(['clients','opportunities','quotes','contracts','payments','projects'])

@Injectable()
export class SalesService implements OnModuleInit {
  private store: SalesStore = { version: 4, counters: {}, clients: [], opportunities: [], quotes: [], contracts: [], payments: [], projects: [], sealApplications: [], contractArchives: [], teamTransfers: [] }

  async onModuleInit() {
    try {
      const raw = JSON.parse(await readFile(config.salesFile, 'utf8'))
      const migrated = raw.version !== 4 || !Array.isArray(raw.sealApplications) || !Array.isArray(raw.contractArchives) || !Array.isArray(raw.teamTransfers) || [...entities].some(entity => raw[entity]?.some((item: any) => !item.teamId || !item.teamName))
      this.store = this.migrate(raw)
      if (migrated) await this.persist()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') await this.persist()
      else throw error
    }
  }

  snapshot(actor: Actor) {
    this.assertSales(actor)
    const match = <T extends TeamOwned>(items: T[]) => items.filter(item => this.canAccess(actor, item))
    const capabilities = { manageSales: operationalRoles.has(actor.role), requestSeal: actor.role === 'salesperson', approveSeal: actor.role === 'finance_manager', executeSeal: actor.role === 'accountant', registerElectronicArchive: actor.role === 'salesperson', registerPaperArchive: actor.role === 'accountant' }
    if (actor.role === 'finance_manager' || actor.role === 'accountant') return { clients: [], opportunities: [], quotes: this.store.quotes.filter(item => item.status === 'approved'), contracts: this.store.contracts, payments: [], projects: [], sealApplications: this.store.sealApplications, contractArchives: this.store.contractArchives, capabilities }
    return { clients: match(this.store.clients), opportunities: match(this.store.opportunities), quotes: match(this.store.quotes), contracts: match(this.store.contracts), payments: match(this.store.payments), projects: match(this.store.projects), sealApplications: match(this.store.sealApplications), contractArchives: match(this.store.contractArchives), capabilities }
  }

  async createClient(actor: Actor, input: { name?: string; source?: Source }) {
    this.assertOperational(actor)
    if (!input.name?.trim() || !input.source) throw new BadRequestException('客户名称和来源必填。')
    const item: Client = { id: crypto.randomUUID(), code: this.next('CUS'), name: input.name.trim(), source: input.source, ownerId: actor.id, ownerName: actor.displayName, createdAt: new Date().toISOString(), ...this.teamForCreate(actor) }
    this.store.clients.push(item); await this.persist(); return item
  }

  async createOpportunity(actor: Actor, input: { clientId?: string; title?: string; amount?: number }) {
    this.assertOperational(actor)
    const client = this.store.clients.find(item => item.id === input.clientId)
    if (!client || !this.canAccess(actor, client) || !input.title?.trim()) throw new BadRequestException('请选择本权限范围内的客户并填写商机名称。')
    const item: Opportunity = { id: crypto.randomUUID(), code: this.next('OPP'), clientId: client.id, title: input.title.trim(), amount: input.amount, ownerId: actor.id, ownerName: actor.displayName, stage: 'new', createdAt: new Date().toISOString(), ...this.teamOf(client) }
    this.store.opportunities.push(item); await this.persist(); return item
  }

  async createQuote(actor: Actor, input: { opportunityId?: string; amount?: number; currency?: string; validUntil?: string }) {
    this.assertOperational(actor)
    if (!quoteCreators.has(actor.role)) throw new ForbiddenException('当前岗位不承担报价创建职责。')
    const opportunity = this.store.opportunities.find(item => item.id === input.opportunityId)
    if (!opportunity || !this.canAccess(actor, opportunity) || !Number.isFinite(input.amount) || Number(input.amount) <= 0 || !input.validUntil) throw new BadRequestException('报价需要本权限范围内的商机、金额与有效期。')
    const versions = this.store.quotes.filter(item => item.opportunityId === opportunity.id)
    const item: Quote = { id: crypto.randomUUID(), code: this.next('QTE'), version: versions.length + 1, opportunityId: opportunity.id, clientId: opportunity.clientId, amount: Number(input.amount), currency: input.currency || 'USD', validUntil: input.validUntil, status: 'draft', createdBy: actor.id, createdName: actor.displayName, createdByRole: actor.role, audit: [{ at: new Date().toISOString(), action: '创建草稿', by: actor.displayName }], ...this.teamOf(opportunity) }
    this.store.quotes.push(item); await this.persist(); return item
  }

  async submitQuote(actor: Actor, quoteId: string) {
    const quote = this.quoteOwned(actor, quoteId)
    if (quote.status !== 'draft') throw new BadRequestException('仅草稿报价可提交。')
    quote.submittedAt = new Date().toISOString()
    if (actor.role === 'sales_vp' || actor.role === 'general_manager') {
      this.approve(quote, actor, '按岗位规则无需审批，提交即生效')
    } else {
      quote.status = 'submitted'; quote.audit.push({ at: quote.submittedAt, action: '提交审批', by: actor.displayName })
    }
    await this.persist(); return quote
  }

  async approveQuote(actor: Actor, quoteId: string, approved: boolean, note?: string) {
    this.assertOperational(actor)
    const quote = this.store.quotes.find(item => item.id === quoteId)
    if (!quote || !this.canAccess(actor, quote) || quote.status !== 'submitted') throw new BadRequestException('不存在本权限范围内的待审批报价。')
    if (!this.canApprove(actor, quote)) throw new ForbiddenException(this.approvalHint(quote))
    if (quote.createdBy === actor.id) throw new ForbiddenException('不能审批本人提交的报价。')
    if (approved) this.approve(quote, actor, note)
    else { quote.status = 'rejected'; quote.approvedAt = new Date().toISOString(); quote.approvedBy = actor.displayName; quote.approvedByRole = actor.role; quote.audit.push({ at: quote.approvedAt, action: '审批驳回', by: actor.displayName, note }) }
    await this.persist(); return quote
  }

  async createContract(actor: Actor, input: { quoteId?: string; title?: string }) {
    this.assertOperational(actor)
    const quote = this.store.quotes.find(item => item.id === input.quoteId && item.status === 'approved')
    if (!quote || !this.canAccess(actor, quote) || !input.title?.trim()) throw new BadRequestException('合同必须基于本权限范围内已审批的正式报价单。')
    const item: Contract = { id: crypto.randomUUID(), code: this.next('CON'), quoteId: quote.id, clientId: quote.clientId, title: input.title.trim(), status: 'draft', ciConfirmed: false, createdBy: actor.id, createdAt: new Date().toISOString(), ...this.teamOf(quote) }
    this.store.contracts.push(item); await this.persist(); return item
  }

  async confirmCi(actor: Actor, contractId: string) {
    this.assertOperational(actor)
    const contract = this.store.contracts.find(item => item.id === contractId)
    if (!contract || !this.canAccess(actor, contract) || (contract.createdBy !== actor.id && !globalManagers.has(actor.role) && actor.role !== 'sales_team_lead')) throw new ForbiddenException('无权确认合同 CI。')
    contract.status = 'signed'; contract.ciConfirmed = true; const opportunity = this.store.opportunities.find(item => item.clientId === contract.clientId && item.teamId === contract.teamId); if (opportunity) opportunity.stage = 'contracted'; await this.persist(); return contract
  }

  async requestSeal(actor: Actor, contractId: string, input: { reason?: string }) {
    this.assertSales(actor)
    if (actor.role !== 'salesperson') throw new ForbiddenException('仅销售员可发起合同用印申请。')
    const contract = this.store.contracts.find(item => item.id === contractId)
    if (!contract || !this.canAccess(actor, contract)) throw new BadRequestException('合同不存在或不在本组权限范围内。')
    if (this.store.sealApplications.some(item => item.contractId === contractId && item.status !== 'rejected')) throw new BadRequestException('该合同已有进行中的用印申请。')
    const now = new Date().toISOString()
    const item: SealApplication = { id: crypto.randomUUID(), contractId, status: 'pending_finance', requestedAt: now, requestedBy: actor.id, requestedByName: actor.displayName, reason: input.reason?.trim() || undefined, audit: [{ at: now, action: '发起用印申请', by: actor.displayName, note: input.reason?.trim() || undefined }], ...this.teamOf(contract) }
    contract.sealStatus = item.status; this.store.sealApplications.push(item); await this.persist(); return item
  }

  async reviewSeal(actor: Actor, applicationId: string, input: { approved?: boolean; note?: string }) {
    this.assertSales(actor)
    if (actor.role !== 'finance_manager') throw new ForbiddenException('仅财务经理可审批用印申请。')
    if (typeof input.approved !== 'boolean') throw new BadRequestException('请指定用印审批结论。')
    const item = this.store.sealApplications.find(entry => entry.id === applicationId)
    if (!item || item.status !== 'pending_finance') throw new BadRequestException('不存在待财务审批的用印申请。')
    item.status = input.approved ? 'pending_seal' : 'rejected'; item.reviewedAt = new Date().toISOString(); item.reviewedBy = actor.displayName; item.reviewNote = input.note?.trim() || undefined
    item.audit.push({ at: item.reviewedAt, action: input.approved ? '财务审批通过，等待盖章' : '财务审批驳回', by: actor.displayName, note: item.reviewNote })
    const contract = this.store.contracts.find(entry => entry.id === item.contractId); if (contract) contract.sealStatus = item.status
    await this.persist(); return item
  }

  async executeSeal(actor: Actor, applicationId: string, input: { note?: string }) {
    this.assertSales(actor)
    if (actor.role !== 'accountant') throw new ForbiddenException('仅会计可执行并登记盖章。')
    const item = this.store.sealApplications.find(entry => entry.id === applicationId)
    if (!item || item.status !== 'pending_seal') throw new BadRequestException('不存在待盖章的已审批申请。')
    item.status = 'sealed'; item.sealedAt = new Date().toISOString(); item.sealedBy = actor.displayName; item.sealNote = input.note?.trim() || undefined
    item.audit.push({ at: item.sealedAt, action: '完成盖章登记', by: actor.displayName, note: item.sealNote })
    const contract = this.store.contracts.find(entry => entry.id === item.contractId); if (contract) { contract.sealStatus = 'sealed'; contract.sealedAt = item.sealedAt; contract.sealedBy = actor.displayName }
    await this.persist(); return item
  }

  async registerElectronicArchive(actor: Actor, contractId: string, input: { fileName?: string; version?: string; locationRef?: string }) {
    this.assertSales(actor)
    if (actor.role !== 'salesperson') throw new ForbiddenException('仅销售员可登记电子合同归档。')
    const contract = this.store.contracts.find(item => item.id === contractId)
    if (!contract || !this.canAccess(actor, contract)) throw new BadRequestException('合同不存在或不在本组权限范围内。')
    const fileName = input.fileName?.trim(), version = input.version?.trim(), locationRef = input.locationRef?.trim()
    if (!fileName || !version || !locationRef) throw new BadRequestException('电子归档需填写文件名、版本和非敏感位置引用。')
    const item = this.archiveFor(contract), now = new Date().toISOString()
    item.electronic = { fileName, version, locationRef, registeredAt: now, registeredBy: actor.displayName }
    item.audit.push({ at: now, action: '登记电子合同归档', by: actor.displayName, note: `${fileName} · ${version}` })
    await this.persist(); return item
  }

  async registerPaperArchive(actor: Actor, contractId: string, input: { archiveNumber?: string; location?: string }) {
    this.assertSales(actor)
    if (actor.role !== 'accountant') throw new ForbiddenException('仅会计可登记纸质合同归档。')
    const contract = this.store.contracts.find(item => item.id === contractId)
    if (!contract) throw new BadRequestException('合同不存在。')
    const archiveNumber = input.archiveNumber?.trim(), location = input.location?.trim()
    if (!archiveNumber || !location) throw new BadRequestException('纸质归档需填写归档编号和存放位置。')
    const item = this.archiveFor(contract), now = new Date().toISOString()
    item.paper = { archiveNumber, location, registeredAt: now, registeredBy: actor.displayName }
    item.audit.push({ at: now, action: '登记纸质合同归档', by: actor.displayName, note: `${archiveNumber} · ${location}` })
    await this.persist(); return item
  }

  async recordPayment(actor: Actor, input: { contractId?: string; amount?: number; receivedAt?: string }) {
    this.assertOperational(actor)
    const contract = this.store.contracts.find(item => item.id === input.contractId)
    if (!contract || !this.canAccess(actor, contract) || !Number.isFinite(input.amount) || Number(input.amount) <= 0 || !input.receivedAt) throw new BadRequestException('回款需要本权限范围内的合同、金额与日期。')
    const item: Payment = { id: crypto.randomUUID(), code: this.next('PAY'), contractId: contract.id, amount: Number(input.amount), receivedAt: input.receivedAt, recordedBy: actor.displayName, ...this.teamOf(contract) }
    this.store.payments.push(item); await this.persist(); return item
  }

  async createProject(actor: Actor, input: { contractId?: string; coordinatorId?: string; coordinatorName?: string }) {
    this.assertOperational(actor)
    const contract = this.store.contracts.find(item => item.id === input.contractId && item.ciConfirmed)
    if (!contract || !this.canAccess(actor, contract) || !input.coordinatorId || !input.coordinatorName) throw new BadRequestException('仅本权限范围内签署并确认 CI 的合同可创建项目，且需指定项目跟进员。')
    const item: Project = { id: crypto.randomUUID(), code: this.next('PRJ'), contractId: contract.id, coordinatorId: input.coordinatorId, coordinatorName: input.coordinatorName, status: 'active', createdAt: new Date().toISOString(), ...this.teamOf(contract) }
    this.store.projects.push(item); await this.persist(); return item
  }

  async transferTeam(actor: Actor, entity: string, recordId: string, input: { teamId?: string; teamName?: string; note?: string }) {
    this.assertOperational(actor)
    if (!globalManagers.has(actor.role)) throw new ForbiddenException('仅销售经理及以上岗位可跨组转移。')
    if (!entities.has(entity as SalesEntity) || !input.teamId?.trim() || !input.teamName?.trim()) throw new BadRequestException('请选择有效记录并填写目标销售小组。')
    const kind = entity as SalesEntity
    const record = (this.store[kind] as (TeamOwned & { id: string })[]).find(item => item.id === recordId)
    if (!record) throw new BadRequestException('销售记录不存在。')
    const from = this.teamOf(record); const to = { teamId: input.teamId.trim(), teamName: input.teamName.trim() }
    if (from.teamId === to.teamId) throw new BadRequestException('记录已属于目标销售小组。')
    const affected = this.related(kind, recordId)
    for (const [affectedKind, ids] of affected) for (const item of this.store[affectedKind] as (TeamOwned & { id: string })[]) if (ids.has(item.id)) Object.assign(item, to)
    const affectedContracts = affected.get('contracts')!
    for (const item of this.store.sealApplications) if (affectedContracts.has(item.contractId)) Object.assign(item, to)
    for (const item of this.store.contractArchives) if (affectedContracts.has(item.contractId)) Object.assign(item, to)
    this.store.teamTransfers.push({ at: new Date().toISOString(), entity: kind, recordId, fromTeamId: from.teamId, fromTeamName: from.teamName, toTeamId: to.teamId, toTeamName: to.teamName, byId: actor.id, byName: actor.displayName, note: input.note?.trim() || undefined })
    await this.persist(); return { ok: true, affected: [...affected.values()].reduce((total, ids) => total + ids.size, 0) + this.store.sealApplications.filter(item => affectedContracts.has(item.contractId)).length + this.store.contractArchives.filter(item => affectedContracts.has(item.contractId)).length, ...to }
  }

  private quoteOwned(actor: Actor, id: string) { this.assertOperational(actor); const quote = this.store.quotes.find(item => item.id === id); if (!quote || !this.canAccess(actor, quote) || quote.createdBy !== actor.id) throw new ForbiddenException('仅报价创建人可提交该报价。'); return quote }
  private canApprove(actor: Actor, quote: Quote) {
    if (actor.role === 'general_manager') return true
    if (quote.createdByRole === 'salesperson') return actor.role === 'sales_team_lead' && actor.teamId === quote.teamId
    if (quote.createdByRole === 'sales_team_lead') return actor.role === 'sales_manager' || actor.role === 'sales_vp'
    if (quote.createdByRole === 'sales_manager') return actor.role === 'sales_vp'
    return false
  }
  private approvalHint(quote: Quote) {
    if (quote.createdByRole === 'salesperson') return '销售员报价仅由本组销售组长审批。'
    if (quote.createdByRole === 'sales_team_lead') return '销售组长报价仅由销售经理或分管销售副总审批。'
    if (quote.createdByRole === 'sales_manager') return '销售经理报价仅由分管销售副总审批。'
    return '当前岗位不能审批该报价。'
  }
  private approve(quote: Quote, actor: Actor, note?: string) {
    quote.status = 'approved'; quote.approvedAt = new Date().toISOString(); quote.approvedBy = actor.displayName; quote.approvedByRole = actor.role; quote.formalNumber = `VIGOR-Q-${quote.code}-V${quote.version}`
    const opportunity = this.store.opportunities.find(item => item.id === quote.opportunityId)
    if (opportunity) opportunity.stage = 'quoted'
    quote.audit.push({ at: quote.approvedAt, action: '审批通过，生成正式报价单', by: actor.displayName, note })
  }
  private assertSales(actor: Actor) { if (!salesRoles.has(actor.role)) throw new ForbiddenException('当前岗位无销售模块权限。'); if (operationalRoles.has(actor.role) && !globalManagers.has(actor.role) && !actor.teamId) throw new ForbiddenException('当前账号尚未配置销售小组。') }
  private assertOperational(actor: Actor) { this.assertSales(actor); if (!operationalRoles.has(actor.role)) throw new ForbiddenException('财务岗位仅可处理合同用印流程。') }
  private canAccess(actor: Actor, item: TeamOwned) { return globalManagers.has(actor.role) || Boolean(actor.teamId && actor.teamId === item.teamId) }
  private teamForCreate(actor: Actor) { return actor.teamId && actor.teamName ? { teamId: actor.teamId, teamName: actor.teamName } : legacyTeam }
  private teamOf(item: TeamOwned) { return { teamId: item.teamId, teamName: item.teamName } }
  private archiveFor(contract: Contract) { let item = this.store.contractArchives.find(entry => entry.contractId === contract.id); if (!item) { item = { id: crypto.randomUUID(), contractId: contract.id, audit: [], ...this.teamOf(contract) }; this.store.contractArchives.push(item) } return item }
  private next(prefix: string) { const count = (this.store.counters[prefix] ?? 0) + 1; this.store.counters[prefix] = count; return `${prefix}-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(count).padStart(4,'0')}` }
  private async persist() { await mkdir(dirname(config.salesFile), { recursive: true }); await writeFile(config.salesFile, JSON.stringify(this.store, null, 2), { mode: 0o600 }) }

  private migrate(raw: any): SalesStore {
    const addTeam = (items: any[] = []) => items.map(item => ({ ...legacyTeam, ...item, teamId: item.teamId || legacyTeam.teamId, teamName: item.teamName || legacyTeam.teamName }))
    return { version: 4, counters: raw.counters ?? {}, clients: addTeam(raw.clients), opportunities: addTeam(raw.opportunities), quotes: addTeam(raw.quotes), contracts: addTeam(raw.contracts), payments: addTeam(raw.payments), projects: addTeam(raw.projects), sealApplications: addTeam(raw.sealApplications), contractArchives: addTeam(raw.contractArchives), teamTransfers: Array.isArray(raw.teamTransfers) ? raw.teamTransfers : [] }
  }

  private related(entity: SalesEntity, recordId: string) {
    const result = new Map<SalesEntity, Set<string>>(Array.from(entities, kind => [kind, new Set<string>()] as const))
    result.get(entity)!.add(recordId)
    const clients = result.get('clients')!, opportunities = result.get('opportunities')!, quotes = result.get('quotes')!, contracts = result.get('contracts')!
    if (entity === 'clients') clients.add(recordId)
    if (clients.size) for (const item of this.store.opportunities) if (clients.has(item.clientId)) opportunities.add(item.id)
    if (opportunities.size) for (const item of this.store.quotes) if (opportunities.has(item.opportunityId)) quotes.add(item.id)
    if (quotes.size) for (const item of this.store.contracts) if (quotes.has(item.quoteId)) contracts.add(item.id)
    if (contracts.size) {
      for (const item of this.store.payments) if (contracts.has(item.contractId)) result.get('payments')!.add(item.id)
      for (const item of this.store.projects) if (contracts.has(item.contractId)) result.get('projects')!.add(item.id)
    }
    return result
  }
}

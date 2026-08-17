import { Injectable, UnauthorizedException } from '@nestjs/common'
import crypto from 'node:crypto'
import type { Actor, Role } from './types.js'
import { config } from './config.js'

const roles: Record<Role, Pick<Actor, 'displayName' | 'organizationScope'>> = {
  general_manager: { displayName: '总经理', organizationScope: '全部经营数据' },
  sales_vp: { displayName: '销售总监', organizationScope: '全部经营数据及销售明细' },
  finance_vp: { displayName: '财务总监', organizationScope: '全部经营数据' },
  sales_manager: { displayName: '销售一组组长', organizationScope: '本销售组数据' },
  salesperson: { displayName: '陈晓', organizationScope: '本人客户与协作项目' },
  procurement_manager: { displayName: '采购一组组长', organizationScope: '本采购组数据' },
  finance_manager: { displayName: '财务经理', organizationScope: '财务数据与用印审批' },
  sales_team_lead: { displayName: '销售组长', organizationScope: '本销售组数据' },
  project_coordinator: { displayName: '项目跟进员', organizationScope: '所跟进项目与协作客户' },
  procurement_team_lead: { displayName: '采购组长', organizationScope: '本采购组数据' },
  purchaser: { displayName: '采购员', organizationScope: '本人采购任务' },
  quality_team: { displayName: '质量组', organizationScope: '质量与验收资料' },
  hr_director: { displayName: '人力总监', organizationScope: '人力行政数据' },
  admin_specialist: { displayName: '行政专员', organizationScope: '行政协同资料' },
  accountant: { displayName: '会计', organizationScope: '凭证、归档与用印执行' },
  shipping_manager: { displayName: '船务经理', organizationScope: '船务部门数据' },
  shipping_operator: { displayName: '船务操作员', organizationScope: '本人船务任务' },
  sales_support: { displayName: '销售支持', organizationScope: '技术支持、报价与研发资料' },
  market_team: { displayName: '市场专员', organizationScope: '市场推广与线索资料' },

}

@Injectable()
export class IdentityService {
  actorFromDemoRole(value: string | undefined): Actor {
    if (!config.demoMode) {
      throw new UnauthorizedException('OIDC 未配置：生产环境不接受演示身份。')
    }

    const role = value && value in roles ? value as Role : 'salesperson'
    return { id: 'employee-chen', role, ...roles[role], isAdmin: role === 'general_manager' }
  }
  verifyAppProxySecret(appId:string, supplied:string) {
    if (!config.bridgeSecret || config.bridgeSecret.length < 32) return false
    const expected=crypto.createHmac('sha256',config.bridgeSecret).update('vigor-ai-proxy:' + appId).digest('base64url')
    const a=Buffer.from(expected), b=Buffer.from(supplied)
    return a.length===b.length && crypto.timingSafeEqual(a,b)
  }

  issueBridgeToken(input: { id: string; username: string; displayName: string; role: string; isAdmin: boolean; appId: string }) {
    if (!config.bridgeSecret || config.bridgeSecret.length < 32) throw new UnauthorizedException('工作台桥接密钥未配置。')
    const now = Math.floor(Date.now()/1000), header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
    const payload=Buffer.from(JSON.stringify({iss:'vigor-workbench',aud:input.appId,iat:now,exp:now+300,sub:input.id,username:input.username,name:input.displayName,workbenchRole:input.role,isAdmin:input.isAdmin,app:input.appId})).toString('base64url')
    return { token: header+'.'+payload+'.'+crypto.createHmac('sha256',config.bridgeSecret).update(header+'.'+payload).digest('base64url'), expiresIn:300 }
  }
}

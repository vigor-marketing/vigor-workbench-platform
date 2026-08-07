import { Injectable, UnauthorizedException } from '@nestjs/common'
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
}

@Injectable()
export class IdentityService {
  actorFromDemoRole(value: string | undefined): Actor {
    if (!config.demoMode) {
      throw new UnauthorizedException('OIDC 未配置：生产环境不接受演示身份。')
    }

    const role = value && value in roles ? value as Role : 'salesperson'
    return { id: 'employee-chen', role, ...roles[role] }
  }
}

import { Module } from '@nestjs/common'
import { AppController } from './app.controller.js'
import { AppsService } from './apps.service.js'
import { IdentityService } from './identity.service.js'
import { TodosService } from './todos.service.js'
import { IntegrationsService } from './integrations.service.js'
import { AuthService } from './auth.service.js'
import { SalesService } from './sales.service.js'
import { OrgService } from './org.service.js'
import { RolesService } from './roles.service.js'

@Module({ controllers: [AppController], providers: [AppsService, IdentityService, TodosService, IntegrationsService, AuthService, SalesService, OrgService, RolesService] })
export class AppModule {}

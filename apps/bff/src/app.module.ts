import { Module } from '@nestjs/common'
import { AppController } from './app.controller.js'
import { AppsService } from './apps.service.js'
import { IdentityService } from './identity.service.js'
import { TodosService } from './todos.service.js'

@Module({ controllers: [AppController], providers: [AppsService, IdentityService, TodosService] })
export class AppModule {}

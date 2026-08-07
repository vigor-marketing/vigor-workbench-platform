import { BadRequestException, Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common'
import { AppsService } from './apps.service.js'
import { IdentityService } from './identity.service.js'
import { TodosService } from './todos.service.js'

@Controller()
export class AppController {
  constructor(private readonly identity: IdentityService, private readonly apps: AppsService, private readonly todos: TodosService) {}

  @Get('health') health() { return { status: 'ok', todoStorage: this.todos.storageMode() } }

  @Get('me') me(@Headers('x-demo-role') role?: string) { return this.identity.actorFromDemoRole(role) }

  @Get('apps') appsForActor(@Headers('x-demo-role') role?: string) {
    const actor = this.identity.actorFromDemoRole(role)
    return this.apps.list(actor.role)
  }

  @Get('todos') todosForActor(@Headers('x-demo-role') role?: string) {
    return this.todos.list(this.identity.actorFromDemoRole(role))
  }

  @Patch('todos/:id') updateTodo(@Headers('x-demo-role') role: string | undefined, @Param('id') id: string, @Body() body?: { completed?: boolean }) {
    if (typeof body?.completed !== 'boolean') throw new BadRequestException('completed 必须为布尔值。')
    return this.todos.setCompleted(this.identity.actorFromDemoRole(role), id, body.completed)
  }
}

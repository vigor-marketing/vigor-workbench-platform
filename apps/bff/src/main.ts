import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { config } from './config.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })
  app.setGlobalPrefix('api')
  app.enableCors({ origin: config.allowedOrigins, credentials: false, methods: ['GET', 'PATCH'] })
  await app.listen(config.port, '127.0.0.1')
}

void bootstrap()

import 'reflect-metadata'

import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))

  const configService = app.get(ConfigService)
  const corsOrigins = configService.get<string[]>('app.corsOrigins', ['http://localhost:3000'])
  const port = configService.get<number>('app.port', 3001)

  app.use(helmet())
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  })
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(app.get(GlobalExceptionFilter))

  await app.listen(port)
}

bootstrap()

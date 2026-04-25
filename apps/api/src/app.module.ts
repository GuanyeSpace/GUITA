import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'

import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe'
import configuration, { validateEnvironment } from './config/configuration'
import { HealthController } from './modules/health/health.controller'
import { PrismaModule } from './modules/prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              },
        redact: ['req.headers.authorization'],
      },
    }),
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [GlobalExceptionFilter, ZodValidationPipe],
})
export class AppModule {}

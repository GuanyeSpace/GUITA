import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'

export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'GUITA-ADMIN-001',
} as const

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>()
    const configuredToken = this.configService.get<string>('admin.token')
    const requestToken = request.headers['x-admin-token']
    const token = Array.isArray(requestToken) ? requestToken[0] : requestToken

    if (!configuredToken || token !== configuredToken) {
      throw new UnauthorizedException({
        errorCode: ADMIN_ERROR_CODES.UNAUTHORIZED,
        message: 'Admin token is required',
      })
    }

    return true
  }
}

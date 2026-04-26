import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

import { AuthTokenService } from '../auth-token.service'
import { AUTH_ERROR_CODES } from '../auth.constants'

export type OptionallyAuthenticatedRequest = Request & {
  user?: {
    guitaId: string
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthTokenService) private readonly authTokenService: AuthTokenService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OptionallyAuthenticatedRequest>()
    const authorization = request.headers.authorization

    if (!authorization) {
      return true
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN,
        message: 'Authorization bearer token is invalid',
      })
    }

    const token = authorization.slice('Bearer '.length).trim()

    if (!token) {
      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN,
        message: 'Authorization bearer token is invalid',
      })
    }

    const { guitaId } = await this.authTokenService.verifyAccessToken(token)
    request.user = { guitaId }

    return true
  }
}

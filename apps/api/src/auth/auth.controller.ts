import {
  LoginRequest,
  LoginRequestSchema,
  LoginResponse,
  LogoutQuery,
  LogoutQuerySchema,
  LogoutRequest,
  LogoutRequestSchema,
  MeResponse,
  RefreshRequest,
  RefreshRequestSchema,
  RefreshResponse,
} from '@guita/shared-schema'
import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'

import { AuthService } from './auth.service'
import { AuthenticatedRequest, JwtAuthGuard } from './guards/jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'

@Controller('api/v1')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('auth/login')
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) payload: LoginRequest,
    @Req() request: Request,
  ): Promise<LoginResponse> {
    return this.authService.login(payload, this.getRequestContext(request))
  }

  @Post('auth/refresh')
  async refresh(
    @Body(new ZodValidationPipe(RefreshRequestSchema)) payload: RefreshRequest,
    @Req() request: Request,
  ): Promise<RefreshResponse> {
    return this.authService.refresh(payload.refreshToken, this.getRequestContext(request))
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(LogoutRequestSchema)) body: LogoutRequest,
    @Query(new ZodValidationPipe(LogoutQuerySchema)) query: LogoutQuery,
  ) {
    await this.authService.logout(request.user.guitaId, body, query)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest): Promise<MeResponse> {
    return this.authService.getMe(request.user.guitaId)
  }

  private getRequestContext(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for']
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim()

    return {
      ip: forwardedIp ?? request.ip ?? request.socket.remoteAddress ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    }
  }
}

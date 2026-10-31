import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_API_KEY') ?? '';
    const actual = String(context.switchToHttp().getRequest<Request>().headers['x-admin-api-key'] ?? '');
    const expectedBytes = Buffer.from(expected); const actualBytes = Buffer.from(actual);
    if (expectedBytes.length < 32 || actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
      throw new UnauthorizedException('A configured admin key is required');
    }
    return true;
  }
}

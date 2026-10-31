import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';
import { PgService } from '../database/pg.service';
import { envelope } from '../../common/api-envelope';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: PgService, private readonly cache: CacheService) {}
  @Get('live') @ApiOperation({ summary: 'Process liveness' })
  live(): object { return envelope({ status: 'ok' }); }
  @Get('ready') @ApiOperation({ summary: 'PostgreSQL and Redis readiness' })
  async ready(): Promise<object> {
    const checks = await Promise.allSettled([this.db.ping(), this.cache.ping()]);
    const data = { status: checks.every((check) => check.status === 'fulfilled') ? 'ready' : 'degraded', postgres: checks[0].status === 'fulfilled' ? 'ok' : 'unavailable', redis: checks[1].status === 'fulfilled' ? 'ok' : 'unavailable' };
    if (data.status !== 'ready') throw new ServiceUnavailableException(data);
    return envelope(data);
  }
}

import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { classifyFreshness, envelope } from '../../common/api-envelope';
import { MarketService } from './market.service';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService, private readonly config: ConfigService) {}
  @Get('listings') @ApiOperation({ summary: 'Get the latest stored asset market snapshots with pagination' }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'offset', required: false }) @ApiQuery({ name: 'search', required: false })
  async listings(@Req() req: Request, @Query('limit') rawLimit?: string, @Query('offset') rawOffset?: string, @Query('search') search?: string): Promise<object> {
    const limit = rawLimit === undefined ? 50 : Number(rawLimit); const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 250 || !Number.isInteger(offset) || offset < 0) throw new BadRequestException('limit must be 1-250 and offset must be non-negative');
    const result = await this.market.listings(limit, offset, search);
    const asOf = result.rows.find((row) => row.source_as_of)?.source_as_of as string | undefined;
    return envelope({ items: result.rows, pagination: { limit, offset, total: result.total } }, { requestId: req.headers['x-request-id'] as string | undefined, source: 'coingecko', asOf: asOf ?? null, freshness: classifyFreshness(asOf, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 3600) });
  }
  @Get('global') @ApiOperation({ summary: 'Get latest stored global market metrics' }) @ApiQuery({ name: 'convert', required: false, example: 'USD' })
  async global(@Req() req: Request, @Query('convert') currency = 'USD'): Promise<object> {
    if (!/^[A-Z]{3,8}$/i.test(currency)) throw new BadRequestException('convert must be a three to eight character currency code');
    const data = await this.market.global(currency);
    return envelope(data, { requestId: req.headers['x-request-id'] as string | undefined, source: 'coingecko', asOf: data?.source_as_of as string | null, freshness: classifyFreshness(data?.source_as_of as string | null, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 3600) });
  }
}

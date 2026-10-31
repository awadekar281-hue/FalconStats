import { BadRequestException, Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { envelope, classifyFreshness } from '../../common/api-envelope';
import { AssetRepository } from './asset.repository';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetRepository, private readonly config: ConfigService) {}
  @Get() @ApiOperation({ summary: 'List canonical assets with their latest stored market snapshot' }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'offset', required: false }) @ApiQuery({ name: 'search', required: false })
  async list(@Req() req: Request, @Query('limit') rawLimit?: string, @Query('offset') rawOffset?: string, @Query('search') search?: string): Promise<object> {
    const limit = rawLimit === undefined ? 50 : Number(rawLimit); const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 250 || !Number.isInteger(offset) || offset < 0) throw new BadRequestException('limit must be 1-250 and offset must be non-negative');
    const result = await this.assets.list({ limit, offset, search });
    const asOf = result.rows.find((row) => row.source_as_of)?.source_as_of as string | undefined;
    return envelope({ items: result.rows, pagination: { limit, offset, total: result.total } }, { requestId: req.headers['x-request-id'] as string | undefined, source: 'coinmarketcap', asOf: asOf ?? null, freshness: classifyFreshness(asOf, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 900) });
  }
  @Get(':assetId') @ApiOperation({ summary: 'Get an asset by FalconStats UUID' })
  async get(@Req() req: Request, @Param('assetId') id: string): Promise<object> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('assetId must be a UUID');
    const asset = await this.assets.getById(id); if (!asset) throw new NotFoundException('Asset not found');
    return envelope(asset, { requestId: String(req.headers['x-request-id'] ?? ''), source: 'coinmarketcap', asOf: asset.source_as_of as string | null, freshness: classifyFreshness(asset.source_as_of as string | null, this.config.get<number>('DATA_STALE_AFTER_SECONDS') ?? 900) });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PgService } from '../database/pg.service';

export interface ProviderEvent {
  endpoint: string; startedAt: Date; receivedAt: Date; httpStatus: number; durationMs: number;
  cmcErrorCode: number | null; cmcErrorMessage: string | null; creditCount: number;
  rateLimitLimit: number | null; rateLimitRemaining: number | null; rateLimitResetAt: Date | null;
  accessMode: 'keyed' | 'keyless'; succeeded: boolean;
}

@Injectable()
export class CmcTelemetryService {
  private readonly logger = new Logger(CmcTelemetryService.name);
  constructor(private readonly db: PgService) {}
  async recordRequest(event: ProviderEvent): Promise<void> {
    try {
      await this.db.query(`INSERT INTO provider_request_events
        (provider_code, endpoint, request_started_at, response_received_at, http_status, duration_ms, cmc_error_code, cmc_error_message, credit_count, rate_limit_limit, rate_limit_remaining, rate_limit_reset_at, access_mode, succeeded)
        VALUES ('coinmarketcap', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [event.endpoint, event.startedAt, event.receivedAt, event.httpStatus, event.durationMs, event.cmcErrorCode, event.cmcErrorMessage, event.creditCount, event.rateLimitLimit, event.rateLimitRemaining, event.rateLimitResetAt, event.accessMode, event.succeeded]);
    } catch (error) { this.logger.warn(`Unable to persist CoinMarketCap telemetry: ${(error as Error).message}`); }
  }
  async recordKeyInfo(value: { plan: Record<string, unknown>; usage: Record<string, unknown> }): Promise<void> {
    await this.db.query(`INSERT INTO provider_usage_snapshots (provider_code, plan, usage) VALUES ('coinmarketcap', $1::jsonb, $2::jsonb)`, [JSON.stringify(value.plan), JSON.stringify(value.usage)]);
  }
  async status(): Promise<Record<string, unknown>> {
    const result = await this.db.query(`SELECT
      count(*) FILTER (WHERE request_started_at >= now() - interval '24 hours')::int AS requests_24h,
      coalesce(sum(credit_count) FILTER (WHERE request_started_at >= now() - interval '24 hours'), 0)::int AS credits_24h,
      count(*) FILTER (WHERE NOT succeeded AND request_started_at >= now() - interval '24 hours')::int AS failures_24h,
      max(request_started_at) AS last_attempt_at,
      max(response_received_at) FILTER (WHERE succeeded) AS last_success_at,
      (array_agg(access_mode ORDER BY request_started_at DESC))[1] AS access_mode,
      (array_agg(http_status ORDER BY request_started_at DESC))[1] AS last_http_status,
      (array_agg(cmc_error_code ORDER BY request_started_at DESC))[1] AS last_error_code
      FROM provider_request_events WHERE provider_code = 'coinmarketcap'`);
    const usage = await this.db.query(`SELECT plan, usage, captured_at FROM provider_usage_snapshots WHERE provider_code = 'coinmarketcap' ORDER BY captured_at DESC LIMIT 1`);
    return { ...(result.rows[0] ?? {}), keyInfo: usage.rows[0] ?? null };
  }
  async quota(accessMode: 'keyed' | 'keyless'): Promise<Record<string, unknown>> {
    const result = await this.db.query(`SELECT endpoint,
      count(*)::int AS requests_24h,
      coalesce(sum(credit_count), 0)::int AS credits_24h,
      count(*) FILTER (WHERE NOT succeeded)::int AS failures_24h,
      max(response_received_at) AS last_response_at
      FROM provider_request_events WHERE provider_code = 'coinmarketcap' AND request_started_at >= now() - interval '24 hours'
      GROUP BY endpoint ORDER BY endpoint`);
    const usage = await this.db.query(`SELECT plan, usage, captured_at FROM provider_usage_snapshots WHERE provider_code = 'coinmarketcap' ORDER BY captured_at DESC LIMIT 1`);
    return { accessMode, endpoints: result.rows, keyInfo: usage.rows[0] ?? null };
  }
}

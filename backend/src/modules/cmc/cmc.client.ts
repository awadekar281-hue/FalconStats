import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse as parseLossless } from 'lossless-json';
import { CmcTelemetryService } from './cmc-telemetry.service';
import type { CmcEnvelope, CmcKeyInfo, CmcListing } from './cmc.types';
import { assertCmcSuccess, normalizeKeyInfo } from './cmc-normalizer';

@Injectable()
export class CmcClient {
  private readonly logger = new Logger(CmcClient.name);
  private readonly baseUrl: string;
  private readonly key: string;
  private readonly publicMode: boolean;
  private readonly timeoutMs: number;
  constructor(config: ConfigService, private readonly telemetry: CmcTelemetryService) {
    this.baseUrl = config.getOrThrow<string>('CMC_BASE_URL');
    this.key = config.get<string>('CMC_PRO_API_KEY') ?? '';
    this.publicMode = !this.key;
    this.timeoutMs = config.get<number>('CMC_HTTP_TIMEOUT_MS') ?? 10000;
  }
  get accessMode(): 'keyed' | 'keyless' { return this.publicMode ? 'keyless' : 'keyed'; }
  async getListings(start: number, limit: number, currency: string): Promise<CmcEnvelope<CmcListing[]>> {
    return this.request<CmcListing[]>('/v3/cryptocurrency/listings/latest', { start, limit, convert: currency });
  }
  async getGlobalMetrics(currency: string): Promise<CmcEnvelope<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>('/v1/global-metrics/quotes/latest', { convert: currency });
  }
  async getKeyInfo(): Promise<CmcKeyInfo> {
    if (this.publicMode) throw new ServiceUnavailableException('CoinMarketCap API key is not configured; subscription usage is unavailable in keyless mode');
    const response = await this.request<CmcKeyInfo>('/v1/key/info', {});
    const info = normalizeKeyInfo(response);
    await this.telemetry.recordKeyInfo({ plan: (info.plan ?? {}) as Record<string, unknown>, usage: (info.usage ?? {}) as Record<string, unknown> });
    return info;
  }
  private async request<T>(path: string, params: Record<string, string | number>): Promise<CmcEnvelope<T>> {
    const startedAt = new Date(); const startedMs = Date.now();
    const prefix = this.publicMode ? '/public-api' : '';
    const url = new URL(`${prefix}${path}`, this.baseUrl);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!this.publicMode) headers['X-CMC_PRO_API_KEY'] = this.key;
    let response: Response | undefined; let parsed: CmcEnvelope<T> | undefined; let telemetryWritten = false;
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
      parsed = parseLossless(await response.text()) as CmcEnvelope<T>;
      const statusCode = Number(parsed?.status?.error_code ?? 0);
      const succeeded = response.ok && statusCode === 0;
      await this.telemetry.recordRequest({
        endpoint: path, startedAt, receivedAt: new Date(), httpStatus: response.status, durationMs: Date.now() - startedMs,
        cmcErrorCode: statusCode || null, cmcErrorMessage: parsed?.status?.error_message ?? null,
        creditCount: Number(parsed?.status?.credit_count ?? 0),
        rateLimitLimit: this.headerNumber(response.headers, 'x-ratelimit-limit'),
        rateLimitRemaining: this.headerNumber(response.headers, 'x-ratelimit-remaining'),
        rateLimitResetAt: this.headerDate(response.headers, 'x-ratelimit-reset'), accessMode: this.accessMode, succeeded,
      });
      telemetryWritten = true;
      if (!response.ok || statusCode !== 0) throw new Error(`CMC HTTP ${response.status}; error ${statusCode}: ${parsed?.status?.error_message ?? response.statusText}`);
      return parsed;
    } catch (error) {
      if (!telemetryWritten) await this.telemetry.recordRequest({ endpoint: path, startedAt, receivedAt: new Date(), httpStatus: response?.status ?? 0, durationMs: Date.now() - startedMs, cmcErrorCode: Number(parsed?.status?.error_code ?? 0) || null, cmcErrorMessage: parsed?.status?.error_message ?? (error as Error).message, creditCount: Number(parsed?.status?.credit_count ?? 0), rateLimitLimit: response ? this.headerNumber(response.headers, 'x-ratelimit-limit') : null, rateLimitRemaining: response ? this.headerNumber(response.headers, 'x-ratelimit-remaining') : null, rateLimitResetAt: response ? this.headerDate(response.headers, 'x-ratelimit-reset') : null, accessMode: this.accessMode, succeeded: false });
      this.logger.warn(`CoinMarketCap request failed (${path}): ${(error as Error).message}`);
      throw new ServiceUnavailableException('CoinMarketCap request failed; see provider health telemetry');
    }
  }
  private headerNumber(headers: Headers, name: string): number | null { const value = headers.get(name); const parsed = value === null ? NaN : Number(value); return Number.isFinite(parsed) ? parsed : null; }
  private headerDate(headers: Headers, name: string): Date | null { const value = headers.get(name); if (!value) return null; const number = Number(value); const date = Number.isFinite(number) ? new Date(number * 1000) : new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
}

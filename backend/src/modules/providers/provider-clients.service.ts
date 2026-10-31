import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse as parseLossless } from 'lossless-json';
import { PgService } from '../database/pg.service';

@Injectable()
export class ProviderClients {
  private readonly logger = new Logger(ProviderClients.name);
  constructor(private readonly config: ConfigService, private readonly db: PgService) {}

  async request<T>(provider: string, base: string, path: string, params: Record<string, string | number> = {}, headers: Record<string, string> = {}): Promise<T> {
    const started = new Date();
    if (provider === 'coingecko') {
      const budget = this.config.get<number>('COINGECKO_MONTHLY_CALL_BUDGET') ?? 9000;
      const usage = await this.db.query<{ month_count: string; minute_count:string }>(`SELECT count(*) FILTER(WHERE request_started_at >= date_trunc('month',now()))::text AS month_count,count(*) FILTER(WHERE request_started_at>=now()-interval '1 minute')::text AS minute_count FROM provider_request_events WHERE provider_code='coingecko'`);
      const used=Number(usage.rows[0]?.month_count??0);const optionalHistory=path.includes('/market_chart');const monthlyLimit=optionalHistory?budget-1000:budget;
      if (used >= monthlyLimit) throw new Error(optionalHistory?'CoinGecko optional-history reserve reached; preserving monthly quota for scheduled global metrics and listings.':`CoinGecko monthly safety budget exhausted (${budget} calls). Preserving the latest stored data.`);
      if (Number(usage.rows[0]?.minute_count ?? 0) >= 90) throw new Error('CoinGecko local safety rate limit reached (90 calls/min); wait before requesting more data.');
    }
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    let response: Response | undefined;
    let errorText: string | null = null;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(this.config.get<number>('PROVIDER_HTTP_TIMEOUT_MS') ?? 15000), cache: 'no-store' });
      const raw = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${raw.slice(0, 240)}`);
      const data = parseLossless(raw) as T;
      if (provider === 'bybit' && typeof data === 'object' && data !== null && 'retCode' in data && Number((data as {retCode: unknown}).retCode) !== 0) throw new Error(`Bybit retCode ${(data as {retCode: unknown}).retCode}`);
      await this.record(provider, path, started, response, true, null);
      return data;
    } catch (error) {
      errorText = (error as Error).message;
      await this.record(provider, path, started, response, false, errorText);
      this.logger.warn(`${provider} ${path} failed: ${errorText}`);
      throw error;
    }
  }

  private async record(provider: string, endpoint: string, started: Date, response: Response | undefined, succeeded: boolean, message: string | null): Promise<void> {
    try {
      await this.db.query(`INSERT INTO provider_request_events(provider_code,endpoint,request_started_at,response_received_at,http_status,duration_ms,provider_error_code,provider_error_message,credit_count,access_mode,succeeded)
        VALUES($1,$2,$3,now(),$4,$5,NULL,$6,0,'public',$7)`,
      [provider,endpoint,started,response?.status ?? null,Date.now()-started.getTime(),message,succeeded]);
    } catch { /* Provider telemetry cannot turn a successful upstream response into a failure. */ }
  }
}

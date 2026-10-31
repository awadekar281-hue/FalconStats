import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

@Injectable()
export class PgService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgService.name);
  readonly pool: Pool;
  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL'), max: 12, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    this.pool.on('error', (error) => this.logger.error(`PostgreSQL pool error: ${error.message}`));
  }
  async onModuleInit(): Promise<void> { await this.pool.query('SELECT 1'); }
  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
  query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> { return this.pool.query<T>(text, values); }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async ping(): Promise<void> { await this.pool.query('SELECT 1'); }
}

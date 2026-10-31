import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function main(): Promise<void> {
  const migrationsDir = join(__dirname, '..', 'sql', 'migrations');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to apply migrations');
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const appliedResult = await pool.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name');
    const applied = new Set(appliedResult.rows.map((row) => row.name));
    const files = (await readdir(migrationsDir)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
    if (process.argv.includes('--status')) {
      for (const name of files) console.log(`${applied.has(name) ? 'applied' : 'pending'} ${name}`);
    } else {
      for (const name of files) {
        if (applied.has(name)) continue;
        const sql = await readFile(join(migrationsDir, name), 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
          await client.query('COMMIT');
          console.log(`applied ${name}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      }
    }
  } finally { await pool.end(); }
}
void main();

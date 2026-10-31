import type { ConnectionOptions } from 'bullmq';

export function redisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const dbPath = parsed.pathname.replace(/^\//, '');
  const options: ConnectionOptions = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: dbPath ? Number(dbPath) : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
  if (parsed.protocol === 'rediss:') options.tls = {};
  return options;
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('server-only cron secret configuration', () => {
  const route = readFileSync(join(process.cwd(), 'src/app/api/cron/content-strategy/route.ts'), 'utf8');
  const rootEnv = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
  const srcEnv = readFileSync(join(process.cwd(), 'src/.env.template'), 'utf8');

  it('reads the cron bearer token from a server-only environment variable', () => {
    expect(route).toContain('process.env.CRON_SECRET');
    expect(route).not.toContain('process.env.NEXT_PUBLIC_CRON_SECRET');
  });

  it('does not document a browser-exposed cron secret', () => {
    expect(rootEnv).not.toContain('NEXT_PUBLIC_CRON_SECRET');
    expect(srcEnv).not.toContain('NEXT_PUBLIC_CRON_SECRET');
  });
});

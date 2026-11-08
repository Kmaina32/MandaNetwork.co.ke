import { existsSync } from 'node:fs';
import { join } from 'node:path';

const routes = [
  'src/app/login/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/courses/page.tsx',
  'src/app/courses/[id]/page.tsx',
  'src/app/courses/[id]/learn/page.tsx',
  'src/app/help/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/admin/help/page.tsx',
  'src/app/auth/confirm/page.tsx',
  'src/app/auth/reset-password/page.tsx',
];

describe('core Varban Academy route regression checks', () => {
  it.each(routes)('keeps the %s route present', (route) => {
    expect(existsSync(join(process.cwd(), route))).toBe(true);
  });
});

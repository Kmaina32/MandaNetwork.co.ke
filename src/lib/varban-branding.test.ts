import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const serverData = read('src/lib/firebase-server.ts');
const browserData = read('src/lib/firebase-service.ts');
const layout = read('src/app/layout.tsx');
const robots = read('src/app/robots.ts');
const home = read('src/app/page.tsx');
const programs = read('src/app/programs/page.tsx');
const bootcamps = read('src/app/bootcamps/page.tsx');
const login = read('src/app/login/page.tsx');
const signup = read('src/app/signup/page.tsx');
const organizationLogin = read('src/app/organization/login/page.tsx');
const organizationSignup = read('src/app/organization/signup/page.tsx');

describe('Varban public branding and hero image regressions', () => {
  it('uses Varban Academy in the primary page metadata', () => {
    expect(layout).toContain('Varban Academy | Empowering Digital Africa');
    expect(layout).toContain("siteName: 'Varban Academy'");
  });

  it('uses the deployment domain for robots and sitemap metadata', () => {
    expect(layout).toContain('process.env.NEXT_PUBLIC_SITE_URL');
    expect(robots).toContain('process.env.NEXT_PUBLIC_SITE_URL');
    expect(robots).toContain('/sitemap.xml');
  });

  it('provides curated non-placeholder default hero photography', () => {
    const defaults = serverData.match(/const defaultHero: HeroData = \{([\s\S]*?)\n\};/)?.[1] || '';
    expect(defaults).toContain('https://images.unsplash.com/');
    expect(defaults).not.toMatch(/picsum\.photos|placehold\.co/i);

    const imageKeys = [
      'imageUrl', 'loginImageUrl', 'signupImageUrl', 'programsImageUrl',
      'bootcampsImageUrl', 'hackathonsImageUrl', 'portfoliosImageUrl',
      'orgHeroImageUrl', 'orgLoginImageUrl', 'orgSignupImageUrl',
    ];
    imageKeys.forEach((key) => expect(defaults).toContain(key + ':'));
  });

  it('recognizes saved Picsum and placehold URLs and restores the curated defaults', () => {
    const fallbackPattern = '/picsum\\.photos|placehold\\.co/i';
    expect(serverData).toContain(fallbackPattern);
    expect(browserData).toContain(fallbackPattern);
  });

  it.each([
    ['homepage', home, 'getHeroData', 'settings.imageUrl'],
    ['programs', programs, 'getHeroData', 'heroData?.programsImageUrl'],
    ['bootcamps', bootcamps, 'getHeroData', 'heroData?.bootcampsImageUrl'],
    ['login', login, 'getHeroData', 'imageUrl'],
    ['signup', signup, 'getHeroData', 'signupImageUrl'],
    ['organization login', organizationLogin, 'getHeroData', 'orgLoginImageUrl'],
    ['organization signup', organizationSignup, 'getHeroData', 'orgSignupImageUrl'],
  ])('%s reads its hero image from the shared settings service', (_page, source, loader, imageKey) => {
    expect(source).toContain(loader);
    expect(source).toContain(imageKey);
  });
});

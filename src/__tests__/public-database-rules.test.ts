import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type RuleNode = Record<string, any>;

function loadRules(): RuleNode {
  return JSON.parse(readFileSync(join(process.cwd(), 'src/database.rules.json'), 'utf8'));
}

describe('public database access rules', () => {
  const rules = loadRules().rules;

  it('keeps bootcamp catalogue reads public without nesting learner registrations', () => {
    expect(rules.bootcamps['.read']).toBe(true);
    expect(rules.bootcamps.$bootcampId).toBeUndefined();
  });

  it('restricts bootcamp registration reads to the learner or an active administrator', () => {
    const participantRules = rules.bootcampParticipants.$bootcampId.$userId;
    expect(participantRules['.read']).toContain('auth.uid === $userId');
    expect(participantRules['.read']).toContain("child('isAdmin')");
    expect(participantRules['.read']).toContain("child('adminExpiresAt')");
    expect(participantRules['.write']).toBe(false);
  });

  it('keeps contact messages server-write-only', () => {
    expect(rules.contactMessages['.write']).toBe(false);
  });

  it('keeps the rule document valid JSON', () => {
    expect(() => JSON.parse(readFileSync(join(process.cwd(), 'src/database.rules.json'), 'utf8'))).not.toThrow();
  });
});

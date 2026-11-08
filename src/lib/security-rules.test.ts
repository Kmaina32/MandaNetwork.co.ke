import databaseRules from '@/database.rules.json';

const rules = databaseRules.rules as Record<string, any>;

describe('Firebase Realtime Database security rules', () => {
  it('does not grant blanket access to unlisted database paths', () => {
    expect(rules).not.toHaveProperty('$other');
  });

  it('does not expose private user records through public portfolio visibility', () => {
    expect(rules.users.$userId['.read']).not.toContain("portfolio/public");
    expect(rules.users.$userId['.read']).toContain("auth.uid === $userId");
    expect(rules.publicProfiles['.read']).toBe(true);
  });

  it('prevents users from editing their own privileged role fields', () => {
    const userRules = rules.users.$userId;
    expect(userRules['.validate']).toContain("newData.child('isAdmin').val() === data.child('isAdmin').val()");
    expect(userRules['.validate']).toContain("newData.child('isSuperAdmin').val() === data.child('isSuperAdmin').val()");
  });

  it('restricts leaderboard writes to administrators', () => {
    expect(rules.leaderboard.$userId['.write']).toContain("child('isAdmin')");
    expect(rules.leaderboard.$userId['.write']).not.toContain("auth.uid === $userId");
  });

  it('requires ownership for user-generated submissions', () => {
    expect(rules.submissions.$submissionId['.write']).toContain("data.child('userId').val() === auth.uid");
    expect(rules.formSubmissions.$submissionId['.write']).toContain("!data.exists()");
  });

  it('does not expose payment transaction records to browser clients', () => {
    expect(rules).not.toHaveProperty('mpesaTransactions');
  });
});

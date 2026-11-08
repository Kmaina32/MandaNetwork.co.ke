import databaseRules from '@/database.rules.json';

const rules = databaseRules.rules as Record<string, any>;

describe('Firebase Realtime Database security rules', () => {
  it('does not grant blanket access to unlisted database paths', () => {
    expect(rules).not.toHaveProperty('$other');
  });

  it('does not expose private user records through public portfolio visibility', () => {
    expect(rules.users.$userId['.read']).not.toContain("portfolio/public");
    expect(rules.users.$userId['.read']).toContain("auth.uid === $userId");
    expect(rules.users.$userId['.read']).toContain("organizationId').val() === data.child('organizationId').val()");
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
  it('limits notifications to their recipient or an active admin', () => {
    const notificationRules = rules.notifications;
    expect(notificationRules['.read']).toContain("query.orderByChild === 'userId'");
    expect(notificationRules['.read']).toContain("query.equalTo === auth.uid");
    expect(notificationRules['.read']).toContain("query.orderByChild === 'cohort'");
    expect(notificationRules['.indexOn']).toContain('cohort');
    expect(notificationRules.$notificationId['.read']).toContain("data.child('userId').val() === auth.uid");
    expect(notificationRules['.indexOn']).toContain('userId');
  });

  it('does not expose invitations publicly and scopes reads to recipients or their organization', () => {
    const invitationRules = rules.invitations;
    expect(invitationRules['.read']).toBe(false);
    expect(invitationRules.$invitationId['.read']).toContain("data.child('userId').val() === auth.uid");
    expect(invitationRules.$invitationId['.read']).toContain("data.child('organizationId').val()");
  });

  it('limits organization reads to admins, owners, and members', () => {
    expect(rules.organizations['.read']).toContain("query.orderByChild === 'ownerId'");
    expect(rules.organizations['.read']).toContain("query.equalTo === auth.uid");
    expect(rules.organizations.$orgId['.read']).toContain("data.child('ownerId').val() === auth.uid");
    expect(rules.organizations.$orgId['.read']).toContain("child('organizationId').val() === $orgId");
  });

  it('publishes minimal public certificate records and restricts writes to admins', () => {
    expect(rules.publicCertificates['.read']).toBe(true);
    expect(rules.publicCertificates.$certificateId['.write']).toContain("child('isAdmin')");
    expect(rules.publicCertificates.$certificateId['.validate']).toContain("newData.child('certificateId').val() === $certificateId");
  });

});

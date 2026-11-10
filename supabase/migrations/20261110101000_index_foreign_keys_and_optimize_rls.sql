-- Cover every foreign key identified by the Supabase Performance Advisor.
create index if not exists idx_advertisements_created_by_fk on public.advertisements (created_by);
create index if not exists idx_app_settings_updated_by_fk on public.app_settings (updated_by);
create index if not exists idx_bootcamp_registrations_user_id_fk on public.bootcamp_registrations (user_id);
create index if not exists idx_bundles_created_by_fk on public.bundles (created_by);
create index if not exists idx_certificate_records_user_id_fk on public.certificate_records (user_id);
create index if not exists idx_conversation_messages_conversation_id_fk on public.conversation_messages (conversation_id);
create index if not exists idx_conversation_messages_user_id_fk on public.conversation_messages (user_id);
create index if not exists idx_conversations_user_id_fk on public.conversations (user_id);
create index if not exists idx_course_feedback_course_id_fk on public.course_feedback (course_id);
create index if not exists idx_course_feedback_user_id_fk on public.course_feedback (user_id);
create index if not exists idx_course_progress_course_id_fk on public.course_progress (course_id);
create index if not exists idx_discussion_replies_thread_id_fk on public.discussion_replies (thread_id);
create index if not exists idx_discussion_replies_user_id_fk on public.discussion_replies (user_id);
create index if not exists idx_discussion_threads_course_id_fk on public.discussion_threads (course_id);
create index if not exists idx_discussion_threads_user_id_fk on public.discussion_threads (user_id);
create index if not exists idx_documents_user_id_fk on public.documents (user_id);
create index if not exists idx_form_submissions_form_id_fk on public.form_submissions (form_id);
create index if not exists idx_form_submissions_user_id_fk on public.form_submissions (user_id);
create index if not exists idx_forms_created_by_fk on public.forms (created_by);
create index if not exists idx_hackathon_participants_user_id_fk on public.hackathon_participants (user_id);
create index if not exists idx_hackathon_submissions_hackathon_id_fk on public.hackathon_submissions (hackathon_id);
create index if not exists idx_hackathons_created_by_fk on public.hackathons (created_by);
create index if not exists idx_learning_goals_user_id_fk on public.learning_goals (user_id);
create index if not exists idx_live_messages_user_id_fk on public.live_messages (user_id);
create index if not exists idx_live_reactions_user_id_fk on public.live_reactions (user_id);
create index if not exists idx_live_sessions_host_id_fk on public.live_sessions (host_id);
create index if not exists idx_live_signals_user_id_fk on public.live_signals (user_id);
create index if not exists idx_organization_invitations_invited_by_fk on public.organization_invitations (invited_by);
create index if not exists idx_organization_invitations_invited_user_id_fk on public.organization_invitations (invited_user_id);
create index if not exists idx_organization_members_user_id_fk on public.organization_members (user_id);
create index if not exists idx_payment_transactions_user_id_fk on public.payment_transactions (user_id);
create index if not exists idx_permission_requests_user_id_fk on public.permission_requests (user_id);
create index if not exists idx_pricing_plans_created_by_fk on public.pricing_plans (created_by);
create index if not exists idx_programs_created_by_fk on public.programs (created_by);
create index if not exists idx_referrals_affiliate_id_fk on public.referrals (affiliate_id);
create index if not exists idx_referrals_referred_user_id_fk on public.referrals (referred_user_id);
create index if not exists idx_user_notes_course_id_fk on public.user_notes (course_id);
create index if not exists idx_user_roles_granted_by_fk on public.user_roles (granted_by);

-- Cache request-scoped auth helpers once per statement in RLS predicates.
-- Preserve each policy's roles, command, permissive/restrictive mode and checks.
do $$
declare
  policy_row record;
  using_expr text;
  check_expr text;
  role_list text;
  statement text;
begin
  for policy_row in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(qual, '') like '%auth.jwt()%'
        or coalesce(with_check, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.jwt()%'
      )
  loop
    using_expr := replace(replace(policy_row.qual, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())');
    check_expr := replace(replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())');
    select string_agg(quote_ident(role_name), ', ')
      into role_list
      from unnest(policy_row.roles) as role_name;

    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    statement := format(
      'create policy %I on %I.%I as %s for %s to %s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      lower(policy_row.permissive),
      policy_row.cmd,
      role_list
    );
    if using_expr is not null then
      statement := statement || format(' using (%s)', using_expr);
    end if;
    if check_expr is not null then
      statement := statement || format(' with check (%s)', check_expr);
    end if;
    execute statement;
  end loop;
end;
$$;

-- Keep submission authorization consistent with the live database role table.
drop policy if exists submissions_admin_update on public.submissions;
create policy submissions_admin_update on public.submissions
for update to authenticated
using (public.has_role((select auth.uid()), array['admin','super_admin']))
with check (public.has_role((select auth.uid()), array['admin','super_admin']));

drop policy if exists submissions_owner_select on public.submissions;
create policy submissions_owner_select on public.submissions
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), array['admin','super_admin'])
);

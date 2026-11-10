alter table public.conversations add column if not exists participant_ids uuid[] not null default '{}';
drop policy if exists conversations_owner_all on public.conversations;
create policy conversations_participant_all on public.conversations for all to authenticated
using (auth.uid()=any(participant_ids) or user_id=auth.uid())
with check (auth.uid()=any(participant_ids) or user_id=auth.uid());
drop policy if exists conversation_messages_owner_all on public.conversation_messages;
create policy conversation_messages_participant_all on public.conversation_messages for all to authenticated
using (user_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (auth.uid()=any(c.participant_ids) or c.user_id=auth.uid())))
with check (user_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (auth.uid()=any(c.participant_ids) or c.user_id=auth.uid())));
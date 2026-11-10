-- Learners may self-enrol only in published, genuinely free courses.
-- Paid-course access is granted exclusively by verified server-side payment fulfillment.
drop policy if exists enrollments_owner_insert on public.enrollments;
create policy enrollments_owner_insert
on public.enrollments
for insert
to authenticated
with check (
  public.has_role((select auth.uid()), array['admin','super_admin'])
  or (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.courses as course
      where course.id = enrollments.course_id
        and course.is_published = true
        and course.price = 0
    )
  )
);

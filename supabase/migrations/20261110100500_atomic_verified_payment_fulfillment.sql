-- Atomically mark a provider-verified payment successful and grant course access.
-- The function is invoker-rights and callable only by the server service role.
create or replace function public.fulfill_verified_course_payment(
  p_reference text,
  p_provider text,
  p_confirmed_amount numeric,
  p_confirmed_currency text,
  p_customer_email text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payment_transactions%rowtype;
  v_course public.courses%rowtype;
  v_now timestamptz := now();
  v_email text;
begin
  if p_reference is null or p_provider not in ('paystack', 'mpesa') then
    raise exception 'Invalid verified payment reference or provider.';
  end if;

  select * into v_payment
  from public.payment_transactions
  where reference = p_reference
  for update;

  if not found then
    raise exception 'Payment reference not found.';
  end if;

  if v_payment.provider <> p_provider
    or v_payment.item_type <> 'course'
    or v_payment.currency <> p_confirmed_currency
    or v_payment.amount_kes <> p_confirmed_amount then
    raise exception 'Verified payment details do not match the stored transaction.';
  end if;

  v_email := lower(coalesce(v_payment.provider_payload->>'email', ''));
  if p_customer_email is not null and v_email <> lower(p_customer_email) then
    raise exception 'Verified customer email does not match the stored transaction.';
  end if;

  if v_payment.status = 'success' then
    return true;
  end if;

  if v_payment.status not in ('initialized', 'pending') then
    raise exception 'Payment is not eligible for fulfillment.';
  end if;

  select * into v_course
  from public.courses
  where id = v_payment.item_id
    and is_published = true
    and price = v_payment.amount_kes;

  if not found then
    raise exception 'The purchased course is unavailable or its price has changed.';
  end if;

  insert into public.enrollments (
    id, user_id, course_id, progress, completed, content, created_at, updated_at
  ) values (
    v_payment.user_id::text || ':' || v_payment.item_id,
    v_payment.user_id,
    v_payment.item_id,
    0,
    false,
    jsonb_build_object(
      'enrollmentDate', v_now,
      'paymentMethod', p_provider,
      'paymentReceipt', coalesce(p_provider_payload->>'receipt', p_reference),
      'completedLessons', '[]'::jsonb,
      'certificateAvailable', false
    ),
    v_now,
    v_now
  )
  on conflict (user_id, course_id) do nothing;

  update public.payment_transactions
  set status = 'success',
      provider_payload = coalesce(provider_payload, '{}'::jsonb) || coalesce(p_provider_payload, '{}'::jsonb)
        || jsonb_build_object('providerStatus', 'success', 'fulfilledAt', v_now),
      updated_at = v_now
  where id = v_payment.id
    and status in ('initialized', 'pending');

  return true;
end;
$$;

revoke all on function public.fulfill_verified_course_payment(text,text,numeric,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.fulfill_verified_course_payment(text,text,numeric,text,text,jsonb)
  to service_role;

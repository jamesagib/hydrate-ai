-- Grant manual access to premium features for a user
-- Usage examples:
--   -- Permanent access
--   select grant_manual_access('00000000-0000-0000-0000-000000000000'::uuid, null);
--   -- Temporary access for 7 days
--   select grant_manual_access('00000000-0000-0000-0000-000000000000'::uuid, 7);

create or replace function grant_manual_access(p_user_id uuid, p_days integer default null)
returns void
language plpgsql
security definer
as $$
declare
  v_expires_at timestamptz;
  v_rows_updated integer;
begin
  if p_days is null or p_days <= 0 then
    v_expires_at := null;
  else
    v_expires_at := now() + make_interval(days => p_days);
  end if;

  -- Try update first
  update profiles
  set subscription_status = 'active',
      subscription_source = 'manual',
      promo_expires_at = v_expires_at,
      updated_at = now()
  where user_id = p_user_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- If no profile row, insert one
  if v_rows_updated = 0 then
    insert into profiles (user_id, subscription_status, timezone, subscription_source, promo_expires_at)
    values (p_user_id, 'active', 'UTC', 'manual', v_expires_at)
    on conflict (user_id) do update set
      subscription_status = excluded.subscription_status,
      subscription_source = excluded.subscription_source,
      promo_expires_at = excluded.promo_expires_at,
      updated_at = now();
  end if;
end;
$$; 
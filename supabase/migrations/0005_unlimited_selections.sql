-- ===========================================================================
-- Unlimited selections
--
-- Supporters were capped at three selections. That cap now lifts: a null
-- allowance means unlimited, and a number still means a hard limit.
--
-- Null rather than a large number, deliberately. A big integer would still be
-- a cap, just one nobody has hit yet, and the difference matters the day an
-- account needs throttling: an admin sets a number on that one row and the
-- limit applies immediately, with no migration and no change for anyone else.
-- ===========================================================================

alter table supporter_profiles
  alter column selection_credits drop not null,
  alter column selection_credits set default null;

-- Existing supporters were created under the old default of three.
update supporter_profiles
   set selection_credits = null
 where selection_credits is not null;

-- The old range check still holds for a deliberate cap. A null passes it,
-- because a CHECK is satisfied when its expression is unknown.
comment on column supporter_profiles.selection_credits is
  'Maximum selections this supporter may hold. Null means unlimited, which is the default. Set a number to cap one account.';

-- ------------------------------------------------------ record_selection ---
-- Rewritten so that "no allowance recorded" and "no supporter profile" are no
-- longer the same condition. Previously a null read from the column was taken
-- to mean the profile was missing, which would have rejected every unlimited
-- supporter.
create or replace function public.record_selection(
  p_alajo_profile_id uuid,
  p_selector_id      uuid,
  p_selector_kind    selector_kind,
  p_campaign_id      uuid default null,
  p_note             text default null,
  p_ip_hash          text default null,
  p_device_hash      text default null,
  p_user_agent       text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sel_id      uuid;
  credits     int;
  used        int;
  profile_ok  boolean;
begin
  select exists (
    select 1 from alajo_profiles
    where id = p_alajo_profile_id and status in ('approved','featured')
  ) into profile_ok;

  if not profile_ok then
    raise exception 'That business is not available to select' using errcode = 'check_violation';
  end if;

  if p_selector_kind = 'supporter' then
    select selection_credits into credits
      from supporter_profiles where user_id = p_selector_id for update;

    -- FOUND distinguishes a missing row from a row holding null.
    if not found then
      raise exception 'No supporter profile' using errcode = 'insufficient_privilege';
    end if;

    if credits is not null then
      select count(*) into used
        from support_selections
       where selector_id = p_selector_id and status <> 'withdrawn';

      if used >= credits then
        raise exception 'You have used all your selections' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  insert into support_selections (
    alajo_profile_id, campaign_id, selector_id, selector_kind,
    status, note, ip_hash, device_hash, user_agent
  ) values (
    p_alajo_profile_id, p_campaign_id, p_selector_id, p_selector_kind,
    'recorded', p_note, p_ip_hash, p_device_hash, p_user_agent
  ) returning id into sel_id;

  return sel_id;
end;
$$;

revoke execute on function public.record_selection(uuid, uuid, selector_kind, uuid, text, text, text, text)
  from public, anon, authenticated;

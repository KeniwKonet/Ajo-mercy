-- ============================================================================
-- Ajo Mercy :: 0002 functions, triggers, state machines
-- The application layer refuses invalid transitions; this makes the database
-- refuse them too, so a compromised or buggy client cannot skip review.
-- ============================================================================

-- ------------------------------------------------------ identity helpers ---
-- SECURITY DEFINER so RLS policies can call them without recursing into
-- profiles' own policies.
create or replace function public.auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.auth_status()
returns user_status language sql stable security definer set search_path = public as $$
  select status from profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('super_admin','admin','reviewer')
      and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin','admin') and status = 'approved'
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin' and status = 'approved'
  );
$$;

create or replace function public.is_approved_supporter()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join supporter_profiles s on s.user_id = p.id
    where p.id = auth.uid() and p.status = 'approved' and s.status = 'approved'
  );
$$;

create or replace function public.is_approved_brand()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join brand_profiles b on b.user_id = p.id
    where p.id = auth.uid() and p.status = 'approved' and b.status = 'approved'
  );
$$;

-- ------------------------------------------------------------ updated_at ---
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','alajo_applications','alajo_profiles','supporter_profiles',
    'brand_profiles','support_campaigns','support_selections','support_confirmations'
  ] loop
    execute format(
      'create trigger %I_touch before update on %I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- -------------------------------------------------------- state machines ---
-- Every legal edge, in one place. Anything absent is rejected.
create table state_transitions (
  entity     text not null,
  from_state text not null,
  to_state   text not null,
  primary key (entity, from_state, to_state)
);

insert into state_transitions (entity, from_state, to_state) values
  -- application_status: used by alajo_applications, supporter_profiles, brand_profiles
  ('application','draft','submitted'),
  ('application','draft','withdrawn'),
  ('application','submitted','under_review'),
  ('application','submitted','more_information_required'),
  ('application','submitted','approved'),
  ('application','submitted','rejected'),
  ('application','submitted','withdrawn'),
  ('application','under_review','more_information_required'),
  ('application','under_review','approved'),
  ('application','under_review','rejected'),
  ('application','under_review','submitted'),
  ('application','under_review','withdrawn'),
  ('application','more_information_required','submitted'),
  ('application','more_information_required','withdrawn'),
  ('application','approved','suspended'),
  ('application','approved','withdrawn'),
  ('application','rejected','under_review'),
  ('application','suspended','approved'),
  ('application','suspended','rejected'),
  ('application','withdrawn','draft'),

  -- alajo_profile_status
  ('alajo_profile','private','pending'),
  ('alajo_profile','pending','approved'),
  ('alajo_profile','pending','private'),
  ('alajo_profile','approved','featured'),
  ('alajo_profile','approved','suspended'),
  ('alajo_profile','approved','archived'),
  ('alajo_profile','featured','approved'),
  ('alajo_profile','featured','suspended'),
  ('alajo_profile','featured','archived'),
  ('alajo_profile','suspended','approved'),
  ('alajo_profile','suspended','archived'),
  ('alajo_profile','archived','private'),

  -- campaign_status
  ('campaign','draft','open'),
  ('campaign','draft','cancelled'),
  ('campaign','open','selection_period'),
  ('campaign','open','cancelled'),
  ('campaign','selection_period','under_review'),
  ('campaign','selection_period','cancelled'),
  ('campaign','under_review','confirmed'),
  ('campaign','under_review','selection_period'),
  ('campaign','under_review','cancelled'),
  ('campaign','confirmed','announced'),
  ('campaign','confirmed','cancelled'),
  ('campaign','announced','completed'),
  ('campaign','announced','cancelled'),

  -- confirmation_status
  ('confirmation','pending','confirmed'),
  ('confirmation','pending','cancelled'),
  ('confirmation','confirmed','announced'),
  ('confirmation','confirmed','cancelled'),
  ('confirmation','announced','completed'),
  ('confirmation','announced','cancelled'),

  -- selection_status
  ('selection','recorded','shortlisted'),
  ('selection','recorded','declined'),
  ('selection','recorded','withdrawn'),
  ('selection','shortlisted','confirmed'),
  ('selection','shortlisted','declined'),
  ('selection','shortlisted','withdrawn'),
  ('selection','confirmed','withdrawn'),

  -- user_status
  ('user','pending','approved'),
  ('user','pending','rejected'),
  ('user','pending','suspended'),
  ('user','approved','suspended'),
  ('user','approved','rejected'),
  ('user','suspended','approved'),
  ('user','suspended','rejected'),
  ('user','rejected','pending');

create or replace function public.assert_transition(entity text, from_state text, to_state text)
returns void language plpgsql stable as $$
begin
  if from_state = to_state then
    return;
  end if;
  if not exists (
    select 1 from state_transitions st
    where st.entity = assert_transition.entity
      and st.from_state = assert_transition.from_state
      and st.to_state = assert_transition.to_state
  ) then
    raise exception 'Invalid % transition: % -> %', entity, from_state, to_state
      using errcode = 'check_violation';
  end if;
end;
$$;

-- One generic trigger. TG_ARGV[0] is the entity key, TG_ARGV[1] the column.
create or replace function public.enforce_state_transition()
returns trigger language plpgsql as $$
declare
  entity_key text := tg_argv[0];
  col        text := coalesce(tg_argv[1], 'status');
  old_val    text;
  new_val    text;
begin
  execute format('select ($1).%I::text, ($2).%I::text', col, col)
    into old_val, new_val using old, new;
  perform public.assert_transition(entity_key, old_val, new_val);
  return new;
end;
$$;

create trigger alajo_app_state before update on alajo_applications
  for each row execute function public.enforce_state_transition('application','status');
create trigger supporter_state before update on supporter_profiles
  for each row execute function public.enforce_state_transition('application','status');
create trigger brand_state before update on brand_profiles
  for each row execute function public.enforce_state_transition('application','status');
create trigger alajo_profile_state before update on alajo_profiles
  for each row execute function public.enforce_state_transition('alajo_profile','status');
create trigger campaign_state before update on support_campaigns
  for each row execute function public.enforce_state_transition('campaign','status');
create trigger confirmation_state before update on support_confirmations
  for each row execute function public.enforce_state_transition('confirmation','status');
create trigger selection_state before update on support_selections
  for each row execute function public.enforce_state_transition('selection','status');
create trigger user_state before update on profiles
  for each row execute function public.enforce_state_transition('user','status');

-- ------------------------------------------------ role escalation guard ----
-- Only a super admin may mint or demote staff. Enforced below RLS so that even
-- a leaked service-role path leaves a trail rather than a silent takeover.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if new.role in ('super_admin','admin','reviewer')
       or old.role in ('super_admin','admin','reviewer') then
      -- auth.uid() is null for service-role/server jobs, which we allow, but
      -- an authenticated non-super-admin must never reach this path.
      if auth.uid() is not null and not public.is_super_admin() then
        raise exception 'Only a super admin may change staff roles'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on profiles
  for each row execute function public.guard_role_change();

-- Exactly one super admin seat is expected; extra ones must be deliberate.
create unique index profiles_single_super_admin on profiles(role) where role = 'super_admin';

-- ------------------------------------------------------- new user wiring ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role user_role;
  meta_name      text;
begin
  meta_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  -- Self-service signup may only claim a non-staff role. Staff are provisioned
  -- server-side with an explicit update.
  requested_role := case new.raw_user_meta_data ->> 'role'
    when 'alajo' then 'alajo'::user_role
    when 'brand' then 'brand'::user_role
    else 'supporter'::user_role
  end;

  insert into profiles (id, email, full_name, role, status, email_verified_at)
  values (
    new.id, new.email, meta_name, requested_role, 'pending',
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mirror email confirmation into profiles so the app never reads auth.users.
create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update profiles set email_verified_at = new.email_confirmed_at where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed after update on auth.users
  for each row execute function public.handle_user_confirmed();

-- ------------------------------------------------------ slug generation ----
-- Avoids a hard dependency on the unaccent extension, which is not enabled on
-- every Supabase plan.
create or replace function public.unaccent_fallback(input text)
returns text language sql immutable as $$
  select translate(input, 'àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ',
                          'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC');
$$;

create or replace function public.slugify(input text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(public.unaccent_fallback(input)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.unique_slug(base text, table_name text)
returns text language plpgsql as $$
declare
  candidate text := nullif(public.slugify(base), '');
  suffix    int  := 1;
  taken     boolean;
begin
  candidate := coalesce(candidate, 'alajo');
  loop
    execute format('select exists(select 1 from %I where slug = $1)', table_name)
      into taken using candidate;
    exit when not taken;
    suffix := suffix + 1;
    candidate := public.slugify(base) || '-' || suffix::text;
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------- public stats ---
-- Only aggregates over approved rows, so it is safe to expose to anon.
-- Returns real values or zero; nothing here is ever seeded with vanity numbers.
create or replace view public_impact_stats
with (security_invoker = off) as
select
  (select count(*) from alajo_applications where status <> 'draft')                       as alajos_registered,
  (select count(*) from alajo_profiles where status in ('approved','featured'))           as alajos_approved,
  (select count(*) from support_confirmations where status in ('announced','completed'))  as businesses_supported,
  (select coalesce(sum(amount_ngn), 0) from support_confirmations
     where status in ('announced','completed'))                                           as support_facilitated_ngn,
  (select count(distinct state) from alajo_profiles where status in ('approved','featured')) as states_reached,
  (select count(distinct business_category) from alajo_profiles
     where status in ('approved','featured'))                                             as categories_supported,
  (select count(*) from brand_profiles where status = 'approved')                         as brands_participating,
  (select count(*) from supporter_profiles where status = 'approved')                     as supporters_approved;

grant select on public_impact_stats to anon, authenticated;

-- --------------------------------------------------------- rate limiting ---
-- Atomic fixed-window counter. Returns the count after this hit; the caller
-- compares against its own limit so buckets stay configurable in code.
create or replace function public.bump_rate_limit(
  p_bucket text, p_identifier text, p_window_seconds int
) returns int language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, w, 1)
  on conflict (bucket, identifier, window_start)
    do update set count = rate_limits.count + 1
  returning count into c;
  return c;
end;
$$;

create or replace function public.sweep_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from rate_limits where window_start < now() - interval '2 hours';
$$;

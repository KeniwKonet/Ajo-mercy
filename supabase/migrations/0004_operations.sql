-- ============================================================================
-- Ajo Mercy :: 0004 operational routines
-- Multi-table workflows live here so they are atomic. An approval that creates
-- a public profile must either happen completely or not at all.
-- ============================================================================

create or replace function public.increment_profile_view(p_profile_id uuid)
returns void language sql security definer set search_path = public as $$
  update alajo_profiles set view_count = view_count + 1 where id = p_profile_id;
$$;

grant execute on function public.increment_profile_view(uuid) to anon, authenticated;

-- ---------------------------------------------------- approve an Alajo -----
-- Moves the application to approved, publishes the profile and activates the
-- user account in one transaction. Returns the profile id and slug.
create or replace function public.approve_alajo_application(
  p_application_id uuid,
  p_reviewer_id    uuid,
  p_applicant_message text default null,
  p_feature        boolean default false
) returns table (profile_id uuid, slug text)
language plpgsql security definer set search_path = public as $$
declare
  app        alajo_applications%rowtype;
  new_slug   text;
  existing   alajo_profiles%rowtype;
  cover_id   uuid;
  avatar_id  uuid;
begin
  select * into app from alajo_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application % not found', p_application_id using errcode = 'no_data_found';
  end if;

  if app.business_name is null or app.story is null or app.business_category is null or app.state is null then
    raise exception 'Application is incomplete and cannot be approved' using errcode = 'check_violation';
  end if;

  update alajo_applications
     set status = 'approved',
         reviewed_at = now(),
         reviewed_by = p_reviewer_id,
         applicant_message = coalesce(p_applicant_message, applicant_message)
   where id = p_application_id;

  update profiles set status = 'approved' where id = app.user_id and status <> 'approved';

  select id into cover_id from alajo_media
   where application_id = app.id and kind = 'business_photo'
   order by sort_order limit 1;

  select id into avatar_id from alajo_media
   where application_id = app.id and kind = 'profile_photo'
   order by sort_order limit 1;

  select * into existing from alajo_profiles where application_id = p_application_id;

  if found then
    -- Re-approval after a suspension: refresh content, keep the slug so
    -- existing links and shares do not break.
    update alajo_profiles
       set business_name = app.business_name,
           founder_name = coalesce(app.founder_name, existing.founder_name),
           business_category = app.business_category,
           state = app.state,
           city = app.city,
           year_started = app.year_started,
           story = app.story,
           current_challenge = app.current_challenge,
           support_would_enable = app.support_would_enable,
           requested_amount_ngn = app.requested_amount_ngn,
           cover_media_id = coalesce(cover_id, existing.cover_media_id),
           avatar_media_id = coalesce(avatar_id, existing.avatar_media_id),
           website_url = app.website_url,
           instagram_handle = app.instagram_handle,
           tiktok_handle = app.tiktok_handle,
           status = 'approved',
           approved_at = coalesce(existing.approved_at, now())
     where id = existing.id;
    new_slug := existing.slug;
    profile_id := existing.id;
  else
    new_slug := public.unique_slug(app.business_name, 'alajo_profiles');
    insert into alajo_profiles (
      user_id, application_id, slug, status, business_name, founder_name,
      business_category, state, city, year_started, story, current_challenge,
      support_would_enable, requested_amount_ngn, cover_media_id, avatar_media_id,
      website_url, instagram_handle, tiktok_handle, approved_at
    ) values (
      app.user_id, app.id, new_slug, 'pending', app.business_name,
      coalesce(app.founder_name, 'Founder'), app.business_category, app.state, app.city,
      app.year_started, app.story, app.current_challenge, app.support_would_enable,
      app.requested_amount_ngn, cover_id, avatar_id, app.website_url,
      app.instagram_handle, app.tiktok_handle, now()
    ) returning id into profile_id;

    -- private -> pending -> approved, so the state machine is honoured rather
    -- than bypassed by inserting straight into 'approved'.
    update alajo_profiles set status = 'approved' where id = profile_id;
  end if;

  if p_feature then
    update alajo_profiles set status = 'featured', featured_at = now() where id = profile_id;
  end if;

  slug := new_slug;
  return next;
end;
$$;

revoke execute on function public.approve_alajo_application(uuid, uuid, text, boolean) from public, anon, authenticated;

-- ------------------------------------------- record a support selection -----
-- Enforces the per-supporter credit limit inside the same transaction that
-- writes the selection, so two parallel requests cannot both slip through.
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
    if credits is null then
      raise exception 'No supporter profile' using errcode = 'insufficient_privilege';
    end if;

    select count(*) into used
      from support_selections
     where selector_id = p_selector_id and status <> 'withdrawn';

    if used >= credits then
      raise exception 'You have used all your selections' using errcode = 'check_violation';
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

-- ------------------------------------------------- admin dashboard read ----
-- One round trip for the counts the dashboard leads with.
create or replace function public.admin_dashboard_counts()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pending_alajo_reviews', (
      select count(*) from alajo_applications where status in ('submitted','under_review')
    ),
    'alajo_awaiting_resubmission', (
      select count(*) from alajo_applications where status = 'more_information_required'
    ),
    'pending_supporter_reviews', (
      select count(*) from supporter_profiles where status in ('submitted','under_review')
    ),
    'pending_brand_reviews', (
      select count(*) from brand_profiles where status in ('submitted','under_review')
    ),
    'pending_confirmations', (
      select count(*) from support_confirmations where status = 'pending'
    ),
    'unreviewed_selections', (
      select count(*) from support_selections where status = 'recorded'
    ),
    'active_campaigns', (
      select count(*) from support_campaigns where status in ('open','selection_period','under_review')
    ),
    'email_failures', (
      select count(*) from email_events where status in ('failed','bounced')
    ),
    'live_profiles', (
      select count(*) from alajo_profiles where status in ('approved','featured')
    ),
    'suspended_profiles', (
      select count(*) from alajo_profiles where status = 'suspended'
    ),
    'total_supporters', (select count(*) from supporter_profiles where status = 'approved'),
    'total_brands', (select count(*) from brand_profiles where status = 'approved'),
    'support_confirmed_total', (
      select coalesce(sum(amount_ngn), 0) from support_confirmations
      where status in ('confirmed','announced','completed')
    ),
    'businesses_supported', (
      select count(distinct alajo_profile_id) from support_confirmations
      where status in ('confirmed','announced','completed')
    )
  );
$$;

revoke execute on function public.admin_dashboard_counts() from public, anon;
grant execute on function public.admin_dashboard_counts() to authenticated;

-- Repeated selections from one device or address are the main abuse signal we
-- can see without collecting more personal data than we should.
create or replace view admin_selection_risk
with (security_invoker = on) as
select
  s.device_hash,
  s.ip_hash,
  count(*)                              as selection_count,
  count(distinct s.selector_id)         as distinct_selectors,
  min(s.created_at)                     as first_seen,
  max(s.created_at)                     as last_seen
from support_selections s
where s.device_hash is not null
group by s.device_hash, s.ip_hash
having count(distinct s.selector_id) > 1
order by count(distinct s.selector_id) desc, count(*) desc;

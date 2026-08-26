-- ============================================================================
-- Ajo Mercy :: 0003 row level security
-- Nothing in this file trusts a client-supplied role. Every policy resolves the
-- caller's role from the database via the SECURITY DEFINER helpers in 0002.
-- ============================================================================

-- A user may edit their own profile, but never their own role, status or
-- permissions. Policies cannot restrict columns, so a trigger pins them.
create or replace function public.pin_self_service_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() = new.id and not public.is_admin() then
    new.role        := old.role;
    new.status      := old.status;
    new.permissions := old.permissions;
    new.suspended_at := old.suspended_at;
    new.suspension_reason := old.suspension_reason;
  end if;
  return new;
end;
$$;

create trigger profiles_pin_self_fields before update on profiles
  for each row execute function public.pin_self_service_profile_fields();

-- Likewise, an applicant must not move their own application into a decided
-- state. They may only submit or withdraw.
create or replace function public.pin_applicant_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() = new.user_id and not public.is_staff() then
    if new.status is distinct from old.status
       and new.status not in ('submitted','withdrawn','draft') then
      raise exception 'Applicants may not set status %', new.status
        using errcode = 'insufficient_privilege';
    end if;
    new.reviewed_by     := old.reviewed_by;
    new.reviewed_at     := old.reviewed_at;
    new.decision_reason := old.decision_reason;
  end if;
  return new;
end;
$$;

create trigger alajo_app_pin_status before update on alajo_applications
  for each row execute function public.pin_applicant_status();
create trigger supporter_pin_status before update on supporter_profiles
  for each row execute function public.pin_applicant_status();
create trigger brand_pin_status before update on brand_profiles
  for each row execute function public.pin_applicant_status();

-- ------------------------------------------------------------ enable RLS ---
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','alajo_applications','verification_requests','alajo_media',
    'business_verifications','alajo_profiles','supporter_profiles','brand_profiles',
    'support_campaigns','campaign_alajos','support_selections','support_confirmations',
    'email_events','notifications','audit_logs','admin_notes','announcements',
    'rate_limits','analytics_events','state_transitions'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- ------------------------------------------------------------- profiles ----
create policy profiles_select_self on profiles for select
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_self on profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Inserts come from the auth trigger (SECURITY DEFINER) or the service role.
create policy profiles_insert_self on profiles for insert
  with check (id = auth.uid());

-- --------------------------------------------------- alajo applications ----
create policy alajo_app_select on alajo_applications for select
  using (user_id = auth.uid() or public.is_staff());

create policy alajo_app_insert on alajo_applications for insert
  with check (user_id = auth.uid() and public.auth_role() = 'alajo');

-- Applicants may only edit while the application is theirs to edit.
create policy alajo_app_update_owner on alajo_applications for update
  using (user_id = auth.uid() and status in ('draft','more_information_required'))
  with check (user_id = auth.uid());

create policy alajo_app_update_staff on alajo_applications for update
  using (public.is_staff()) with check (public.is_staff());

create policy alajo_app_delete_owner on alajo_applications for delete
  using (user_id = auth.uid() and status = 'draft');

-- ----------------------------------------------- verification requests -----
create policy verif_req_select on verification_requests for select
  using (
    public.is_staff()
    or exists (
      select 1 from alajo_applications a
      where a.id = verification_requests.application_id and a.user_id = auth.uid()
    )
  );

create policy verif_req_write on verification_requests for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------- alajo media ----
create policy alajo_media_select on alajo_media for select
  using (
    public.is_staff()
    or exists (
      select 1 from alajo_applications a
      where a.id = alajo_media.application_id and a.user_id = auth.uid()
    )
    -- Public imagery for an approved profile. Documents are never public.
    or (
      kind in ('profile_photo','business_photo','video')
      and exists (
        select 1 from alajo_profiles p
        where p.application_id = alajo_media.application_id
          and p.status in ('approved','featured')
      )
    )
  );

create policy alajo_media_insert_owner on alajo_media for insert
  with check (
    exists (
      select 1 from alajo_applications a
      where a.id = alajo_media.application_id
        and a.user_id = auth.uid()
        and a.status in ('draft','more_information_required')
    )
  );

create policy alajo_media_delete_owner on alajo_media for delete
  using (
    exists (
      select 1 from alajo_applications a
      where a.id = alajo_media.application_id
        and a.user_id = auth.uid()
        and a.status in ('draft','more_information_required')
    ) or public.is_staff()
  );

create policy alajo_media_staff on alajo_media for all
  using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------ business verifications ---
create policy business_verif_staff on business_verifications for all
  using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------- alajo profiles ----
-- The single public read surface of the platform.
create policy alajo_profiles_public_select on alajo_profiles for select
  using (
    status in ('approved','featured')
    or user_id = auth.uid()
    or public.is_staff()
  );

create policy alajo_profiles_staff_write on alajo_profiles for all
  using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------- supporter profiles ----
create policy supporter_select on supporter_profiles for select
  using (user_id = auth.uid() or public.is_staff());

create policy supporter_insert on supporter_profiles for insert
  with check (user_id = auth.uid() and public.auth_role() = 'supporter');

create policy supporter_update_owner on supporter_profiles for update
  using (user_id = auth.uid() and status in ('draft','more_information_required'))
  with check (user_id = auth.uid());

create policy supporter_staff on supporter_profiles for all
  using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------- brand profiles ----
create policy brand_select on brand_profiles for select
  using (user_id = auth.uid() or public.is_staff() or status = 'approved');

create policy brand_insert on brand_profiles for insert
  with check (user_id = auth.uid() and public.auth_role() = 'brand');

create policy brand_update_owner on brand_profiles for update
  using (user_id = auth.uid() and status in ('draft','more_information_required'))
  with check (user_id = auth.uid());

create policy brand_staff on brand_profiles for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------- support campaigns ----
create policy campaign_select on support_campaigns for select
  using (
    status in ('open','selection_period','announced','completed')
    or public.is_staff()
    or exists (
      select 1 from brand_profiles b
      where b.id = support_campaigns.brand_id and b.user_id = auth.uid()
    )
  );

create policy campaign_insert_brand on support_campaigns for insert
  with check (
    public.is_approved_brand()
    and exists (
      select 1 from brand_profiles b
      where b.id = support_campaigns.brand_id and b.user_id = auth.uid()
    )
    and is_platform_campaign = false
  );

create policy campaign_update_brand on support_campaigns for update
  using (
    status = 'draft'
    and exists (
      select 1 from brand_profiles b
      where b.id = support_campaigns.brand_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from brand_profiles b
      where b.id = support_campaigns.brand_id and b.user_id = auth.uid()
    )
  );

create policy campaign_staff on support_campaigns for all
  using (public.is_staff()) with check (public.is_staff());

create policy campaign_alajos_select on campaign_alajos for select
  using (
    public.is_staff()
    or exists (
      select 1 from support_campaigns c
      join brand_profiles b on b.id = c.brand_id
      where c.id = campaign_alajos.campaign_id and b.user_id = auth.uid()
    )
  );

create policy campaign_alajos_staff on campaign_alajos for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------- support selections ---
-- Deliberately never publicly readable: raw counts would turn support into a
-- popularity contest, which the product explicitly avoids.
create policy selection_select on support_selections for select
  using (
    selector_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from alajo_profiles p
      where p.id = support_selections.alajo_profile_id and p.user_id = auth.uid()
    )
  );

create policy selection_insert on support_selections for insert
  with check (
    selector_id = auth.uid()
    and (
      (selector_kind = 'supporter' and public.is_approved_supporter())
      or (selector_kind = 'brand' and public.is_approved_brand())
    )
    and exists (
      select 1 from alajo_profiles p
      where p.id = support_selections.alajo_profile_id
        and p.status in ('approved','featured')
    )
    and status = 'recorded'
  );

create policy selection_withdraw_owner on support_selections for update
  using (selector_id = auth.uid() and status = 'recorded')
  with check (selector_id = auth.uid());

create policy selection_staff on support_selections for all
  using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------- support confirmations ---
create policy confirmation_select on support_confirmations for select
  using (
    public.is_staff()
    or (
      status in ('confirmed','announced','completed')
      and exists (
        select 1 from alajo_profiles p
        where p.id = support_confirmations.alajo_profile_id and p.user_id = auth.uid()
      )
    )
  );

create policy confirmation_staff on support_confirmations for all
  using (public.is_staff()) with check (public.is_staff());

-- -------------------------------------------------------- ops surfaces -----
create policy email_events_staff on email_events for all
  using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_staff on audit_logs for select using (public.is_staff());

create policy admin_notes_staff on admin_notes for all
  using (public.is_staff()) with check (public.is_staff());

create policy notifications_own on notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_staff on notifications for all
  using (public.is_admin()) with check (public.is_admin());

create policy announcements_public_read on announcements for select
  using (
    (published_at is not null and published_at <= now() and audience = 'public')
    or (published_at is not null and published_at <= now() and auth.uid() is not null)
    or public.is_staff()
  );
create policy announcements_staff on announcements for all
  using (public.is_admin()) with check (public.is_admin());

create policy analytics_staff_read on analytics_events for select using (public.is_admin());

create policy state_transitions_read on state_transitions for select using (true);

-- rate_limits has RLS enabled and no policy at all: only the service role and
-- the SECURITY DEFINER bump_rate_limit function may touch it.

-- ------------------------------------------------------------- storage -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('alajo-public', 'alajo-public', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']),
  ('alajo-documents', 'alajo-documents', false, 10485760,
    array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Uploads land under <user_id>/... so ownership is provable from the path.
create policy storage_public_read on storage.objects for select
  using (bucket_id = 'alajo-public');

create policy storage_public_insert on storage.objects for insert
  with check (
    bucket_id = 'alajo-public'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_public_delete on storage.objects for delete
  using (
    bucket_id = 'alajo-public'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

create policy storage_docs_read on storage.objects for select
  using (
    bucket_id = 'alajo-documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

create policy storage_docs_insert on storage.objects for insert
  with check (
    bucket_id = 'alajo-documents'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_docs_delete on storage.objects for delete
  using (
    bucket_id = 'alajo-documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff())
  );

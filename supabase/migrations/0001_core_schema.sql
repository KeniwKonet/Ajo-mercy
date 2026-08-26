-- ============================================================================
-- Ajo Mercy :: 0001 core schema
-- Roles, applications, profiles, campaigns, selections, ops tables.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- ---------------------------------------------------------------- enums ----
create type user_role as enum ('super_admin','admin','reviewer','alajo','supporter','brand');
create type user_status as enum ('pending','approved','suspended','rejected');

create type application_status as enum (
  'draft','submitted','under_review','more_information_required',
  'approved','rejected','suspended','withdrawn'
);

create type alajo_profile_status as enum ('private','pending','approved','featured','suspended','archived');

create type campaign_status as enum (
  'draft','open','selection_period','under_review','confirmed','announced','completed','cancelled'
);

create type selection_status as enum ('recorded','shortlisted','confirmed','declined','withdrawn');
create type confirmation_status as enum ('pending','confirmed','announced','completed','cancelled');
create type email_status as enum ('queued','sending','sent','delivered','bounced','complained','failed');
create type media_kind as enum ('profile_photo','business_photo','video','document');
create type document_type as enum ('cac_certificate','government_id','proof_of_address','bank_statement','other');
create type selector_kind as enum ('supporter','brand','admin');

-- Nigerian business sectors. Kept as an enum so discovery filters and campaign
-- targeting share exactly one vocabulary.
create type business_category as enum (
  'food_and_beverage','fashion_and_textiles','agriculture','beauty_and_wellness',
  'retail_and_trading','technology','education','logistics_and_transport',
  'creative_and_media','manufacturing','professional_services','health','other'
);

-- ------------------------------------------------------------- profiles ----
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              user_role   not null default 'supporter',
  status            user_status not null default 'pending',
  email             citext      not null unique,
  full_name         text        not null,
  phone             text,
  avatar_url        text,
  -- Granular overrides for admin/reviewer accounts. Empty object = role defaults.
  permissions       jsonb       not null default '{}'::jsonb,
  email_verified_at timestamptz,
  last_seen_at      timestamptz,
  suspended_at      timestamptz,
  suspension_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) between 2 and 120),
  constraint profiles_phone_fmt check (phone is null or phone ~ '^[+]?[0-9 ()-]{7,20}$')
);
create index profiles_role_status_idx on profiles(role, status);
create index profiles_created_idx on profiles(created_at desc);

-- ------------------------------------------------- alajo applications ------
create table alajo_applications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  status                application_status not null default 'draft',

  founder_name          text,
  date_of_birth         date,
  gender                text,
  personal_phone        text,
  personal_address      text,

  business_name         text,
  business_category     business_category,
  business_description  text,
  year_started          int,
  employee_count        int,
  state                 text,
  city                  text,
  business_address      text,
  business_phone        text,
  website_url           text,
  instagram_handle      text,
  tiktok_handle         text,
  x_handle              text,
  facebook_url          text,

  -- Story fields; these become the public profile once approved.
  story                 text,
  current_challenge     text,
  support_would_enable  text,
  requested_amount_ngn  bigint,

  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           uuid references profiles(id) on delete set null,
  decision_reason       text,   -- internal only, never surfaced to the applicant
  applicant_message     text,   -- shown to the applicant
  completeness          int  not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint alajo_app_one_per_user unique (user_id),
  constraint alajo_year_valid check (year_started is null or year_started between 1900 and 2100),
  constraint alajo_amount_valid check (requested_amount_ngn is null or requested_amount_ngn between 0 and 500000000),
  constraint alajo_employees_valid check (employee_count is null or employee_count between 0 and 100000),
  constraint alajo_completeness_valid check (completeness between 0 and 100)
);
create index alajo_app_status_idx on alajo_applications(status, submitted_at desc nulls last);
create index alajo_app_user_idx on alajo_applications(user_id);
create index alajo_app_category_idx on alajo_applications(business_category);
create index alajo_app_name_trgm on alajo_applications using gin (business_name gin_trgm_ops);

-- Specific items an admin has asked the applicant to fix. Drives the
-- "here is exactly what to update" panel on the Alajo dashboard.
create table verification_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references alajo_applications(id) on delete cascade,
  field_key      text not null,
  message        text not null,
  resolved_at    timestamptz,
  requested_by   uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index verification_requests_open_idx on verification_requests(application_id) where resolved_at is null;

create table alajo_media (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references alajo_applications(id) on delete cascade,
  kind           media_kind not null,
  document_type  document_type,
  storage_path   text not null,
  mime_type      text not null,
  size_bytes     int  not null,
  caption        text,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  constraint alajo_media_size check (size_bytes > 0 and size_bytes <= 26214400)
);
create index alajo_media_app_idx on alajo_media(application_id, kind, sort_order);

create table business_verifications (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references alajo_applications(id) on delete cascade,
  check_key      text not null,   -- identity_document | business_evidence | contactability | story_authenticity
  passed         boolean,
  note           text,
  checked_by     uuid references profiles(id) on delete set null,
  checked_at     timestamptz,
  unique (application_id, check_key)
);

-- ------------------------------------------------------ alajo profiles -----
create table alajo_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references profiles(id) on delete cascade,
  application_id       uuid not null unique references alajo_applications(id) on delete cascade,
  slug                 text not null unique,
  status               alajo_profile_status not null default 'private',
  business_name        text not null,
  founder_name         text not null,
  business_category    business_category not null,
  state                text not null,
  city                 text,
  year_started         int,
  story                text not null,
  current_challenge    text,
  support_would_enable text,
  requested_amount_ngn bigint,
  cover_media_id       uuid references alajo_media(id) on delete set null,
  avatar_media_id      uuid references alajo_media(id) on delete set null,
  website_url          text,
  instagram_handle     text,
  tiktok_handle        text,
  featured_at          timestamptz,
  approved_at          timestamptz,
  archived_at          timestamptz,
  view_count           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint alajo_profile_slug_fmt check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index alajo_profiles_public_idx on alajo_profiles(status, approved_at desc)
  where status in ('approved','featured');
create index alajo_profiles_cat_idx on alajo_profiles(business_category, status);
create index alajo_profiles_state_idx on alajo_profiles(state, status);
create index alajo_profiles_search_trgm on alajo_profiles using gin (
  (business_name || ' ' || founder_name || ' ' || coalesce(city,'') || ' ' || state) gin_trgm_ops
);

-- --------------------------------------------------- supporter profiles ----
create table supporter_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references profiles(id) on delete cascade,
  status            application_status not null default 'draft',
  phone             text,
  state             text,
  city              text,
  occupation        text,
  motivation        text,
  how_heard         text,
  interests         business_category[] not null default '{}',
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references profiles(id) on delete set null,
  decision_reason   text,
  -- How many Alajos this supporter may back. Caps abuse without publishing counts.
  selection_credits int not null default 3,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint supporter_credits_valid check (selection_credits between 0 and 50)
);
create index supporter_status_idx on supporter_profiles(status, submitted_at desc nulls last);

-- ------------------------------------------------------- brand profiles ----
create table brand_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references profiles(id) on delete cascade,
  status                application_status not null default 'draft',
  slug                  text unique,
  organisation_name     text,
  registration_number   text,
  logo_url              text,
  website_url           text,
  industry              text,
  about                 text,
  contact_person_name   text,
  contact_person_role   text,
  contact_email         citext,
  contact_phone         text,
  linkedin_url          text,
  instagram_handle      text,
  support_purpose       text,
  preferred_categories  business_category[] not null default '{}',
  preferred_states      text[] not null default '{}',
  budget_min_ngn        bigint,
  budget_max_ngn        bigint,
  businesses_target     int,
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           uuid references profiles(id) on delete set null,
  decision_reason       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint brand_budget_order check (
    budget_min_ngn is null or budget_max_ngn is null or budget_max_ngn >= budget_min_ngn
  ),
  constraint brand_slug_fmt check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index brand_status_idx on brand_profiles(status, submitted_at desc nulls last);

-- ---------------------------------------------------- support campaigns ----
create table support_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  brand_id             uuid references brand_profiles(id) on delete cascade,
  created_by           uuid not null references profiles(id) on delete restrict,
  slug                 text not null unique,
  name                 text not null,
  status               campaign_status not null default 'draft',
  summary              text,
  budget_ngn           bigint,
  businesses_target    int not null default 1,
  preferred_categories business_category[] not null default '{}',
  preferred_states     text[] not null default '{}',
  selection_opens_at   timestamptz,
  selection_closes_at  timestamptz,
  announced_at         timestamptz,
  completed_at         timestamptz,
  is_platform_campaign boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint campaign_target_valid check (businesses_target between 1 and 1000),
  constraint campaign_window_order check (
    selection_opens_at is null or selection_closes_at is null
    or selection_closes_at > selection_opens_at
  ),
  constraint campaign_owner check (is_platform_campaign or brand_id is not null)
);
create index campaign_status_idx on support_campaigns(status, created_at desc);
create index campaign_brand_idx on support_campaigns(brand_id);

-- Alajos an admin has made eligible for a campaign.
create table campaign_alajos (
  campaign_id      uuid not null references support_campaigns(id) on delete cascade,
  alajo_profile_id uuid not null references alajo_profiles(id) on delete cascade,
  added_by         uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  primary key (campaign_id, alajo_profile_id)
);

-- ---------------------------------------------------- support selections ---
create table support_selections (
  id               uuid primary key default gen_random_uuid(),
  alajo_profile_id uuid not null references alajo_profiles(id) on delete cascade,
  campaign_id      uuid references support_campaigns(id) on delete set null,
  selector_id      uuid not null references profiles(id) on delete cascade,
  selector_kind    selector_kind not null,
  status           selection_status not null default 'recorded',
  note             text,
  -- Abuse forensics. Hashed, admin-only, never returned to public queries.
  ip_hash          text,
  device_hash      text,
  user_agent       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- One selection per selector per Alajo per campaign. Campaign-less selections
-- collapse onto the sentinel uuid so the same uniqueness rule still applies.
create unique index support_selection_unique on support_selections(
  selector_id, alajo_profile_id, coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index selection_alajo_idx on support_selections(alajo_profile_id, status);
create index selection_campaign_idx on support_selections(campaign_id, status);
create index selection_recent_idx on support_selections(created_at desc);

-- The deliberate admin gate between "was selected" and "is being supported".
create table support_confirmations (
  id               uuid primary key default gen_random_uuid(),
  alajo_profile_id uuid not null references alajo_profiles(id) on delete cascade,
  campaign_id      uuid references support_campaigns(id) on delete set null,
  selection_id     uuid references support_selections(id) on delete set null,
  status           confirmation_status not null default 'pending',
  amount_ngn       bigint,
  support_kind     text,   -- cash | equipment | inventory | mentorship | mixed
  supporter_label  text,   -- what the public sees, e.g. "An Ajo Mercy supporter"
  internal_note    text,
  confirmed_by     uuid references profiles(id) on delete set null,
  confirmed_at     timestamptz,
  announced_at     timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint confirmation_amount_valid check (amount_ngn is null or amount_ngn >= 0)
);
create index confirmation_status_idx on support_confirmations(status, created_at desc);
create index confirmation_alajo_idx on support_confirmations(alajo_profile_id);

-- ------------------------------------------------------------ ops tables ---
create table email_events (
  id                  uuid primary key default gen_random_uuid(),
  event_type          text not null,
  recipient_email     citext not null,
  recipient_user_id   uuid references profiles(id) on delete set null,
  subject             text not null,
  related_table       text,
  related_id          uuid,
  status              email_status not null default 'queued',
  provider            text not null default 'resend',
  provider_message_id text,
  payload             jsonb not null default '{}'::jsonb,
  attempts            int not null default 0,
  error_message       text,
  queued_at           timestamptz not null default now(),
  sent_at             timestamptz,
  delivered_at        timestamptz,
  failed_at           timestamptz,
  -- Guards against duplicate sends when an action is retried.
  idempotency_key     text unique
);
create index email_events_status_idx on email_events(status, queued_at desc);
create index email_events_recipient_idx on email_events(recipient_email, queued_at desc);
create index email_events_related_idx on email_events(related_table, related_id);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_unread_idx on notifications(user_id) where read_at is null;

create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  actor_email  citext,
  actor_role   user_role,
  action       text not null,
  entity_table text not null,
  entity_id    uuid,
  entity_label text,
  before       jsonb,
  after        jsonb,
  reason       text,
  ip_hash      text,
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs(created_at desc);
create index audit_logs_entity_idx on audit_logs(entity_table, entity_id, created_at desc);
create index audit_logs_actor_idx on audit_logs(actor_id, created_at desc);

create table admin_notes (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references profiles(id) on delete set null,
  entity_table text not null,
  entity_id    uuid not null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index admin_notes_entity_idx on admin_notes(entity_table, entity_id, created_at desc);

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  audience     text not null default 'public',  -- public | alajos | supporters | brands
  published_at timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint announcement_audience_valid check (audience in ('public','alajos','supporters','brands'))
);
create index announcements_pub_idx on announcements(audience, published_at desc);

-- Durable rate limiting. Works without Redis; swept by a scheduled job.
create table rate_limits (
  bucket       text not null,
  identifier   text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, identifier, window_start)
);
create index rate_limits_sweep_idx on rate_limits(window_start);

create table analytics_events (
  id         bigserial primary key,
  name       text not null,
  user_id    uuid references profiles(id) on delete set null,
  role       user_role,
  props      jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);
create index analytics_name_idx on analytics_events(name, created_at desc);

-- MBRACE INSIGHT signup store for Vercel + Supabase.
-- Same tables and columns as drizzle/0000_mixed_mastermind.sql (the D1 schema the
-- Worker was written for), translated to Postgres. Run once in the Supabase SQL editor.
--
-- Row-level security is enabled on every table with no policies, so Supabase's public
-- REST API (anon and authenticated keys) cannot read or write subscriber data. The site
-- connects with the database connection string, which is not subject to these checks.

create table if not exists public.contacts (
  id text primary key,
  email text not null,
  first_seen text not null,
  last_seen text not null,
  newsletter_status text not null default 'not_requested',
  newsletter_requested_at text,
  suppressed_at text,
  is_test integer not null default 0
);
create unique index if not exists contacts_email_unique on public.contacts (email);

create table if not exists public.capture_events (
  id text primary key,
  contact_id text references public.contacts (id),
  event_type text not null,
  asset_id text,
  page_url text,
  target_query text,
  source text not null,
  utm_source text,
  utm_campaign text,
  newsletter_requested integer not null default 0,
  request_contact_consent integer not null default 0,
  consent_version text not null,
  consent_text text not null,
  created_at text not null,
  status text not null default 'recorded',
  is_test integer not null default 0
);
create index if not exists capture_events_contact_idx on public.capture_events (contact_id);
create index if not exists capture_events_created_idx on public.capture_events (created_at);

create table if not exists public.access_tokens (
  token_hash text primary key,
  contact_id text references public.contacts (id),
  asset_id text,
  kind text not null,
  created_at text not null,
  expires_at text not null
);
create index if not exists access_tokens_contact_idx on public.access_tokens (contact_id);

-- window_start holds a millisecond timestamp, which needs bigint in Postgres.
create table if not exists public.rate_limits (
  key text primary key,
  window_start bigint not null,
  hits integer not null default 0
);

alter table public.contacts enable row level security;
alter table public.capture_events enable row level security;
alter table public.access_tokens enable row level security;
alter table public.rate_limits enable row level security;

-- Belt and braces: remove Supabase API role grants where those roles exist.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.contacts, public.capture_events, public.access_tokens, public.rate_limits from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.contacts, public.capture_events, public.access_tokens, public.rate_limits from authenticated;
  end if;
end
$$;

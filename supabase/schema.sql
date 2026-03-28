-- ============================================================
-- SocialCal Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── PROFILES ───────────────────────────────────────────────
-- Auto-created when a user signs up via Supabase Auth
create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  username              text unique not null,
  full_name             text,
  avatar_url            text,
  availability_status   text not null default 'free'
                          check (availability_status in ('free','busy','oot','maybe')),
  google_calendar_synced boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-create a profile row when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── GROUPS ─────────────────────────────────────────────────
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#1D9E75',
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ─── EVENTS ─────────────────────────────────────────────────
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  location      text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  group_id      uuid references public.groups(id) on delete set null,
  visibility    text not null default 'public'
                  check (visibility in ('public','group','invite')),
  max_attendees integer,
  event_type    text not null default 'hangout'
                  check (event_type in ('hangout','sport','hike','trip','other')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.event_attendees (
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  status    text not null default 'going'
              check (status in ('going','maybe','declined')),
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ─── FRIENDSHIPS ────────────────────────────────────────────
create table public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.events          enable row level security;
alter table public.event_attendees enable row level security;
alter table public.friendships     enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Events: visible based on visibility setting
create policy "Public events visible to all authenticated users"
  on public.events for select to authenticated
  using (visibility = 'public');

create policy "Group events visible to group members"
  on public.events for select to authenticated
  using (
    visibility = 'group' and (
      creator_id = auth.uid() or
      exists (
        select 1 from public.group_members
        where group_id = events.group_id and user_id = auth.uid()
      )
    )
  );

create policy "Users can create events"
  on public.events for insert to authenticated
  with check (creator_id = auth.uid());

create policy "Creators can update their events"
  on public.events for update to authenticated
  using (creator_id = auth.uid());

create policy "Creators can delete their events"
  on public.events for delete to authenticated
  using (creator_id = auth.uid());

-- Attendees: visible to all authenticated, insert by self only
create policy "Attendees visible to authenticated users"
  on public.event_attendees for select to authenticated using (true);

create policy "Users can RSVP to events"
  on public.event_attendees for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own RSVP"
  on public.event_attendees for update to authenticated
  using (user_id = auth.uid());

create policy "Users can remove their own RSVP"
  on public.event_attendees for delete to authenticated
  using (user_id = auth.uid());

-- Groups
create policy "Group members can view groups"
  on public.groups for select to authenticated using (true);

create policy "Users can create groups"
  on public.groups for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Group members viewable"
  on public.group_members for select to authenticated using (true);

-- Friendships
create policy "Users can view their friendships"
  on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Users can send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());

create policy "Users can update friendships they're part of"
  on public.friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ─── REALTIME ───────────────────────────────────────────────
-- Enable realtime for instant cross-device sync
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_attendees;
alter publication supabase_realtime add table public.profiles;

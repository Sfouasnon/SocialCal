-- SocialCal canonical database schema.
-- This migration is written to work both on a fresh Supabase project and on
-- the earlier prototype schema that used `friendships`.

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  availability_status text not null default 'free',
  google_calendar_synced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists availability_status text not null default 'free',
  add column if not exists google_calendar_synced boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_availability_status_check;
alter table public.profiles
  add constraint profiles_availability_status_check
  check (availability_status in ('free', 'busy', 'oot', 'maybe'));

create unique index if not exists profiles_username_key on public.profiles (username);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#1D9E75',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  visibility text not null default 'public',
  max_attendees integer,
  event_type text not null default 'hangout',
  cover_url text,
  hype_score integer not null default 0,
  hype_level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events
  add column if not exists cover_url text,
  add column if not exists hype_score integer not null default 0,
  add column if not exists hype_level integer not null default 1;

alter table public.events drop constraint if exists events_visibility_check;
alter table public.events
  add constraint events_visibility_check
  check (visibility in ('public', 'group', 'invite'));

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events
  add constraint events_event_type_check
  check (event_type in ('hangout', 'sport', 'hike', 'trip', 'other'));

alter table public.events drop constraint if exists events_hype_score_check;
alter table public.events
  add constraint events_hype_score_check
  check (hype_score between 0 and 100);

alter table public.events drop constraint if exists events_hype_level_check;
alter table public.events
  add constraint events_hype_level_check
  check (hype_level between 1 and 4);

alter table public.events drop constraint if exists events_max_attendees_check;
alter table public.events
  add constraint events_max_attendees_check
  check (max_attendees is null or max_attendees > 0);

alter table public.events drop constraint if exists events_ends_after_starts_check;
alter table public.events
  add constraint events_ends_after_starts_check
  check (ends_at is null or ends_at > starts_at);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going',
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_attendees drop constraint if exists event_attendees_status_check;
alter table public.event_attendees
  add constraint event_attendees_status_check
  check (status in ('going', 'maybe', 'declined'));

create table if not exists public.event_invites (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.event_comments drop constraint if exists event_comments_content_check;
alter table public.event_comments
  add constraint event_comments_content_check
  check (length(trim(content)) > 0);

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

alter table public.comment_reactions drop constraint if exists comment_reactions_emoji_check;
alter table public.comment_reactions
  add constraint comment_reactions_emoji_check
  check (length(trim(emoji)) between 1 and 16);

create unique index if not exists comment_reactions_once_per_emoji_idx
  on public.comment_reactions (comment_id, user_id, emoji);

-- Friend requests. Older prototypes called this table `friendships`.
do $$
begin
  if to_regclass('public.friendships') is not null
     and to_regclass('public.friend_requests') is null then
    alter table public.friendships rename to friend_requests;
  end if;
end
$$;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friend_requests
  add column if not exists id uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.friend_requests alter column id set default gen_random_uuid();
update public.friend_requests set id = gen_random_uuid() where id is null;
alter table public.friend_requests alter column id set not null;

do $$
declare
  pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.friend_requests'::regclass
    and contype = 'p';

  if pk_name is not null then
    execute format('alter table public.friend_requests drop constraint %I', pk_name);
  end if;

  alter table public.friend_requests
    add constraint friend_requests_pkey primary key (id);
end
$$;

alter table public.friend_requests drop constraint if exists friendships_status_check;
alter table public.friend_requests drop constraint if exists friend_requests_status_check;
alter table public.friend_requests
  add constraint friend_requests_status_check
  check (status in ('pending', 'accepted', 'declined'));

alter table public.friend_requests drop constraint if exists friend_requests_not_self_check;
alter table public.friend_requests
  add constraint friend_requests_not_self_check
  check (requester_id <> addressee_id);

create unique index if not exists friend_requests_unique_pair_idx
  on public.friend_requests (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

-- Indexes for common reads.
create index if not exists groups_owner_id_idx on public.groups (owner_id);
create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_creator_id_idx on public.events (creator_id);
create index if not exists events_group_id_idx on public.events (group_id);
create index if not exists event_attendees_user_id_idx on public.event_attendees (user_id);
create index if not exists event_comments_event_id_created_at_idx
  on public.event_comments (event_id, created_at);
create index if not exists comment_reactions_comment_id_idx
  on public.comment_reactions (comment_id);
create index if not exists friend_requests_requester_id_idx
  on public.friend_requests (requester_id);
create index if not exists friend_requests_addressee_id_idx
  on public.friend_requests (addressee_id);

-- Shared trigger helpers.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists set_friend_requests_updated_at on public.friend_requests;
create trigger set_friend_requests_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'),
      '[^a-z0-9_]+',
      '_',
      'g'
    )
  );

  base_username := trim(both '_' from base_username);

  if base_username = '' then
    base_username := 'user';
  end if;

  candidate_username := left(base_username, 24);

  if exists (select 1 from public.profiles where username = candidate_username) then
    candidate_username := left(base_username, 20) || '_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
as $$
declare
  event_limit integer;
  going_count integer;
begin
  if new.status <> 'going' then
    return new;
  end if;

  select max_attendees into event_limit
  from public.events
  where id = new.event_id;

  if event_limit is null then
    return new;
  end if;

  select count(*) into going_count
  from public.event_attendees
  where event_id = new.event_id
    and status = 'going'
    and user_id <> new.user_id;

  if going_count >= event_limit then
    raise exception 'event is full';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_event_capacity on public.event_attendees;
create trigger enforce_event_capacity
  before insert or update of status on public.event_attendees
  for each row execute function public.enforce_event_capacity();

create or replace function public.is_group_member(check_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = check_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.owns_group(check_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = check_group_id
      and g.owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_event(check_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = check_event_id
      and (
        e.visibility = 'public'
        or e.creator_id = auth.uid()
        or (
          e.visibility = 'group'
          and e.group_id is not null
          and public.is_group_member(e.group_id)
        )
        or (
          e.visibility = 'invite'
          and exists (
            select 1
            from public.event_invites ei
            where ei.event_id = e.id
              and ei.user_id = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.owns_group(uuid) from public;
grant execute on function public.owns_group(uuid) to authenticated;
revoke all on function public.can_view_event(uuid) from public;
grant execute on function public.can_view_event(uuid) to authenticated;

-- Row-level security.
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_invites enable row level security;
alter table public.event_comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Group members can view groups" on public.groups;
drop policy if exists "Users can create groups" on public.groups;
drop policy if exists "Group owners can update groups" on public.groups;
drop policy if exists "Group owners can delete groups" on public.groups;

create policy "Group members can view groups"
  on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

create policy "Users can create groups"
  on public.groups for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Group owners can update groups"
  on public.groups for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Group owners can delete groups"
  on public.groups for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Group members viewable" on public.group_members;
drop policy if exists "Group owners can add members" on public.group_members;
drop policy if exists "Group owners can remove members" on public.group_members;

create policy "Group members viewable"
  on public.group_members for select to authenticated
  using (public.owns_group(group_id) or public.is_group_member(group_id));

create policy "Group owners can add members"
  on public.group_members for insert to authenticated
  with check (public.owns_group(group_id));

create policy "Group owners can remove members"
  on public.group_members for delete to authenticated
  using (public.owns_group(group_id));

drop policy if exists "Public events visible to all authenticated users" on public.events;
drop policy if exists "Group events visible to group members" on public.events;
drop policy if exists "Visible events are selectable" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Creators can update their events" on public.events;
drop policy if exists "Creators can delete their events" on public.events;

create policy "Visible events are selectable"
  on public.events for select to authenticated
  using (public.can_view_event(id));

create policy "Users can create events"
  on public.events for insert to authenticated
  with check (creator_id = auth.uid());

create policy "Creators can update their events"
  on public.events for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy "Creators can delete their events"
  on public.events for delete to authenticated
  using (creator_id = auth.uid());

drop policy if exists "Attendees visible to authenticated users" on public.event_attendees;
drop policy if exists "Visible event attendees are selectable" on public.event_attendees;
drop policy if exists "Users can RSVP to events" on public.event_attendees;
drop policy if exists "Users can update their own RSVP" on public.event_attendees;
drop policy if exists "Users can remove their own RSVP" on public.event_attendees;

create policy "Visible event attendees are selectable"
  on public.event_attendees for select to authenticated
  using (public.can_view_event(event_id));

create policy "Users can RSVP to events"
  on public.event_attendees for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_event(event_id));

create policy "Users can update their own RSVP"
  on public.event_attendees for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_view_event(event_id));

create policy "Users can remove their own RSVP"
  on public.event_attendees for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can view their event invites" on public.event_invites;
drop policy if exists "Creators can invite users to their events" on public.event_invites;
drop policy if exists "Creators can delete event invites" on public.event_invites;

create policy "Users can view their event invites"
  on public.event_invites for select to authenticated
  using (user_id = auth.uid());

create policy "Creators can invite users to their events"
  on public.event_invites for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.creator_id = auth.uid()
    )
  );

create policy "Creators can delete event invites"
  on public.event_invites for delete to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.creator_id = auth.uid()
    )
  );

drop policy if exists "Visible event comments are selectable" on public.event_comments;
drop policy if exists "Users can comment on visible events" on public.event_comments;
drop policy if exists "Users can delete their own comments" on public.event_comments;

create policy "Visible event comments are selectable"
  on public.event_comments for select to authenticated
  using (public.can_view_event(event_id));

create policy "Users can comment on visible events"
  on public.event_comments for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_event(event_id));

create policy "Users can delete their own comments"
  on public.event_comments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Visible comment reactions are selectable" on public.comment_reactions;
drop policy if exists "Users can react to visible comments" on public.comment_reactions;
drop policy if exists "Users can delete their own reactions" on public.comment_reactions;

create policy "Visible comment reactions are selectable"
  on public.comment_reactions for select to authenticated
  using (
    exists (
      select 1 from public.event_comments c
      where c.id = comment_id and public.can_view_event(c.event_id)
    )
  );

create policy "Users can react to visible comments"
  on public.comment_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.event_comments c
      where c.id = comment_id and public.can_view_event(c.event_id)
    )
  );

create policy "Users can delete their own reactions"
  on public.comment_reactions for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can view their friendships" on public.friend_requests;
drop policy if exists "Users can view their friend requests" on public.friend_requests;
drop policy if exists "Users can send friend requests" on public.friend_requests;
drop policy if exists "Users can update friendships they're part of" on public.friend_requests;
drop policy if exists "Users can update friend requests they're part of" on public.friend_requests;
drop policy if exists "Addressees can answer friend requests" on public.friend_requests;
drop policy if exists "Users can delete friend requests they're part of" on public.friend_requests;

create policy "Users can view their friend requests"
  on public.friend_requests for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Users can send friend requests"
  on public.friend_requests for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy "Addressees can answer friend requests"
  on public.friend_requests for update to authenticated
  using (addressee_id = auth.uid())
  with check (
    addressee_id = auth.uid()
    and status in ('accepted', 'declined')
  );

create policy "Users can delete friend requests they're part of"
  on public.friend_requests for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Storage bucket and object policies for event covers.
do $$
begin
  if to_regclass('storage.buckets') is not null
     and to_regclass('storage.objects') is not null then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'event-covers',
      'event-covers',
      true,
      5242880,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists "Event covers are publicly readable" on storage.objects';
    execute 'drop policy if exists "Authenticated users can upload event covers" on storage.objects';
    execute 'drop policy if exists "Users can update their own event covers" on storage.objects';
    execute 'drop policy if exists "Users can delete their own event covers" on storage.objects';

    execute $policy$
      create policy "Event covers are publicly readable"
        on storage.objects for select
        using (bucket_id = 'event-covers')
    $policy$;

    execute $policy$
      create policy "Authenticated users can upload event covers"
        on storage.objects for insert to authenticated
        with check (
          bucket_id = 'event-covers'
          and owner = auth.uid()
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $policy$;

    execute $policy$
      create policy "Users can update their own event covers"
        on storage.objects for update to authenticated
        using (
          bucket_id = 'event-covers'
          and owner = auth.uid()
          and (storage.foldername(name))[1] = auth.uid()::text
        )
        with check (
          bucket_id = 'event-covers'
          and owner = auth.uid()
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $policy$;

    execute $policy$
create policy "Users can delete their own event covers"
        on storage.objects for delete to authenticated
        using (
          bucket_id = 'event-covers'
          and owner = auth.uid()
          and (storage.foldername(name))[1] = auth.uid()::text
        )
    $policy$;
  end if;
end
$$;

-- Realtime delete payloads need enough row data to refresh affected feed cards.
alter table public.event_comments replica identity full;
alter table public.event_attendees replica identity full;

-- Realtime publication membership.
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'events',
      'event_attendees',
      'event_comments',
      'comment_reactions',
      'profiles',
      'friend_requests'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end
$$;

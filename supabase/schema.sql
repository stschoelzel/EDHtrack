-- App-Config: Repo-Owner-Username, einmalig beim Setup eingetragen
create table app_config (
  id int primary key default 1,
  owner_github_login text,
  constraint single_row check (id = 1)
);
insert into app_config (id) values (1) on conflict do nothing;

-- Allowed users: nach erfolgtem Signup
create table allowed_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  added_by uuid references auth.users(id),
  added_at timestamptz default now(),
  is_admin boolean default false
);

-- Pending invites: Admin trägt Identifier ein, User wird beim ersten Signin auto-zugelassen
create table pending_invites (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('github','discord','google','apple')),
  identifier text not null,                   -- github_login, discord_username, email
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  unique (provider, identifier)
);

-- Lookup-Tabellen
create table players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);
create table decks (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);
create table game_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);
create table win_conditions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Matches: Player-Slots als JSONB-Array
create table matches (
  id uuid primary key default gen_random_uuid(),
  played_at date not null default current_date,
  participants jsonb not null,   -- [{player:"Daddy", deck:"Frodo"}, ...]
  winner text not null,          -- player name, comma separated if draw
  is_draw boolean default false,
  turn int,
  win_condition text,
  game_type text not null,
  submitted_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Trigger: beim auth.users-Insert prüfen ob (a) Repo-Owner → Admin, oder (b) in pending_invites → User
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_provider text;
  v_identifier text;
  v_owner text;
begin
  v_provider := new.raw_app_meta_data->>'provider';
  v_owner    := (select owner_github_login from app_config where id = 1);

  -- Identifier je Provider extrahieren
  v_identifier := case v_provider
    when 'github'  then new.raw_user_meta_data->>'user_name'
    when 'discord' then new.raw_user_meta_data->'custom_claims'->>'global_name' -- fallback for discord username
    when 'google'  then new.email
    when 'apple'   then new.email
    else null
  end;
  
  if v_identifier is null and v_provider = 'discord' then
    v_identifier := new.raw_user_meta_data->>'name';
  end if;

  -- (a) Repo-Owner via GitHub → Admin
  if v_provider = 'github' and v_identifier is not null and v_identifier = v_owner then
    insert into allowed_users (user_id, display_name, is_admin)
    values (new.id, v_identifier, true)
    on conflict (user_id) do update set is_admin = true;
    return new;
  end if;

  -- (b) in pending_invites → User
  if v_identifier is not null and exists (
    select 1 from pending_invites where provider = v_provider and identifier = v_identifier
  ) then
    insert into allowed_users (user_id, display_name, is_admin)
    values (new.id, v_identifier, false)
    on conflict (user_id) do nothing;
    delete from pending_invites where provider = v_provider and identifier = v_identifier;
  end if;

  return new;
end;
$$;

-- Trigger erstellen
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- RLS aktivieren
alter table app_config      enable row level security;
alter table allowed_users   enable row level security;
alter table pending_invites enable row level security;
alter table matches         enable row level security;
alter table players         enable row level security;
alter table decks           enable row level security;
alter table game_types      enable row level security;
alter table win_conditions  enable row level security;

-- Policies: app_config
create policy "app_config is readable by everyone" on app_config for select
  using (true);
create policy "app_config is writable by admins" on app_config for update
  using (auth.uid() in (select user_id from allowed_users where is_admin));
create policy "app_config initial setup" on app_config for update
  using (owner_github_login is null)
  with check (true);

-- Policies: pending_invites
create policy "pending_invites readable by admins" on pending_invites for select
  using (auth.uid() in (select user_id from allowed_users where is_admin));
create policy "pending_invites insertable by admins" on pending_invites for insert
  with check (auth.uid() in (select user_id from allowed_users where is_admin));
create policy "pending_invites deletable by admins" on pending_invites for delete
  using (auth.uid() in (select user_id from allowed_users where is_admin));

-- Policies: allowed_users
create policy "allowed_users is readable by authenticated" on allowed_users for select
  using (auth.role() = 'authenticated');
create policy "allowed_users is manageable by admins (insert)" on allowed_users for insert
  with check (auth.uid() in (select user_id from allowed_users where is_admin));
create policy "allowed_users is manageable by admins (update)" on allowed_users for update
  using (auth.uid() in (select user_id from allowed_users where is_admin));
create policy "allowed_users is manageable by admins (delete)" on allowed_users for delete
  using (auth.uid() in (select user_id from allowed_users where is_admin));

-- Policies: data tables (matches, players, decks, game_types, win_conditions)
create policy "read for allowed" on matches for select
  using (auth.uid() in (select user_id from allowed_users));
create policy "insert for allowed" on matches for insert
  with check (auth.uid() in (select user_id from allowed_users));

create policy "read for allowed" on players for select
  using (auth.uid() in (select user_id from allowed_users));
create policy "insert for allowed" on players for insert
  with check (auth.uid() in (select user_id from allowed_users));

create policy "read for allowed" on decks for select
  using (auth.uid() in (select user_id from allowed_users));
create policy "insert for allowed" on decks for insert
  with check (auth.uid() in (select user_id from allowed_users));

create policy "read for allowed" on game_types for select
  using (auth.uid() in (select user_id from allowed_users));
create policy "insert for allowed" on game_types for insert
  with check (auth.uid() in (select user_id from allowed_users));

create policy "read for allowed" on win_conditions for select
  using (auth.uid() in (select user_id from allowed_users));
create policy "insert for allowed" on win_conditions for insert
  with check (auth.uid() in (select user_id from allowed_users));

-- Grants
grant all privileges on all tables in schema public to anon, authenticated;

-- RPC Fallback: If trigger missed (e.g. user already existed before setup), this allows the owner to manually claim admin rights
create or replace function public.bootstrap_admin() returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner text;
  v_caller_github_username text;
  v_user_count int;
begin
  -- Nur ausführen, wenn allowed_users komplett leer ist (erste Einrichtung)
  select count(*) into v_user_count from allowed_users;
  if v_user_count > 0 then
    return false;
  end if;

  v_owner := (select owner_github_login from app_config where id = 1);
  if v_owner is null then
    return false;
  end if;

  -- Aufrufenden User aus auth.users holen
  select raw_user_meta_data->>'user_name' into v_caller_github_username
  from auth.users
  where id = auth.uid();

  -- Wenn der Aufrufer der konfigurierte Owner ist, mach ihn zum Admin
  if v_caller_github_username is not null and v_caller_github_username = v_owner then
    insert into allowed_users (user_id, display_name, is_admin)
    values (auth.uid(), v_caller_github_username, true)
    on conflict (user_id) do update set is_admin = true;
    return true;
  end if;

  return false;
end;
$$;

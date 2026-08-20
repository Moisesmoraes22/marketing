-- Sistema de Criação de Conteúdo — schema inicial (Fase 1)
--
-- Este é um sistema interno de uso exclusivo do time de marketing —
-- não é multi-tenant. Por isso o RLS abaixo trata "time" como
-- "qualquer usuário autenticado no projeto Supabase": todo usuário
-- autenticado pode ler e escrever os dados operacionais (searches,
-- content_items, analyses, scripts, jobs, voice_profile). Perfis
-- (profiles) só podem ser editados pelo próprio usuário.

-- =========================================================
-- profiles
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  instagram_handle text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: usuário lê todos os perfis do time"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: usuário edita o próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- cria o profile automaticamente quando um novo usuário se cadastra
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- a função só deve rodar via trigger, nunca via RPC pública
-- (linter de segurança do Supabase sinaliza SECURITY DEFINER exposta)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =========================================================
-- storage: avatares de perfil
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: usuário gerencia o próprio arquivo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- searches
-- =========================================================
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hashtags text[] not null default '{}',
  accounts text[] not null default '{}',
  min_engagement int not null default 0,
  results_limit int not null default 20 check (results_limit between 1 and 200),
  active boolean not null default true,
  auto_run_interval_hours int, -- null = só manual; senão, repete sozinha nesse intervalo
  last_run_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.searches enable row level security;

create policy "searches: leitura/escrita para o time autenticado"
  on public.searches for all
  to authenticated
  using (true)
  with check (true);

-- =========================================================
-- content_items
-- =========================================================
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.searches (id) on delete set null,
  source_url text not null,
  caption text,
  media_type text not null check (media_type in ('post', 'carousel', 'reel')),
  engagement_score int not null default 0,
  likes_count int not null default 0,
  comments_count int not null default 0,
  omega_score int,
  recommendation text check (recommendation in ('adaptar', 'inspirar', 'ignorar')),
  owner_username text,
  is_favorite boolean not null default false,
  thumbnail_url text,
  video_url text,
  collected_at timestamptz not null default now(),
  status text not null default 'collected'
    check (status in ('collected', 'transcribing', 'analyzing', 'done', 'error'))
);

alter table public.content_items enable row level security;

create policy "content_items: leitura/escrita para o time autenticado"
  on public.content_items for all
  to authenticated
  using (true)
  with check (true);

-- status em tempo real na página /conteudo (Fase 2)
alter publication supabase_realtime add table public.content_items;

-- =========================================================
-- analyses
-- =========================================================
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  type text not null check (type in ('transcription', 'analysis', 'critique')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.analyses enable row level security;

create policy "analyses: leitura/escrita para o time autenticado"
  on public.analyses for all
  to authenticated
  using (true)
  with check (true);

-- =========================================================
-- scripts
-- =========================================================
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  format text not null
    check (format in ('reel_30s', 'reel_60s', 'reel_90s', 'carousel', 'static_post')),
  content jsonb not null,
  voice_profile_snapshot jsonb,
  approved boolean not null default false,
  flagged_words text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.scripts enable row level security;

create policy "scripts: leitura/escrita para o time autenticado"
  on public.scripts for all
  to authenticated
  using (true)
  with check (true);

-- biblioteca /roteiros e calibração de voz em tempo real (Fase 4)
alter publication supabase_realtime add table public.scripts;

-- =========================================================
-- jobs (fila simples — substitui Redis/BullMQ)
-- =========================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in ('discover', 'transcribe', 'analyze', 'critique', 'generate_script')),
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'error')),
  attempts int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index jobs_status_created_at_idx on public.jobs (status, created_at);

alter table public.jobs enable row level security;

create policy "jobs: leitura/escrita para o time autenticado"
  on public.jobs for all
  to authenticated
  using (true)
  with check (true);

-- o worker acessa esta tabela com a service_role key, que ignora RLS.

-- =========================================================
-- voice_profile
-- =========================================================
create table public.voice_profile (
  id uuid primary key default gen_random_uuid(),
  target_audience text,
  tone_adjectives text[] not null default '{}',
  words_we_use text[] not null default '{}',
  words_we_avoid text[] not null default '{}',
  example_approved_post text,
  calibration_notes text,
  updated_at timestamptz not null default now()
);

alter table public.voice_profile enable row level security;

create policy "voice_profile: leitura/escrita para o time autenticado"
  on public.voice_profile for all
  to authenticated
  using (true)
  with check (true);

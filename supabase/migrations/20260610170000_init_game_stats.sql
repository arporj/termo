-- Criar tabela de perfis (profiles) que estende auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em profiles
alter table public.profiles enable row level security;

-- Criar tabela de estatisticas dos modos de jogo
create table public.game_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_mode text not null constraint chk_game_mode check (game_mode in ('single', 'dueto', 'quarteto')),
  current_streak integer default 0 not null,
  max_streak integer default 0 not null,
  last_played_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_mode unique (user_id, game_mode)
);

-- Habilitar RLS em game_stats
alter table public.game_stats enable row level security;

-- Politicas de seguranca para profiles
create policy "Usuarios podem ver o seu proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios podem atualizar o seu proprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Politicas de seguranca para game_stats
create policy "Usuarios podem ver suas proprias estatisticas"
  on public.game_stats for select
  using (auth.uid() = user_id);

create policy "Usuarios podem criar suas proprias estatisticas"
  on public.game_stats for insert
  with check (auth.uid() = user_id);

create policy "Usuarios podem atualizar suas proprias estatisticas"
  on public.game_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente apos o cadastro no Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para atualizar updated_at de game_stats
create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace trigger on_game_stats_updated
  before update on public.game_stats
  for each row execute procedure public.handle_update_timestamp();

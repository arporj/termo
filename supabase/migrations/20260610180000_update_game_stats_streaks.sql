-- Adicionar novas colunas para controle de streaks separados de vitoria e diario
alter table public.game_stats
  add column current_win_streak integer default 0 not null,
  add column max_win_streak integer default 0 not null,
  add column current_daily_streak integer default 0 not null,
  add column max_daily_streak integer default 0 not null;

-- Migrar dados legados das colunas antigas para as novas colunas
update public.game_stats
set 
  current_win_streak = current_streak,
  current_daily_streak = current_streak,
  max_win_streak = max_streak,
  max_daily_streak = max_streak;

-- Remover as colunas antigas redundantes
alter table public.game_stats
  drop column current_streak,
  drop column max_streak;

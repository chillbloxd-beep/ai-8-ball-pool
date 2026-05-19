-- Supabase Postgres schema for eight-ball-ai
-- Web-first path: apply this SQL in Supabase Dashboard SQL Editor.

-- =========================
-- users
-- =========================
-- Stores player identity/profile metadata for game ownership, shot attribution,
-- and future matchmaking / analytics.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  external_auth_id text unique,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- games
-- =========================
-- Stores one game session/match with participants, status, outcome,
-- and summary metadata.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_code text unique,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress',
  winner_user_id uuid references public.users(id) on delete set null,
  player1_user_id uuid references public.users(id) on delete set null,
  player2_user_id uuid references public.users(id) on delete set null,
  game_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- shots
-- =========================
-- Stores deterministic per-shot state snapshots and outcomes.
-- This is the core AI-training/event dataset table.
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  shot_number integer not null check (shot_number > 0),
  player_id uuid references public.users(id) on delete set null,
  player_group text,
  balls_before jsonb not null,
  shot_input jsonb not null,
  events jsonb not null,
  balls_after jsonb not null,
  result jsonb not null,
  quality_score numeric,
  created_at timestamptz not null default now(),
  unique (game_id, shot_number)
);

-- =========================
-- replay_exports
-- =========================
-- Stores exported replay bundles/metadata, including where they are stored
-- (Supabase Storage path, signed URL metadata, etc.).
create table if not exists public.replay_exports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  exported_by_user_id uuid references public.users(id) on delete set null,
  export_format text not null default 'shot-json',
  storage_path text,
  export_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- ai_versions
-- =========================
-- Registry of AI model/policy versions used for simulation/evaluation.
create table if not exists public.ai_versions (
  id uuid primary key default gen_random_uuid(),
  version_tag text not null unique,
  provider text,
  model_type text,
  parameters jsonb not null default '{}'::jsonb,
  artifact_uri text,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================
-- ai_evaluations
-- =========================
-- Evaluation runs and metrics tied to a specific ai_version and optional dataset.
create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  ai_version_id uuid not null references public.ai_versions(id) on delete cascade,
  dataset_id uuid,
  eval_name text not null,
  eval_scope text,
  games_played integer,
  win_rate numeric,
  foul_rate numeric,
  avg_turns numeric,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- training_runs
-- =========================
-- Training job metadata for browser-based Colab/Kaggle or other pipelines.
create table if not exists public.training_runs (
  id uuid primary key default gen_random_uuid(),
  run_name text not null,
  triggered_by_user_id uuid references public.users(id) on delete set null,
  source_dataset_id uuid references public.datasets(id) on delete set null,
  output_ai_version_id uuid references public.ai_versions(id) on delete set null,
  platform text,
  status text not null default 'queued',
  config jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================
-- datasets
-- =========================
-- Logical dataset catalog for training/eval (filters, snapshot references,
-- and provenance).
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  dataset_type text,
  snapshot_ref text,
  filters jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Add deferred FK now that datasets exists.
alter table public.ai_evaluations
  drop constraint if exists ai_evaluations_dataset_id_fkey,
  add constraint ai_evaluations_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete set null;

-- =========================
-- Indexes
-- =========================
-- shots query indexes
create index if not exists idx_shots_game_id on public.shots (game_id);
create index if not exists idx_shots_player_id on public.shots (player_id);
create index if not exists idx_shots_created_at on public.shots (created_at desc);
create index if not exists idx_shots_quality_score on public.shots (quality_score);

-- generic created_at indexes for operational queries
create index if not exists idx_games_created_at on public.games (created_at desc);
create index if not exists idx_replay_exports_created_at on public.replay_exports (created_at desc);
create index if not exists idx_ai_versions_created_at on public.ai_versions (created_at desc);
create index if not exists idx_training_runs_created_at on public.training_runs (created_at desc);
create index if not exists idx_datasets_created_at on public.datasets (created_at desc);

-- AI evaluation field indexes
create index if not exists idx_ai_evaluations_ai_version_id on public.ai_evaluations (ai_version_id);
create index if not exists idx_ai_evaluations_dataset_id on public.ai_evaluations (dataset_id);
create index if not exists idx_ai_evaluations_eval_name on public.ai_evaluations (eval_name);
create index if not exists idx_ai_evaluations_created_at on public.ai_evaluations (created_at desc);

-- Optional trigger to keep users.updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

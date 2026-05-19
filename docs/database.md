# Supabase Database Setup (Web Dashboard Path)

This project recommends a **web-only** setup path using the Supabase dashboard (no local database tools required).

## 1) Create a Supabase project
1. Go to https://supabase.com/dashboard.
2. Create a new project.
3. Wait for database provisioning to complete.

## 2) Open SQL Editor
1. In your project dashboard, open **SQL Editor**.
2. Create a **New query**.
3. Copy/paste `backend-cloudflare/schema.sql` into the editor.
4. Run the query.

## 3) Verify tables
Open **Table Editor** and confirm these tables exist:
- `users`
- `games`
- `shots`
- `replay_exports`
- `ai_versions`
- `ai_evaluations`
- `training_runs`
- `datasets`

## 4) Verify key indexes
In SQL Editor, run:
```sql
select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('shots', 'ai_evaluations')
order by tablename, indexname;
```

Expected highlights:
- `idx_shots_game_id`
- `idx_shots_player_id`
- `idx_shots_created_at`
- `idx_shots_quality_score`
- `idx_ai_evaluations_ai_version_id`
- `idx_ai_evaluations_dataset_id`
- `idx_ai_evaluations_eval_name`
- `idx_ai_evaluations_created_at`

## 5) (Recommended) Add Row Level Security policies
Use Supabase Auth + RLS to control read/write access for users, games, and shot data.

## 6) Recommended workflow
- Treat `backend-cloudflare/schema.sql` as the source of truth.
- Apply schema updates through SQL Editor migrations in Supabase dashboard.
- Keep shot/event JSONB structures stable for AI training compatibility.

## Why shot JSON over video
For AI training and evaluation, **state/action/event JSON** is preferred over video:
- smaller storage footprint
- deterministic and queryable
- easier feature extraction and labeling
- reproducible simulation/evaluation pipelines
